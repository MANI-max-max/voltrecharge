import { NextFunction, Request, Response } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { DbUser, getOrCreateFirebaseUser, getUserByUid, verifySessionToken } from '../db/users.ts';
import { adminAuth } from '../lib/firebase-admin.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken | { uid: string; email?: string; name?: string };
  dbUser?: DbUser;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
  }

  const token = authHeader.split('Bearer ')[1];

  // 1. Check signed local Email/Password session token
  if (token.startsWith('VP1.')) {
    const session = verifySessionToken(token);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized: Session expired or invalid' });
    }
    try {
      const dbUser = await getUserByUid(session.uid);
      if (!dbUser) {
        return res.status(401).json({ error: 'Unauthorized: Account not found' });
      }
      if (dbUser.status === 'suspended') {
        return res.status(403).json({ error: 'Account suspended. Contact WhatsApp Support.' });
      }
      req.user = { uid: dbUser.uid, email: dbUser.email, name: dbUser.name };
      req.dbUser = dbUser;
      return next();
    } catch (error) {
      console.error('Error loading user session:', error);
      return res.status(500).json({ error: 'Authentication verification failed' });
    }
  }

  // 2. Verify Firebase ID Token (Google Sign-In)
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    const referralCodeHeader =
      typeof req.headers['x-referral-code'] === 'string'
        ? req.headers['x-referral-code']
        : undefined;
    const dbUser = await getOrCreateFirebaseUser(
      decodedToken.uid,
      decodedToken.email || `${decodedToken.uid}@firebase.user`,
      decodedToken.name,
      referralCodeHeader
    );
    if (dbUser.status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended. Contact WhatsApp Support.' });
    }
    req.dbUser = dbUser;
    return next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid authentication token' });
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.dbUser || req.dbUser.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required' });
  }
  return next();
};
