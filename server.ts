import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from './src/db/index.ts';
import {
  cashbackOffers,
  kycSubmissions,
  notifications,
  offerBanners,
  operators,
  platformSettings,
  referrals,
  services,
  transactions,
  users,
} from './src/db/schema.ts';
import { ensureSeeded } from './src/db/seed.ts';
import {
  authenticateLocalUser,
  DbUser,
  registerLocalUser,
} from './src/db/users.ts';
import { AuthRequest, requireAdmin, requireAuth } from './src/middleware/auth.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const round2 = (n: number) => Math.round(n * 100) / 100;

function sanitizeUser(u: DbUser) {
  const { passwordHash: _removed, ...safe } = u;
  return safe;
}

function makeRef(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto
    .randomBytes(2)
    .toString('hex')
    .toUpperCase()}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Public bootstrap: services, active operators, active offers, active banners, platform settings
  app.get('/api/public/bootstrap', async (_req, res) => {
    try {
      await ensureSeeded();
      const [allServices, allOperators, allOffers, allBanners, allSettings] = await Promise.all([
        db.select().from(services).where(eq(services.isActive, true)).orderBy(asc(services.sortOrder), asc(services.id)),
        db.select().from(operators).where(eq(operators.isActive, true)).orderBy(asc(operators.id)),
        db.select().from(cashbackOffers).where(eq(cashbackOffers.isActive, true)).orderBy(desc(cashbackOffers.id)),
        db.select().from(offerBanners).where(eq(offerBanners.isActive, true)).orderBy(asc(offerBanners.sortOrder), asc(offerBanners.id)),
        db.select().from(platformSettings).orderBy(asc(platformSettings.id)),
      ]);

      const settingsMap: Record<string, string> = {};
      for (const s of allSettings) {
        settingsMap[s.key] = s.value;
      }

      const servicesWithOperators = allServices.map((svc) => ({
        ...svc,
        operators: allOperators.filter((op) => op.serviceId === svc.id),
      }));

      res.json({
        services: servicesWithOperators,
        offers: allOffers,
        banners: allBanners,
        settings: settingsMap,
      });
    } catch (error: any) {
      console.error('Bootstrap error:', error);
      res.status(500).json({ error: error.message || 'Failed to load platform configuration' });
    }
  });

  // Local Email/Password Sign-Up
  app.post('/api/auth/register', async (req, res) => {
    try {
      await ensureSeeded();
      const { name, email, phone, password, referralCode } = req.body || {};
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
      }
      if (String(password).length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }
      const { user, token } = await registerLocalUser({
        name: String(name),
        email: String(email),
        phone: phone ? String(phone) : '',
        password: String(password),
        referralCode: referralCode ? String(referralCode) : undefined,
      });
      res.status(201).json({ user: sanitizeUser(user), token });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Registration failed' });
    }
  });

  // Local Email/Password Sign-In
  app.post('/api/auth/login', async (req, res) => {
    try {
      await ensureSeeded();
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }
      const { user, token } = await authenticateLocalUser(String(email), String(password));
      res.json({ user: sanitizeUser(user), token });
    } catch (error: any) {
      res.status(401).json({ error: error.message || 'Invalid credentials' });
    }
  });

  // Authenticated User Profile & Summary
  app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      await ensureSeeded();
      const user = req.dbUser!;
      const [userKyc, userReferrals] = await Promise.all([
        db
          .select()
          .from(kycSubmissions)
          .where(eq(kycSubmissions.userId, user.id))
          .orderBy(desc(kycSubmissions.createdAt)),
        db
          .select({
            id: referrals.id,
            referralCode: referrals.referralCode,
            bonusAmount: referrals.bonusAmount,
            status: referrals.status,
            createdAt: referrals.createdAt,
            referredName: users.name,
            referredEmail: users.email,
          })
          .from(referrals)
          .innerJoin(users, eq(referrals.referredUserId, users.id))
          .where(eq(referrals.referrerUserId, user.id))
          .orderBy(desc(referrals.createdAt)),
      ]);

      res.json({
        user: sanitizeUser(user),
        kyc: userKyc[0] || null,
        referrals: userReferrals,
      });
    } catch (error: any) {
      console.error('Error fetching /api/me:', error);
      res.status(500).json({ error: error.message || 'Failed to load profile' });
    }
  });

  // User Notifications
  app.get('/api/notifications', requireAuth, async (req: AuthRequest, res) => {
    try {
      await ensureSeeded();
      const user = req.dbUser!;
      let rows = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(30);

      if (rows.length === 0) {
        await db.insert(notifications).values([
          {
            userId: user.id,
            title: 'Welcome to VoltPay',
            message: 'Select any recharge or utility service and apply instant cashback directly at checkout.',
            category: 'system',
            targetTab: 'dashboard',
            isRead: false,
          },
          {
            userId: user.id,
            title: 'Cashback Offers Available',
            message: 'Browse active cashback rewards and tap Apply Cashback on any recharge or bill payment.',
            category: 'offer',
            targetTab: 'offers',
            isRead: false,
          },
        ]);
        rows = await db
          .select()
          .from(notifications)
          .where(eq(notifications.userId, user.id))
          .orderBy(desc(notifications.createdAt))
          .limit(30);
      }

      const unreadCount = rows.filter((n) => !n.isRead).length;
      res.json({ notifications: rows, unreadCount });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load notifications' });
    }
  });

  app.post('/api/notifications/read-all', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser!;
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)));
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to mark notifications read' });
    }
  });

  app.post('/api/notifications/:id/read', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser!;
      const id = Number(req.params.id);
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to mark notification read' });
    }
  });

  // Update User Profile
  app.put('/api/me/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser!;
      const { name, phone } = req.body || {};
      const [updated] = await db
        .update(users)
        .set({
          name: name ? String(name).trim() : user.name,
          phone: phone !== undefined ? String(phone).trim() : user.phone,
        })
        .where(eq(users.id, user.id))
        .returning();
      res.json({ user: sanitizeUser(updated) });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update profile' });
    }
  });

  // Add Money to Wallet
  app.post('/api/wallet/add-money', requireAuth, async (req: AuthRequest, res) => {
    try {
      await ensureSeeded();
      const user = req.dbUser!;
      const rawAmount = Number(req.body?.amount);
      const paymentMethod = String(req.body?.paymentMethod || 'Instant UPI / Card');
      const notes = req.body?.notes ? String(req.body.notes).trim() : '';

      if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
        return res.status(400).json({ error: 'Please enter a valid positive amount.' });
      }

      const settingsRows = await db.select().from(platformSettings);
      const settingsMap = new Map(settingsRows.map((r) => [r.key, r.value]));
      const minAdd = Number(settingsMap.get('min_add_money') || '10');
      const maxAdd = Number(settingsMap.get('max_add_money') || '50000');

      if (rawAmount < minAdd || rawAmount > maxAdd) {
        return res.status(400).json({
          error: `Deposit amount must be between ${minAdd} and ${maxAdd}.`,
        });
      }

      const amount = round2(rawAmount);
      const referenceId = makeRef('ADD');

      const result = await db.transaction(async (tx) => {
        const [updatedUser] = await tx
          .update(users)
          .set({
            walletBalance: sql`ROUND((${users.walletBalance} + ${amount})::numeric, 2)::double precision`,
          })
          .where(eq(users.id, user.id))
          .returning();

        const [txn] = await tx
          .insert(transactions)
          .values({
            referenceId,
            userId: user.id,
            type: 'add_money',
            serviceSlug: 'wallet',
            serviceName: 'Wallet Top-Up',
            operatorName: paymentMethod,
            accountNumber: user.email,
            amount,
            commissionEarned: 0,
            cashbackEarned: 0,
            paymentMethod,
            status: 'success',
            notes: notes || `Added funds via ${paymentMethod}`,
          })
          .returning();

        await tx.insert(notifications).values({
          userId: user.id,
          title: 'Wallet Credited',
          message: `${amount.toFixed(2)} added to your wallet via ${paymentMethod} (Ref: ${referenceId}).`,
          category: 'wallet',
          targetTab: 'transactions',
          isRead: false,
        });

        return { updatedUser, txn };
      });

      res.status(201).json({
        user: sanitizeUser(result.updatedUser),
        transaction: result.txn,
      });
    } catch (error: any) {
      console.error('Add money failed:', error);
      res.status(500).json({ error: error.message || 'Failed to add money to wallet' });
    }
  });

  // Process Recharge or Utility Bill Payment
  app.post('/api/recharge', requireAuth, async (req: AuthRequest, res) => {
    try {
      await ensureSeeded();
      const user = req.dbUser!;
      const { serviceSlug, operatorId, accountNumber, amount: rawAmount, promoCode, offerId } = req.body || {};

      if (!serviceSlug || !operatorId || !accountNumber) {
        return res.status(400).json({
          error: 'Service, operator, and account/subscriber number are required.',
        });
      }

      const amount = round2(Number(rawAmount));
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Please enter a valid recharge amount.' });
      }

      const [service] = await db
        .select()
        .from(services)
        .where(eq(services.slug, String(serviceSlug)));

      if (!service || !service.isActive) {
        return res.status(404).json({ error: 'Selected service is unavailable.' });
      }

      const [operator] = await db
        .select()
        .from(operators)
        .where(eq(operators.id, Number(operatorId)));

      if (!operator || operator.serviceId !== service.id || !operator.isActive) {
        return res.status(404).json({ error: 'Selected operator is unavailable.' });
      }

      if (amount < operator.minAmount || amount > operator.maxAmount) {
        return res.status(400).json({
          error: `Amount for ${operator.name} must be between ${operator.minAmount} and ${operator.maxAmount}.`,
        });
      }

      let appliedPromo: string | null = null;
      let cashbackEarned = 0;

      if (offerId !== undefined && offerId !== null && Number(offerId) > 0) {
        const [offer] = await db
          .select()
          .from(cashbackOffers)
          .where(eq(cashbackOffers.id, Number(offerId)));

        if (!offer || !offer.isActive) {
          return res.status(400).json({ error: 'Selected cashback offer is no longer active.' });
        }
        if (offer.serviceSlug !== 'all' && offer.serviceSlug !== service.slug) {
          return res.status(400).json({
            error: `Selected cashback offer is only valid for ${offer.serviceSlug} payments.`,
          });
        }
        if (amount < offer.minTransactionAmount) {
          return res.status(400).json({
            error: `"${offer.title}" requires a minimum transaction amount of ${offer.minTransactionAmount}.`,
          });
        }

        if (offer.discountType === 'percentage') {
          const calc = (amount * offer.discountValue) / 100;
          cashbackEarned = round2(Math.min(calc, offer.maxCashback));
        } else {
          cashbackEarned = round2(Math.min(offer.discountValue, offer.maxCashback));
        }
        appliedPromo = offer.promoCode;
      } else if (promoCode && String(promoCode).trim()) {
        const cleanCode = String(promoCode).trim().toUpperCase();
        const [offer] = await db
          .select()
          .from(cashbackOffers)
          .where(eq(cashbackOffers.promoCode, cleanCode));

        if (!offer || !offer.isActive) {
          return res.status(400).json({ error: `Cashback offer "${cleanCode}" is invalid or expired.` });
        }
        if (offer.serviceSlug !== 'all' && offer.serviceSlug !== service.slug) {
          return res.status(400).json({
            error: `Cashback offer is only valid for ${offer.serviceSlug} payments.`,
          });
        }
        if (amount < offer.minTransactionAmount) {
          return res.status(400).json({
            error: `"${offer.title}" requires a minimum amount of ${offer.minTransactionAmount}.`,
          });
        }

        if (offer.discountType === 'percentage') {
          const calc = (amount * offer.discountValue) / 100;
          cashbackEarned = round2(Math.min(calc, offer.maxCashback));
        } else {
          cashbackEarned = round2(Math.min(offer.discountValue, offer.maxCashback));
        }
        appliedPromo = offer.promoCode;
      }

      const commissionEarned = round2(
        (amount * operator.commissionRate) / 100 + (operator.flatFee || 0)
      );

      const isBillService = ['electricity', 'water', 'gas', 'insurance', 'loan'].includes(
        service.slug
      );

      const result = await db.transaction(async (tx) => {
        const [freshUser] = await tx.select().from(users).where(eq(users.id, user.id));
        if (!freshUser || freshUser.walletBalance < amount) {
          throw new Error('INSUFFICIENT_BALANCE');
        }

        const netDelta = round2(-amount + commissionEarned + cashbackEarned);

        const [updatedUser] = await tx
          .update(users)
          .set({
            walletBalance: sql`ROUND((${users.walletBalance} + ${netDelta})::numeric, 2)::double precision`,
            totalCommissionEarned: sql`ROUND((${users.totalCommissionEarned} + ${commissionEarned})::numeric, 2)::double precision`,
            totalCashbackEarned: sql`ROUND((${users.totalCashbackEarned} + ${cashbackEarned})::numeric, 2)::double precision`,
          })
          .where(eq(users.id, user.id))
          .returning();

        const [txn] = await tx
          .insert(transactions)
          .values({
            referenceId: makeRef('VP'),
            userId: user.id,
            type: isBillService ? 'bill_payment' : 'recharge',
            serviceSlug: service.slug,
            serviceName: service.name,
            operatorName: operator.name,
            accountNumber: String(accountNumber).trim(),
            amount,
            commissionEarned,
            cashbackEarned,
            promoCode: appliedPromo,
            paymentMethod: 'VoltPay Wallet',
            status: 'success',
            notes: `${service.name} processed for ${String(accountNumber).trim()}`,
          })
          .returning();

        await tx.insert(notifications).values({
          userId: user.id,
          title: `${service.name} Completed`,
          message: `${operator.name} (${String(accountNumber).trim()}) paid ${amount.toFixed(2)}. Earned ${(commissionEarned + cashbackEarned).toFixed(2)} rewards.`,
          category: 'transaction',
          targetTab: 'transactions',
          isRead: false,
        });

        return { updatedUser, txn };
      });

      res.status(201).json({
        user: sanitizeUser(result.updatedUser),
        transaction: result.txn,
      });
    } catch (error: any) {
      if (error.message === 'INSUFFICIENT_BALANCE') {
        return res.status(400).json({
          error: 'Insufficient wallet balance. Please add money to your wallet first.',
        });
      }
      console.error('Recharge transaction error:', error);
      res.status(500).json({ error: error.message || 'Transaction failed' });
    }
  });

  // User Transaction History
  app.get('/api/transactions', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser!;
      const rows = await db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, user.id))
        .orderBy(desc(transactions.createdAt));
      res.json({ transactions: rows });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch transactions' });
    }
  });

  // User KYC Submission & Fetch
  app.get('/api/kyc', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser!;
      const rows = await db
        .select()
        .from(kycSubmissions)
        .where(eq(kycSubmissions.userId, user.id))
        .orderBy(desc(kycSubmissions.createdAt));
      res.json({ submissions: rows, kycStatus: user.kycStatus });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch KYC status' });
    }
  });

  app.post('/api/kyc', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser!;
      const {
        fullName,
        dateOfBirth,
        documentType,
        documentNumber,
        address,
        city,
        postalCode,
        documentFrontNote,
      } = req.body || {};

      if (!fullName || !dateOfBirth || !documentType || !documentNumber || !address || !city || !postalCode) {
        return res.status(400).json({ error: 'All KYC identity and address fields are required.' });
      }

      const result = await db.transaction(async (tx) => {
        const [submission] = await tx
          .insert(kycSubmissions)
          .values({
            userId: user.id,
            fullName: String(fullName).trim(),
            dateOfBirth: String(dateOfBirth).trim(),
            documentType: String(documentType).trim(),
            documentNumber: String(documentNumber).trim(),
            address: String(address).trim(),
            city: String(city).trim(),
            postalCode: String(postalCode).trim(),
            documentFrontNote: String(documentFrontNote || '').trim(),
            status: 'pending',
          })
          .returning();

        const [updatedUser] = await tx
          .update(users)
          .set({ kycStatus: 'pending' })
          .where(eq(users.id, user.id))
          .returning();

        return { submission, updatedUser };
      });

      res.status(201).json({
        submission: result.submission,
        user: sanitizeUser(result.updatedUser),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'KYC submission failed' });
    }
  });

  // ==========================================
  // ADMIN CONSOLE ROUTES (Full Edit / Update / Add)
  // ==========================================

  app.get('/api/admin/overview', requireAuth, requireAdmin, async (_req: AuthRequest, res) => {
    try {
      await ensureSeeded();
      const [
        allServices,
        allOperators,
        allOffers,
        allBanners,
        allSettings,
        allUsers,
        allKyc,
        allTxns,
      ] = await Promise.all([
        db.select().from(services).orderBy(asc(services.sortOrder), asc(services.id)),
        db.select().from(operators).orderBy(asc(operators.id)),
        db.select().from(cashbackOffers).orderBy(desc(cashbackOffers.id)),
        db.select().from(offerBanners).orderBy(asc(offerBanners.sortOrder), asc(offerBanners.id)),
        db.select().from(platformSettings).orderBy(asc(platformSettings.id)),
        db.select().from(users).orderBy(desc(users.createdAt)),
        db
          .select({
            id: kycSubmissions.id,
            userId: kycSubmissions.userId,
            fullName: kycSubmissions.fullName,
            dateOfBirth: kycSubmissions.dateOfBirth,
            documentType: kycSubmissions.documentType,
            documentNumber: kycSubmissions.documentNumber,
            address: kycSubmissions.address,
            city: kycSubmissions.city,
            postalCode: kycSubmissions.postalCode,
            documentFrontNote: kycSubmissions.documentFrontNote,
            status: kycSubmissions.status,
            adminRemarks: kycSubmissions.adminRemarks,
            reviewedAt: kycSubmissions.reviewedAt,
            createdAt: kycSubmissions.createdAt,
            userEmail: users.email,
            userName: users.name,
          })
          .from(kycSubmissions)
          .innerJoin(users, eq(kycSubmissions.userId, users.id))
          .orderBy(desc(kycSubmissions.createdAt)),
        db
          .select({
            id: transactions.id,
            referenceId: transactions.referenceId,
            userId: transactions.userId,
            type: transactions.type,
            serviceSlug: transactions.serviceSlug,
            serviceName: transactions.serviceName,
            operatorName: transactions.operatorName,
            accountNumber: transactions.accountNumber,
            amount: transactions.amount,
            commissionEarned: transactions.commissionEarned,
            cashbackEarned: transactions.cashbackEarned,
            promoCode: transactions.promoCode,
            paymentMethod: transactions.paymentMethod,
            status: transactions.status,
            notes: transactions.notes,
            createdAt: transactions.createdAt,
            userName: users.name,
            userEmail: users.email,
          })
          .from(transactions)
          .innerJoin(users, eq(transactions.userId, users.id))
          .orderBy(desc(transactions.createdAt)),
      ]);

      res.json({
        services: allServices,
        operators: allOperators,
        offers: allOffers,
        banners: allBanners,
        settings: allSettings,
        users: allUsers.map(sanitizeUser),
        kycSubmissions: allKyc,
        transactions: allTxns,
      });
    } catch (error: any) {
      console.error('Admin overview failed:', error);
      res.status(500).json({ error: error.message || 'Failed to load admin overview' });
    }
  });

  // Admin: Services CRUD
  app.post('/api/admin/services', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { slug, name, description, iconName, identifierLabel, identifierPlaceholder, isActive, sortOrder } = req.body || {};
      if (!slug || !name) {
        return res.status(400).json({ error: 'Service slug and name are required.' });
      }
      const [created] = await db
        .insert(services)
        .values({
          slug: String(slug).trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''),
          name: String(name).trim(),
          description: String(description || 'Utility payment & recharge service').trim(),
          iconName: String(iconName || 'Zap').trim(),
          identifierLabel: String(identifierLabel || 'Account Number').trim(),
          identifierPlaceholder: String(identifierPlaceholder || 'Enter account number').trim(),
          isActive: isActive !== undefined ? Boolean(isActive) : true,
          sortOrder: Number(sortOrder || 10),
        })
        .returning();
      res.status(201).json({ service: created });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create service' });
    }
  });

  app.put('/api/admin/services/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { name, description, iconName, identifierLabel, identifierPlaceholder, isActive, sortOrder } = req.body || {};
      const [updated] = await db
        .update(services)
        .set({
          ...(name !== undefined && { name: String(name).trim() }),
          ...(description !== undefined && { description: String(description).trim() }),
          ...(iconName !== undefined && { iconName: String(iconName).trim() }),
          ...(identifierLabel !== undefined && { identifierLabel: String(identifierLabel).trim() }),
          ...(identifierPlaceholder !== undefined && { identifierPlaceholder: String(identifierPlaceholder).trim() }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
          ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
        })
        .where(eq(services.id, id))
        .returning();
      if (!updated) return res.status(404).json({ error: 'Service not found' });
      res.json({ service: updated });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update service' });
    }
  });

  app.delete('/api/admin/services/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(services).where(eq(services.id, id));
      res.json({ deleted: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to delete service' });
    }
  });

  // Admin: Operators & Commission CRUD
  app.post('/api/admin/operators', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { serviceId, name, code, commissionRate, flatFee, minAmount, maxAmount, accentColor, symbol, logoUrl, isActive } = req.body || {};
      if (!serviceId || !name || !code) {
        return res.status(400).json({ error: 'Service, operator name, and operator code are required.' });
      }
      const [created] = await db
        .insert(operators)
        .values({
          serviceId: Number(serviceId),
          name: String(name).trim(),
          code: String(code).trim().toUpperCase(),
          commissionRate: Number(commissionRate ?? 1.5),
          flatFee: Number(flatFee ?? 0),
          minAmount: Number(minAmount ?? 10),
          maxAmount: Number(maxAmount ?? 50000),
          accentColor: String(accentColor || '#1D4ED8'),
          symbol: String(symbol || '').trim().slice(0, 6),
          logoUrl: String(logoUrl || '').trim(),
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        })
        .returning();
      res.status(201).json({ operator: created });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to add operator' });
    }
  });

  app.put('/api/admin/operators/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { serviceId, name, code, commissionRate, flatFee, minAmount, maxAmount, accentColor, symbol, logoUrl, isActive } = req.body || {};
      const [updated] = await db
        .update(operators)
        .set({
          ...(serviceId !== undefined && { serviceId: Number(serviceId) }),
          ...(name !== undefined && { name: String(name).trim() }),
          ...(code !== undefined && { code: String(code).trim().toUpperCase() }),
          ...(commissionRate !== undefined && { commissionRate: Number(commissionRate) }),
          ...(flatFee !== undefined && { flatFee: Number(flatFee) }),
          ...(minAmount !== undefined && { minAmount: Number(minAmount) }),
          ...(maxAmount !== undefined && { maxAmount: Number(maxAmount) }),
          ...(accentColor !== undefined && { accentColor: String(accentColor) }),
          ...(symbol !== undefined && { symbol: String(symbol).trim().slice(0, 6) }),
          ...(logoUrl !== undefined && { logoUrl: String(logoUrl).trim() }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        })
        .where(eq(operators.id, id))
        .returning();
      if (!updated) return res.status(404).json({ error: 'Operator not found' });
      res.json({ operator: updated });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update operator' });
    }
  });

  app.delete('/api/admin/operators/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(operators).where(eq(operators.id, id));
      res.json({ deleted: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to delete operator' });
    }
  });

  // Admin: Cashback Offers CRUD
  app.post('/api/admin/offers', requireAuth, requireAdmin, async (req, res) => {
    try {
      const {
        title,
        description,
        promoCode,
        serviceSlug,
        discountType,
        discountValue,
        maxCashback,
        minTransactionAmount,
        isActive,
        expiresAt,
      } = req.body || {};
      if (!title || !promoCode) {
        return res.status(400).json({ error: 'Offer title and promo code are required.' });
      }
      const [created] = await db
        .insert(cashbackOffers)
        .values({
          title: String(title).trim(),
          description: String(description || '').trim(),
          promoCode: String(promoCode).trim().toUpperCase(),
          serviceSlug: String(serviceSlug || 'all').trim(),
          discountType: discountType === 'flat' ? 'flat' : 'percentage',
          discountValue: Number(discountValue ?? 5),
          maxCashback: Number(maxCashback ?? 50),
          minTransactionAmount: Number(minTransactionAmount ?? 10),
          isActive: isActive !== undefined ? Boolean(isActive) : true,
          expiresAt: String(expiresAt || '2026-12-31'),
        })
        .returning();

      if (created.isActive) {
        const allUsers = await db.select({ id: users.id }).from(users);
        if (allUsers.length > 0) {
          await db.insert(notifications).values(
            allUsers.map((u) => ({
              userId: u.id,
              title: `New Cashback Offer: ${created.title}`,
              message: created.description || 'Tap Apply Cashback at checkout to earn instant rewards.',
              category: 'offer',
              targetTab: 'offers',
              isRead: false,
            }))
          );
        }
      }

      res.status(201).json({ offer: created });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create cashback offer' });
    }
  });

  app.put('/api/admin/offers/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const {
        title,
        description,
        promoCode,
        serviceSlug,
        discountType,
        discountValue,
        maxCashback,
        minTransactionAmount,
        isActive,
        expiresAt,
      } = req.body || {};
      const [updated] = await db
        .update(cashbackOffers)
        .set({
          ...(title !== undefined && { title: String(title).trim() }),
          ...(description !== undefined && { description: String(description).trim() }),
          ...(promoCode !== undefined && { promoCode: String(promoCode).trim().toUpperCase() }),
          ...(serviceSlug !== undefined && { serviceSlug: String(serviceSlug).trim() }),
          ...(discountType !== undefined && { discountType: discountType === 'flat' ? 'flat' : 'percentage' }),
          ...(discountValue !== undefined && { discountValue: Number(discountValue) }),
          ...(maxCashback !== undefined && { maxCashback: Number(maxCashback) }),
          ...(minTransactionAmount !== undefined && { minTransactionAmount: Number(minTransactionAmount) }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
          ...(expiresAt !== undefined && { expiresAt: String(expiresAt) }),
        })
        .where(eq(cashbackOffers.id, id))
        .returning();
      if (!updated) return res.status(404).json({ error: 'Offer not found' });
      res.json({ offer: updated });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update cashback offer' });
    }
  });

  app.delete('/api/admin/offers/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(cashbackOffers).where(eq(cashbackOffers.id, id));
      res.json({ deleted: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to delete offer' });
    }
  });

  // Admin: Offer Banners CRUD
  app.post('/api/admin/banners', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { title, subtitle, promoCode, serviceSlug, imageUrl, accentColor, ctaLabel, isActive, sortOrder } = req.body || {};
      if (!title) {
        return res.status(400).json({ error: 'Banner title is required.' });
      }
      const [created] = await db
        .insert(offerBanners)
        .values({
          title: String(title).trim(),
          subtitle: String(subtitle || '').trim(),
          promoCode: String(promoCode || '').trim().toUpperCase(),
          serviceSlug: String(serviceSlug || 'mobile').trim(),
          imageUrl: String(imageUrl || '').trim(),
          accentColor: String(accentColor || '#1D4ED8').trim(),
          ctaLabel: String(ctaLabel || 'Apply Offer').trim(),
          isActive: isActive !== undefined ? Boolean(isActive) : true,
          sortOrder: Number(sortOrder ?? 1),
        })
        .returning();
      res.status(201).json({ banner: created });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create offer banner' });
    }
  });

  app.put('/api/admin/banners/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { title, subtitle, promoCode, serviceSlug, imageUrl, accentColor, ctaLabel, isActive, sortOrder } = req.body || {};
      const [updated] = await db
        .update(offerBanners)
        .set({
          ...(title !== undefined && { title: String(title).trim() }),
          ...(subtitle !== undefined && { subtitle: String(subtitle).trim() }),
          ...(promoCode !== undefined && { promoCode: String(promoCode).trim().toUpperCase() }),
          ...(serviceSlug !== undefined && { serviceSlug: String(serviceSlug).trim() }),
          ...(imageUrl !== undefined && { imageUrl: String(imageUrl).trim() }),
          ...(accentColor !== undefined && { accentColor: String(accentColor).trim() }),
          ...(ctaLabel !== undefined && { ctaLabel: String(ctaLabel).trim() }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
          ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
        })
        .where(eq(offerBanners.id, id))
        .returning();
      if (!updated) return res.status(404).json({ error: 'Banner not found' });
      res.json({ banner: updated });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update offer banner' });
    }
  });

  app.delete('/api/admin/banners/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(offerBanners).where(eq(offerBanners.id, id));
      res.json({ deleted: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to delete banner' });
    }
  });

  // Admin: Platform & WhatsApp Settings Update
  app.put('/api/admin/settings', requireAuth, requireAdmin, async (req, res) => {
    try {
      const updates: Array<{ key: string; value: string; label?: string; description?: string }> =
        Array.isArray(req.body?.settings) ? req.body.settings : [];

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No settings provided to update.' });
      }

      for (const item of updates) {
        await db
          .insert(platformSettings)
          .values({
            key: String(item.key).trim(),
            value: String(item.value),
            label: item.label || String(item.key),
            description: item.description || '',
          })
          .onConflictDoUpdate({
            target: platformSettings.key,
            set: {
              value: String(item.value),
              updatedAt: new Date(),
            },
          });
      }

      const allSettings = await db.select().from(platformSettings).orderBy(asc(platformSettings.id));
      res.json({ settings: allSettings });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update settings' });
    }
  });

  // Admin: Review KYC Submission
  app.put('/api/admin/kyc/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status, adminRemarks } = req.body || {};
      if (!['verified', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Invalid KYC status.' });
      }

      const result = await db.transaction(async (tx) => {
        const [submission] = await tx
          .update(kycSubmissions)
          .set({
            status,
            adminRemarks: adminRemarks ? String(adminRemarks).trim() : '',
            reviewedAt: new Date(),
          })
          .where(eq(kycSubmissions.id, id))
          .returning();

        if (!submission) {
          throw new Error('NOT_FOUND');
        }

        await tx
          .update(users)
          .set({ kycStatus: status })
          .where(eq(users.id, submission.userId));

        if (status === 'verified' || status === 'rejected') {
          await tx.insert(notifications).values({
            userId: submission.userId,
            title: status === 'verified' ? 'KYC Verification Approved' : 'KYC Verification Needs Attention',
            message:
              status === 'verified'
                ? 'Your identity documents have been verified.'
                : adminRemarks
                ? `KYC rejected: ${String(adminRemarks).trim()}`
                : 'Please review and resubmit your KYC documents.',
            category: 'kyc',
            targetTab: 'kyc',
            isRead: false,
          });
        }

        return submission;
      });

      res.json({ submission: result });
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        return res.status(404).json({ error: 'KYC submission not found' });
      }
      res.status(500).json({ error: error.message || 'Failed to update KYC status' });
    }
  });

  // Admin: Update User (Role, Status, Name, Wallet Adjustment)
  app.put('/api/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { name, phone, role, status, kycStatus, walletAdjustment, adjustmentNote } = req.body || {};

      const result = await db.transaction(async (tx) => {
        const [existing] = await tx.select().from(users).where(eq(users.id, id));
        if (!existing) throw new Error('NOT_FOUND');

        const delta = walletAdjustment !== undefined ? round2(Number(walletAdjustment)) : 0;

        const [updated] = await tx
          .update(users)
          .set({
            ...(name !== undefined && { name: String(name).trim() }),
            ...(phone !== undefined && { phone: String(phone).trim() }),
            ...(role !== undefined && ['admin', 'user'].includes(role) && { role }),
            ...(status !== undefined && ['active', 'suspended'].includes(status) && { status }),
            ...(kycStatus !== undefined &&
              ['unverified', 'pending', 'verified', 'rejected'].includes(kycStatus) && { kycStatus }),
            ...(delta !== 0 && {
              walletBalance: sql`ROUND(GREATEST(0, ${users.walletBalance} + ${delta})::numeric, 2)::double precision`,
            }),
          })
          .where(eq(users.id, id))
          .returning();

        if (delta !== 0) {
          await tx.insert(transactions).values({
            referenceId: makeRef('ADJ'),
            userId: existing.id,
            type: 'admin_adjustment',
            serviceSlug: 'wallet',
            serviceName: 'Admin Wallet Adjustment',
            operatorName: delta > 0 ? 'Admin Credit' : 'Admin Debit',
            accountNumber: existing.email,
            amount: Math.abs(delta),
            commissionEarned: 0,
            cashbackEarned: 0,
            paymentMethod: 'Admin Ledger',
            status: 'success',
            notes: adjustmentNote ? String(adjustmentNote).trim() : `Admin balance ${delta > 0 ? 'credit' : 'debit'}`,
          });

          await tx.insert(notifications).values({
            userId: existing.id,
            title: delta > 0 ? 'Wallet Credited by Admin' : 'Wallet Adjusted by Admin',
            message: adjustmentNote
              ? String(adjustmentNote).trim()
              : `Your wallet balance was adjusted by ${delta > 0 ? '+' : '-'}${Math.abs(delta).toFixed(2)}.`,
            category: 'wallet',
            targetTab: 'transactions',
            isRead: false,
          });
        }

        return updated;
      });

      res.json({ user: sanitizeUser(result) });
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(500).json({ error: error.message || 'Failed to update user' });
    }
  });

  // Admin: Update Transaction Status / Notes
  app.put('/api/admin/transactions/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status, notes } = req.body || {};
      if (status && !['success', 'pending', 'failed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid transaction status' });
      }

      const [updated] = await db
        .update(transactions)
        .set({
          ...(status !== undefined && { status }),
          ...(notes !== undefined && { notes: String(notes).trim() }),
        })
        .where(eq(transactions.id, id))
        .returning();

      if (!updated) return res.status(404).json({ error: 'Transaction not found' });
      res.json({ transaction: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update transaction' });
    }
  });

  // Vite / Static Asset Handling
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`VoltPay server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
