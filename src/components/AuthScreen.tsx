import React, { useState } from 'react';
import { ArrowRight, Check, Copy, ExternalLink, MessageCircle, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { buildWhatsAppSupportUrl } from '../lib/api';
import { firebaseProjectId } from '../lib/firebase';
import { PWAInstallButton } from './PWAInstallButton';

interface AuthScreenProps {
  isModal?: boolean;
  initialMode?: 'login' | 'signup';
  promptMessage?: string;
  onClose?: () => void;
}

export function AuthScreen({
  isModal = false,
  initialMode,
  promptMessage,
  onClose,
}: AuthScreenProps = {}) {
  const {
    bootstrap,
    pendingReferralCode,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>(
    initialMode || (pendingReferralCode ? 'signup' : 'login')
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState(pendingReferralCode);
  const [error, setError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const brandName = bootstrap.settings.brand_name || 'VoltPay';
  const supportUrl = buildWhatsAppSupportUrl(
    bootstrap.settings.whatsapp_support_number || '+15550194820',
    bootstrap.settings.whatsapp_support_message || 'Hello Support, I need assistance.'
  );
  const channelUrl =
    bootstrap.settings.whatsapp_channel_url || 'https://whatsapp.com/channel/0029VaVoltPayOfficial';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUnauthorizedDomain(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail({
          name,
          email,
          phone,
          password,
          referralCode: referralCode.trim() || undefined,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setUnauthorizedDomain(null);
    setSubmitting(true);
    try {
      await signInWithGoogle(referralCode.trim() || undefined);
    } catch (err: any) {
      const code = err?.code || '';
      const msg = String(err?.message || '');
      if (code === 'auth/unauthorized-domain' || msg.includes('auth/unauthorized-domain')) {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
        setUnauthorizedDomain(hostname || 'this domain');
        setError(
          `Google Sign-In requires "${hostname}" to be added to Firebase Authorized Domains, or you can sign in with Email & Password below.`
        );
      } else if (code === 'auth/popup-blocked') {
        setError('Sign-in popup was blocked by your browser. Please allow popups or use Email & Password below.');
      } else if (code === 'auth/popup-closed-by-user') {
        setError('Google sign-in window was closed before completing.');
      } else {
        setError(msg || 'Google sign-in could not be completed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyDomain = async () => {
    if (!unauthorizedDomain) return;
    try {
      await navigator.clipboard.writeText(unauthorizedDomain);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    } catch {
      // ignore clipboard restrictions
    }
  };

  const authFormCard = (
    <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 relative">
      {isModal && onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sign in dialog"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {promptMessage && (
        <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs font-medium text-blue-900 pr-8">
          {promptMessage}
        </div>
      )}

      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg mb-6">
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setError(null);
          }}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            mode === 'login'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup');
            setError(null);
          }}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            mode === 'signup'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Create Account
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">
          {mode === 'login' ? `Sign in to ${brandName}` : `Create your ${brandName} account`}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {mode === 'login'
            ? 'Access your wallet, commissions, and transaction ledger.'
            : 'Get started with instant recharges, KYC verification, and referral rewards.'}
        </p>
      </div>

            {error && (
              <div className="mb-4 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs sm:text-sm text-red-800 space-y-2.5">
                <p className="font-medium leading-relaxed">{error}</p>
                {unauthorizedDomain && (
                  <div className="pt-2 border-t border-red-200 space-y-2">
                    <div className="flex items-center justify-between gap-2 bg-white border border-red-200 rounded-md px-2.5 py-1.5">
                      <span className="font-mono text-xs text-slate-800 truncate">
                        {unauthorizedDomain}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyDomain}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 rounded cursor-pointer shrink-0"
                      >
                        {copiedDomain ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Domain</span>
                          </>
                        )}
                      </button>
                    </div>
                    <a
                      href={`https://console.firebase.google.com/project/${firebaseProjectId}/authentication/settings`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline"
                    >
                      <span>Open Firebase Authorized Domains Settings</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-800 flex items-center justify-center gap-3 transition-colors cursor-pointer disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.1.74-2.51 1.18-4.22 1.18-3.24 0-5.99-2.19-6.97-5.13H1.04v3.14C3.05 21.17 7.21 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.03 14.04A7.19 7.19 0 0 1 4.65 12c0-.71.13-1.4.38-2.04V6.82H1.04A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.04 5.18l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.77c1.8 0 3.41.62 4.68 1.83l3.51-3.51C18.07 1.19 15.3 0 12 0 7.21 0 3.05 2.83 1.04 6.82l3.99 3.14c.98-2.94 3.73-5.19 6.97-5.19Z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium text-slate-400">Or continue with email</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Mercer"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 555 010 9988"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Referral Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="Enter friend's referral code"
                    className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
              >
                <span>
                  {submitting
                    ? 'Processing...'
                    : mode === 'login'
                    ? 'Sign In'
                    : 'Create Account'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
  );

  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget && onClose) onClose();
        }}
      >
        <div className="w-full max-w-md my-auto max-h-[92vh] overflow-y-auto rounded-xl">
          {authFormCard}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="w-full border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <span className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            {brandName}
          </span>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href={supportUrl} target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              WhatsApp Support
            </a>
            <a href={channelUrl} target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              WhatsApp Channel
            </a>
          </nav>
          <div className="flex items-center gap-2.5 shrink-0">
            <PWAInstallButton variant="header" />
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {mode === 'login' ? 'Create Account' : 'Sign In'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <div>{authFormCard}</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href={supportUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">WhatsApp Support</p>
                <p className="text-[11px] text-slate-500 truncate">Live help desk</p>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </a>

          <a
            href={channelUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">WhatsApp Channel</p>
                <p className="text-[11px] text-slate-500 truncate">Rate updates &amp; alerts</p>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </a>
        </div>
      </main>
    </div>
  );
}
