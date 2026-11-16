import crypto from 'crypto';
import { count, eq, sql } from 'drizzle-orm';
import { db } from './index.ts';
import { platformSettings, referrals, transactions, users } from './schema.ts';

const TOKEN_SECRET = process.env.SESSION_SECRET || 'voltpay-platform-hmac-secret-2026';

export type DbUser = typeof users.$inferSelect;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(originalHex, 'hex');
  if (derived.length !== original.length) return false;
  return crypto.timingSafeEqual(derived, original);
}

export function signSessionToken(uid: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid, iat: Date.now(), exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return `VP1.${payload}.${sig}`;
}

export function verifySessionToken(token: string): { uid: string } | null {
  if (!token.startsWith('VP1.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!parsed.uid || typeof parsed.exp !== 'number' || Date.now() > parsed.exp) {
      return null;
    }
    return { uid: parsed.uid };
  } catch {
    return null;
  }
}

function makeReferralCode(name: string): string {
  const prefix = (name || 'VP')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 4)
    .padEnd(4, 'X');
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}${rand}`;
}

function makeReferenceId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto
    .randomBytes(2)
    .toString('hex')
    .toUpperCase()}`;
}

async function applyReferralBonusIfValid(newUser: DbUser, referralCodeInput?: string) {
  if (!referralCodeInput || !referralCodeInput.trim()) return;
  const code = referralCodeInput.trim().toUpperCase();
  if (code === newUser.referralCode) return;

  const [referrer] = await db.select().from(users).where(eq(users.referralCode, code));
  if (!referrer) return;

  const settingsRows = await db.select().from(platformSettings);
  const settingsMap = new Map(settingsRows.map((r) => [r.key, r.value]));
  const referrerBonus = Math.max(0, Number(settingsMap.get('referral_bonus_referrer') || '25'));
  const refereeBonus = Math.max(0, Number(settingsMap.get('referral_bonus_referee') || '15'));

  await db
    .update(users)
    .set({
      referredBy: referrer.referralCode,
      walletBalance: sql`${users.walletBalance} + ${refereeBonus}`,
    })
    .where(eq(users.id, newUser.id));

  await db
    .update(users)
    .set({
      walletBalance: sql`${users.walletBalance} + ${referrerBonus}`,
    })
    .where(eq(users.id, referrer.id));

  await db.insert(referrals).values({
    referrerUserId: referrer.id,
    referredUserId: newUser.id,
    referralCode: referrer.referralCode,
    bonusAmount: referrerBonus,
    status: 'credited',
  });

  if (referrerBonus > 0) {
    await db.insert(transactions).values({
      referenceId: makeReferenceId('REF'),
      userId: referrer.id,
      type: 'referral_bonus',
      serviceSlug: 'referral',
      serviceName: 'Refer & Earn',
      operatorName: 'VoltPay Referral Program',
      accountNumber: newUser.email,
      amount: referrerBonus,
      commissionEarned: 0,
      cashbackEarned: 0,
      paymentMethod: 'Wallet Credit',
      status: 'success',
      notes: `Referral bonus credited for inviting ${newUser.name}`,
    });
  }

  if (refereeBonus > 0) {
    await db.insert(transactions).values({
      referenceId: makeReferenceId('WEL'),
      userId: newUser.id,
      type: 'referral_bonus',
      serviceSlug: 'referral',
      serviceName: 'Refer & Earn',
      operatorName: 'Welcome Referral Bonus',
      accountNumber: referrer.referralCode,
      amount: refereeBonus,
      commissionEarned: 0,
      cashbackEarned: 0,
      paymentMethod: 'Wallet Credit',
      status: 'success',
      notes: `Welcome bonus applied via referral code ${referrer.referralCode}`,
    });
  }
}

export async function getOrCreateFirebaseUser(
  uid: string,
  email: string,
  name?: string,
  referralCodeUsed?: string
): Promise<DbUser> {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid));
    if (existing.length > 0) {
      return existing[0];
    }

    const existingByEmail = await db.select().from(users).where(eq(users.email, email));
    if (existingByEmail.length > 0) {
      const [updated] = await db
        .update(users)
        .set({ uid })
        .where(eq(users.id, existingByEmail[0].id))
        .returning();
      return updated;
    }

    const [{ value: userCount }] = await db.select({ value: count() }).from(users);
    const isInitialAdmin = userCount === 0 || email.toLowerCase() === 'manishankarmandal6@gmail.com';
    const displayName = name?.trim() || email.split('@')[0] || 'VoltPay User';
    const referralCode = makeReferralCode(displayName);

    const [created] = await db
      .insert(users)
      .values({
        uid,
        email: email.toLowerCase(),
        name: displayName,
        role: isInitialAdmin ? 'admin' : 'user',
        walletBalance: 100, // Starter welcome balance for immediate exploration
        referralCode,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email: email.toLowerCase() },
      })
      .returning();

    if (referralCodeUsed) {
      await applyReferralBonusIfValid(created, referralCodeUsed);
      const [refreshed] = await db.select().from(users).where(eq(users.id, created.id));
      return refreshed || created;
    }

    return created;
  } catch (error) {
    console.error('Database query failed in getOrCreateFirebaseUser:', error);
    throw new Error('Failed to load or create user profile.', { cause: error });
  }
}

export async function registerLocalUser(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  referralCode?: string;
}): Promise<{ user: DbUser; token: string }> {
  try {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = await db.select().from(users).where(eq(users.email, normalizedEmail));
    if (existing.length > 0) {
      throw new Error('An account with this email already exists. Please sign in.');
    }

    const [{ value: userCount }] = await db.select({ value: count() }).from(users);
    const isInitialAdmin =
      userCount === 0 || normalizedEmail === 'manishankarmandal6@gmail.com';

    const uid = `local_${crypto.randomUUID()}`;
    const referralCode = makeReferralCode(input.name);
    const passwordHash = hashPassword(input.password);

    const [created] = await db
      .insert(users)
      .values({
        uid,
        email: normalizedEmail,
        passwordHash,
        name: input.name.trim(),
        phone: (input.phone || '').trim(),
        role: isInitialAdmin ? 'admin' : 'user',
        walletBalance: 100,
        referralCode,
      })
      .returning();

    if (input.referralCode) {
      await applyReferralBonusIfValid(created, input.referralCode);
    }

    const [freshUser] = await db.select().from(users).where(eq(users.id, created.id));
    const finalUser = freshUser || created;
    const token = signSessionToken(finalUser.uid);
    return { user: finalUser, token };
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      throw error;
    }
    console.error('Database query failed in registerLocalUser:', error);
    throw new Error('Account registration failed. Please try again.', { cause: error });
  }
}

export async function authenticateLocalUser(
  email: string,
  password: string
): Promise<{ user: DbUser; token: string }> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail));
    if (!user || !user.passwordHash) {
      throw new Error('Invalid email or password. If you signed up with Google, use Google Sign-In.');
    }
    if (!verifyPassword(password, user.passwordHash)) {
      throw new Error('Invalid email or password.');
    }
    if (user.status === 'suspended') {
      throw new Error('Your account is currently suspended. Contact support.');
    }
    const token = signSessionToken(user.uid);
    return { user, token };
  } catch (error: any) {
    if (
      error.message?.includes('Invalid email') ||
      error.message?.includes('suspended')
    ) {
      throw error;
    }
    console.error('Database query failed in authenticateLocalUser:', error);
    throw new Error('Sign in failed. Please try again.', { cause: error });
  }
}

export async function getUserByUid(uid: string): Promise<DbUser | null> {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getUserByUid:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
