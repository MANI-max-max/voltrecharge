import { ArrowRight, Gift } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../lib/api';

interface OffersViewProps {
  onApplyOffer: (serviceSlug: string, promoCode: string) => void;
}

export function OffersView({ onApplyOffer }: OffersViewProps) {
  const { user, bootstrap } = useAuth();
  const currency = bootstrap.settings.currency_symbol || '₹';

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Active Cashback Offers</h2>
            <p className="text-xs text-slate-500">
              Tap Apply Cashback on any offer below to activate instant wallet rewards at checkout
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-xs text-slate-500">Total Cashback Earned</p>
          <p className="text-xl font-bold text-blue-700 font-mono tabular-nums">
            {formatMoney(user?.totalCashbackEarned || 0, currency)}
          </p>
        </div>
      </div>

      {bootstrap.offers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-500">
          No cashback campaigns are active right now. Check back soon or contact admin.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bootstrap.offers.map((offer) => (
            <div
              key={offer.id}
              className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-5"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                  <span className="capitalize font-medium text-blue-700">
                    {offer.serviceSlug === 'all' ? 'All Services' : `${offer.serviceSlug} Service`}
                  </span>
                  <span>Expires {offer.expiresAt || '2026-12-31'}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{offer.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{offer.description}</p>
                <p className="text-xs text-slate-500 pt-1">
                  Minimum Order: <span className="font-mono font-semibold text-slate-800">{formatMoney(offer.minTransactionAmount, currency)}</span>
                  {' · '}Max Cashback: <span className="font-mono font-semibold text-slate-800">{formatMoney(offer.maxCashback, currency)}</span>
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="font-mono text-xs font-bold text-emerald-700">
                  {offer.discountType === 'percentage'
                    ? `${offer.discountValue}% Cashback (Up to ${formatMoney(offer.maxCashback, currency)})`
                    : `Flat ${formatMoney(offer.discountValue, currency)} Cashback`}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    onApplyOffer(
                      offer.serviceSlug === 'all' ? 'mobile' : offer.serviceSlug,
                      offer.promoCode
                    )
                  }
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <span>Apply Cashback</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
