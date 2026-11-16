import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { apiRequest } from '../lib/api';
import { auth, googleAuthProvider } from '../lib/firebase';
import {
  CashbackOffer,
  KycSubmission,
  OfferBanner,
  ReferralItem,
  ServiceItem,
  UserProfile,
} from '../types';

interface BootstrapData {
  services: ServiceItem[];
  offers: CashbackOffer[];
  banners: OfferBanner[];
  settings: Record<string, string>;
}

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  bootstrap: BootstrapData;
  kyc: KycSubmission | null;
  referrals: ReferralItem[];
  pendingReferralCode: string;
  signInWithGoogle: (referralCode?: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (input: {
    name: string;
    email: string;
    phone: string;
    password: string;
    referralCode?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
  refreshBootstrap: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [kyc, setKyc] = useState<KycSubmission | null>(null);
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [pendingReferralCode, setPendingReferralCode] = useState('');
  const [bootstrap, setBootstrap] = useState<BootstrapData>({
    services: [],
    offers: [],
    banners: [],
    settings: {
      brand_name: 'VoltPay',
      currency_symbol: '₹',
      whatsapp_support_number: '+15550194820',
      whatsapp_support_message: 'Hello VoltPay Support, I need assistance.',
      whatsapp_channel_url: 'https://whatsapp.com/channel/0029VaVoltPayOfficial',
      whatsapp_channel_label: 'Join Official VoltPay Updates Channel',
      referral_bonus_referrer: '25',
      referral_bonus_referee: '15',
      support_email: 'support@voltpay.io',
      min_add_money: '10',
      max_add_money: '50000',
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setPendingReferralCode(ref.trim().toUpperCase());
    }
  }, []);

  const refreshBootstrap = useCallback(async () => {
    try {
      const data = await apiRequest<BootstrapData>('/api/public/bootstrap');
      setBootstrap(data);
    } catch (error) {
      console.error('Failed to load bootstrap data:', error);
    }
  }, []);

  const fetchMeWithToken = useCallback(
    async (activeToken: string, referralHeader?: string) => {
      const headers: Record<string, string> = {};
      if (referralHeader) {
        headers['x-referral-code'] = referralHeader;
      }
      const data = await apiRequest<{
        user: UserProfile;
        kyc: KycSubmission | null;
        referrals: ReferralItem[];
      }>('/api/me', {
        token: activeToken,
        headers,
      });
      setUser(data.user);
      setKyc(data.kyc);
      setReferrals(data.referrals);
    },
    []
  );

  const refreshMe = useCallback(async () => {
    if (!token) return;
    if (auth.currentUser && !token.startsWith('VP1.')) {
      const freshToken = await auth.currentUser.getIdToken();
      setToken(freshToken);
      await fetchMeWithToken(freshToken);
    } else {
      await fetchMeWithToken(token);
    }
  }, [token, fetchMeWithToken]);

  useEffect(() => {
    refreshBootstrap();
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          setToken(idToken);
          await fetchMeWithToken(idToken, pendingReferralCode || undefined);
        } catch (error) {
          console.error('Failed to sync Firebase user:', error);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [refreshBootstrap, fetchMeWithToken, pendingReferralCode]);

  const signInWithGoogle = async (referralCode?: string) => {
    const cred = await signInWithPopup(auth, googleAuthProvider);
    const idToken = await cred.user.getIdToken();
    setToken(idToken);
    await fetchMeWithToken(idToken, referralCode || pendingReferralCode || undefined);
  };

  const signInWithEmail = async (email: string, password: string) => {
    const res = await apiRequest<{ user: UserProfile; token: string }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setToken(res.token);
    setUser(res.user);
    await fetchMeWithToken(res.token);
  };

  const signUpWithEmail = async (input: {
    name: string;
    email: string;
    phone: string;
    password: string;
    referralCode?: string;
  }) => {
    const res = await apiRequest<{ user: UserProfile; token: string }>('/api/auth/register', {
      method: 'POST',
      body: {
        ...input,
        referralCode: input.referralCode || pendingReferralCode || undefined,
      },
    });
    setToken(res.token);
    setUser(res.user);
    await fetchMeWithToken(res.token);
  };

  const signOut = async () => {
    if (auth.currentUser) {
      await firebaseSignOut(auth);
    }
    setToken(null);
    setUser(null);
    setKyc(null);
    setReferrals([]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        bootstrap,
        kyc,
        referrals,
        pendingReferralCode,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        refreshMe,
        refreshBootstrap,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
