import { useState } from 'react';
import { Check, Copy, Share2, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatDateTime, formatMoney } from '../lib/api';

interface ReferEarnViewProps {
  onRequireAuth?: (promptMessage?: string) => void;
}

export function ReferEarnView({ onRequireAuth }: ReferEarnViewProps) {
  const { user, referrals, bootstrap } = useAuth();
  const currency = bootstrap.settings.currency_symbol || '₹';
  const referrerBonus = Number(bootstrap.settings.referral_bonus_referrer || '25');
  const refereeBonus = Number(bootstrap.settings.referral_bonus_referee || '15');

  const [copiedType, setCopiedType] = useState<'code' | 'link' | null>(null);

  const inviteLink =
    typeof window !== 'undefined' && user
      ? `${window.location.origin}/?ref=${user.referralCode}`
      : '';

  const copyText = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 1800);
    } catch {
      // ignore
    }
  };

  const totalReferralEarnings = referrals.reduce((sum, r) => sum + (r.bonusAmount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Refer &amp; Earn Program</h2>
              <p className="text-xs text-slate-500">
                Invite friends to {bootstrap.settings.brand_name || 'VoltPay'} and earn instant wallet rewards
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <p className="text-xs text-slate-500">You Earn Per Referral</p>
              <p className="text-xl font-bold text-emerald-700 font-mono tabular-nums mt-0.5">
                {formatMoney(referrerBonus, currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Your Friend Gets Welcome Bonus</p>
              <p className="text-xl font-bold text-blue-700 font-mono tabular-nums mt-0.5">
                {formatMoney(refereeBonus, currency)}
              </p>
            </div>
          </div>

          {user ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Your Unique Referral Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={user.referralCode || ''}
                    className="flex-1 px-3.5 py-2.5 text-sm font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => copyText(user.referralCode || '', 'code')}
                    className="px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    {copiedType === 'code' ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Code
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Shareable Referral Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="flex-1 px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-700 truncate"
                  />
                  <button
                    type="button"
                    onClick={() => copyText(inviteLink, 'link')}
                    className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    {copiedType === 'link' ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied Link
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Link
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-slate-600">
                Sign in or create an account to generate your personal referral code and invite link.
              </p>
              <button
                type="button"
                onClick={() => onRequireAuth?.('Sign in or create an account to get your referral link.')}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer shrink-0"
              >
                Sign In to Get Link
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-700" />
              Referral Performance
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
              <p className="text-xs text-slate-500">Friends Joined</p>
              <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                {referrals.length}
              </p>
            </div>
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
              <p className="text-xs text-slate-500">Total Earned</p>
              <p className="text-2xl font-bold text-emerald-700 font-mono tabular-nums mt-1">
                {formatMoney(totalReferralEarnings, currency)}
              </p>
            </div>
          </div>
          {user?.referredBy && (
            <p className="text-xs text-slate-500 pt-2">
              You joined via referral code <span className="font-mono font-semibold text-slate-800">{user.referredBy}</span>.
            </p>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4">Referred Users Ledger</h3>
        {referrals.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">
            No referrals yet. Share your code or invite link above to start earning bonuses.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-2.5 pr-4">Friend Name</th>
                  <th className="py-2.5 pr-4">Email</th>
                  <th className="py-2.5 pr-4">Joined Date</th>
                  <th className="py-2.5 pr-4 text-right">Bonus Credited</th>
                  <th className="py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {referrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 font-medium text-slate-900">{ref.referredName}</td>
                    <td className="py-3 pr-4 text-slate-600 text-xs">{ref.referredEmail}</td>
                    <td className="py-3 pr-4 text-xs text-slate-500">{formatDateTime(ref.createdAt)}</td>
                    <td className="py-3 pr-4 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                      +{formatMoney(ref.bonusAmount, currency)}
                    </td>
                    <td className="py-3 text-right text-xs font-semibold text-emerald-700 capitalize">
                      {ref.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
