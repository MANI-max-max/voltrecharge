import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Gift,
  Percent,
  Receipt,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RECHARGE_PLANS } from '../data/plans';
import { apiRequest, formatDateTime, formatMoney } from '../lib/api';
import { TransactionItem } from '../types';
import { OperatorBadge } from './OperatorBadge';
import { PWAInstallButton } from './PWAInstallButton';
import { ServiceIcon } from './ServiceIcon';

interface RechargeWorkspaceProps {
  preselectedServiceSlug?: string;
  preselectedPromoCode?: string;
  isDetailOpen: boolean;
  onOpenService: (slug: string) => void;
  onCloseService: () => void;
  onNavigate: (tab: string) => void;
  onRequireAuth: (promptMessage?: string) => void;
}

export function RechargeWorkspace({
  preselectedServiceSlug,
  preselectedPromoCode,
  isDetailOpen,
  onOpenService,
  onCloseService,
  onNavigate,
  onRequireAuth,
}: RechargeWorkspaceProps) {
  const { user, token, bootstrap, setUser, refreshBootstrap } = useAuth();
  const currency = bootstrap.settings.currency_symbol || '₹';
  const services = bootstrap.services;
  const banners = bootstrap.banners || [];
  const [bannerIdx, setBannerIdx] = useState(0);

  const selectedSlug = preselectedServiceSlug || services[0]?.slug || 'mobile';

  const [operatorId, setOperatorId] = useState<number>(0);
  const [operatorSearch, setOperatorSearch] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('199');
  const [selectedOfferId, setSelectedOfferId] = useState<number | null>(null);
  const [planCategory, setPlanCategory] = useState<string>('All');
  const [planSearch, setPlanSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<TransactionItem | null>(null);
  const [recentTxns, setRecentTxns] = useState<TransactionItem[]>([]);

  useEffect(() => {
    if (preselectedPromoCode) {
      const matched = bootstrap.offers.find(
        (o) => o.promoCode.toUpperCase() === preselectedPromoCode.trim().toUpperCase()
      );
      if (matched) {
        setSelectedOfferId(matched.id);
      }
    }
  }, [preselectedPromoCode, bootstrap.offers]);

  useEffect(() => {
    setPlanCategory('All');
    setPlanSearch('');
    setOperatorSearch('');
    setError(null);
  }, [selectedSlug]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setBannerIdx((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const activeBanner = banners.length > 0 ? banners[bannerIdx % banners.length] : null;

  const activeService = useMemo(
    () => services.find((s) => s.slug === selectedSlug) || services[0],
    [services, selectedSlug]
  );

  const activeOperators = activeService?.operators || [];

  const filteredOperators = useMemo(() => {
    const q = operatorSearch.trim().toLowerCase();
    if (!q) return activeOperators;
    return activeOperators.filter(
      (op) =>
        op.name.toLowerCase().includes(q) ||
        op.code.toLowerCase().includes(q) ||
        (op.symbol || '').toLowerCase().includes(q)
    );
  }, [activeOperators, operatorSearch]);

  useEffect(() => {
    if (activeOperators.length > 0) {
      const stillValid = activeOperators.some((o) => o.id === operatorId);
      if (!stillValid) {
        setOperatorId(activeOperators[0].id);
      }
    } else {
      setOperatorId(0);
    }
  }, [activeService, activeOperators, operatorId]);

  const loadRecent = async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{ transactions: TransactionItem[] }>('/api/transactions', {
        token,
      });
      setRecentTxns(data.transactions.slice(0, 6));
    } catch {
      // ignore initial error
    }
  };

  useEffect(() => {
    loadRecent();
    refreshBootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const selectedOperator = activeOperators.find((o) => o.id === operatorId);
  const hasEnteredNumber = accountNumber.trim().length > 0;
  const numAmount = Math.max(0, Number(amount) || 0);

  const estimatedCommission = selectedOperator
    ? Math.round(
        ((numAmount * selectedOperator.commissionRate) / 100 + selectedOperator.flatFee) * 100
      ) / 100
    : 0;

  const compatibleOffers = useMemo(
    () =>
      bootstrap.offers.filter(
        (o) => o.serviceSlug === 'all' || o.serviceSlug === activeService?.slug
      ),
    [bootstrap.offers, activeService?.slug]
  );

  const matchingOffer = useMemo(
    () => compatibleOffers.find((o) => o.id === selectedOfferId) || null,
    [compatibleOffers, selectedOfferId]
  );

  useEffect(() => {
    if (selectedOfferId !== null && !compatibleOffers.some((o) => o.id === selectedOfferId)) {
      setSelectedOfferId(null);
    }
  }, [compatibleOffers, selectedOfferId]);

  const estimatedCashback = useMemo(() => {
    if (!matchingOffer || numAmount < matchingOffer.minTransactionAmount) return 0;
    if (matchingOffer.discountType === 'percentage') {
      return (
        Math.round(
          Math.min((numAmount * matchingOffer.discountValue) / 100, matchingOffer.maxCashback) * 100
        ) / 100
      );
    }
    return Math.round(Math.min(matchingOffer.discountValue, matchingOffer.maxCashback) * 100) / 100;
  }, [matchingOffer, numAmount]);

  const servicePlans = useMemo(
    () => RECHARGE_PLANS.filter((p) => p.serviceSlug === activeService?.slug),
    [activeService?.slug]
  );

  const planCategories = useMemo(() => {
    const cats = Array.from(new Set(servicePlans.map((p) => p.category)));
    return ['All', ...cats];
  }, [servicePlans]);

  const filteredPlans = useMemo(() => {
    const q = planSearch.trim().toLowerCase();
    return servicePlans.filter((p) => {
      if (planCategory !== 'All' && p.category !== planCategory) return false;
      if (!q) return true;
      return (
        String(p.amount).includes(q) ||
        p.dataOrBenefit.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.validity.toLowerCase().includes(q)
      );
    });
  }, [servicePlans, planCategory, planSearch]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeService || !selectedOperator) return;
    if (!token || !user) {
      onRequireAuth(
        `Sign in or create an account to complete your ${activeService.name} payment (${formatMoney(numAmount, currency)}).`
      );
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiRequest<{ user: any; transaction: TransactionItem }>('/api/recharge', {
        method: 'POST',
        token,
        body: {
          serviceSlug: activeService.slug,
          operatorId: selectedOperator.id,
          accountNumber,
          amount: Number(amount),
          offerId: matchingOffer ? matchingOffer.id : undefined,
        },
      });
      setUser(res.user);
      setReceipt(res.transaction);
      setAccountNumber('');
      setSelectedOfferId(null);
      await loadRecent();
    } catch (err: any) {
      setError(err.message || 'Payment could not be completed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 2cm (~76px) Offer Banner Section */}
      {activeBanner ? (
        <div
          className="relative h-[76px] w-full rounded-xl overflow-hidden border border-slate-200 flex items-center justify-between px-4 sm:px-6 text-white"
          style={{ backgroundColor: activeBanner.accentColor || '#1D4ED8' }}
        >
          {activeBanner.imageUrl && (
            <>
              <img
                src={activeBanner.imageUrl}
                alt={activeBanner.title}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/65 to-slate-900/35" />
            </>
          )}

          <div className="relative z-10 min-w-0 flex-1 pr-3">
            <p className="text-sm sm:text-base font-bold truncate leading-tight">
              {activeBanner.title}
            </p>
            {activeBanner.subtitle && (
              <p className="text-xs text-white/90 truncate mt-0.5">{activeBanner.subtitle}</p>
            )}
          </div>

          <div className="relative z-10 flex items-center gap-2 shrink-0">
            {activeBanner.promoCode && (
              <button
                type="button"
                onClick={() => {
                  onOpenService(activeBanner.serviceSlug || 'mobile');
                  const matched = bootstrap.offers.find(
                    (o) => o.promoCode.toUpperCase() === activeBanner.promoCode.toUpperCase()
                  );
                  if (matched) setSelectedOfferId(matched.id);
                }}
                className="px-3 py-1.5 bg-white text-slate-900 hover:bg-slate-100 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                {activeBanner.ctaLabel || `Apply ${activeBanner.promoCode}`}
              </button>
            )}

            {banners.length > 1 && (
              <div className="hidden sm:flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous offer banner"
                  onClick={() => setBannerIdx((prev) => (prev - 1 + banners.length) % banners.length)}
                  className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next offer banner"
                  onClick={() => setBannerIdx((prev) => (prev + 1) % banners.length)}
                  className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {user?.role === 'admin' && (
              <button
                type="button"
                onClick={() => onNavigate('admin')}
                className="hidden md:inline-flex px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap"
              >
                Edit Banner
              </button>
            )}
          </div>
        </div>
      ) : user?.role === 'admin' ? (
        <div className="h-[76px] w-full rounded-xl border border-dashed border-slate-300 bg-white px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">Offer Banner Slot (2cm)</p>
            <p className="text-xs text-slate-500 truncate">No active offer banners published yet.</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap shrink-0"
          >
            Add Offer Banner
          </button>
        </div>
      ) : null}

      {/* STEP 1: SERVICE SELECTION HOME (when no dedicated service screen is open) */}
      {!isDetailOpen ? (
        <>
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {services.map((svc) => (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => {
                    onOpenService(svc.slug);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-600 hover:bg-blue-50/50 text-left transition-colors cursor-pointer flex flex-col items-center sm:items-start gap-2.5 group"
                >
                  <div className="w-11 h-11 rounded-xl bg-blue-50 group-hover:bg-blue-700 text-blue-700 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                    <ServiceIcon name={svc.iconName} className="w-5 h-5" />
                  </div>
                  <div className="text-center sm:text-left min-w-0 w-full">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-tight line-clamp-2">
                      {svc.name}
                    </p>
                    <p className="hidden sm:block text-[11px] text-slate-500 mt-0.5 tabular-nums">
                      {svc.operators?.length || 0} providers
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Transactions (shown when signed in) */}
          {user && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-900">Recent Transactions</h3>
                <button
                  type="button"
                  onClick={() => onNavigate('transactions')}
                  className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                >
                  View Full History
                </button>
              </div>
              {recentTxns.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  No transactions recorded yet. Select a service above to complete your first recharge or bill payment.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                        <th className="py-2.5 pr-4">Reference</th>
                        <th className="py-2.5 pr-4">Service &amp; Operator</th>
                        <th className="py-2.5 pr-4">Account</th>
                        <th className="py-2.5 pr-4 text-right">Amount</th>
                        <th className="py-2.5 pr-4 text-right">Earnings</th>
                        <th className="py-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {recentTxns.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="py-3 pr-4 font-mono text-xs text-slate-700">{tx.referenceId}</td>
                          <td className="py-3 pr-4">
                            <p className="font-medium text-slate-900">{tx.serviceName}</p>
                            <p className="text-xs text-slate-500">{tx.operatorName}</p>
                          </td>
                          <td className="py-3 pr-4 font-mono text-xs text-slate-600">{tx.accountNumber || '-'}</td>
                          <td className="py-3 pr-4 text-right font-mono font-semibold tabular-nums text-slate-900">
                            {formatMoney(tx.amount, currency)}
                          </td>
                          <td className="py-3 pr-4 text-right font-mono text-xs tabular-nums text-emerald-700">
                            +{formatMoney(tx.commissionEarned + tx.cashbackEarned, currency)}
                          </td>
                          <td className="py-3 text-right">
                            <span
                              className={`text-xs font-semibold capitalize ${
                                tx.status === 'success'
                                  ? 'text-emerald-700'
                                  : tx.status === 'pending'
                                  ? 'text-amber-700'
                                  : 'text-red-700'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <PWAInstallButton variant="card" />
        </>
      ) : (
        /* STEP 2: DEDICATED PAYTM-STYLE SERVICE SECTION */
        <div className="space-y-5">
          {/* Top Back Bar */}
          <div className="flex items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3">
            <button
              type="button"
              onClick={onCloseService}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-700 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>All Recharge Services</span>
            </button>

            {activeService && (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <ServiceIcon name={activeService.iconName} className="w-4 h-4 text-blue-700" />
                <span>{activeService.name}</span>
              </div>
            )}
          </div>

          {activeService && (
            <div className="max-w-3xl mx-auto space-y-5">
              {/* Top Card: Number Entry, Operator Selector & Checkout */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                  <div className="w-11 h-11 rounded-xl bg-blue-700 text-white flex items-center justify-center shrink-0">
                    <ServiceIcon name={activeService.iconName} className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{activeService.name}</h2>
                    <p className="text-xs text-slate-500">{activeService.description}</p>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between gap-3">
                    <span>{error}</span>
                    {error.toLowerCase().includes('insufficient') && (
                      <button
                        type="button"
                        onClick={() => onNavigate('add-money')}
                        className="px-3 py-1 bg-red-700 text-white text-xs font-semibold rounded-md whitespace-nowrap cursor-pointer"
                      >
                        Add Money
                      </button>
                    )}
                  </div>
                )}

                <form onSubmit={handlePay} className="space-y-4">
                  {/* 1. Enter Mobile / Account Number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      1. Enter {activeService.identifierLabel}
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder={activeService.identifierPlaceholder}
                      className="w-full px-4 py-3 text-base font-mono font-semibold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    />
                  </div>

                  {/* 2. Visual Operator Selector + Search Bar */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      2. Select Operator / Provider
                    </label>
                    {activeOperators.length === 0 ? (
                      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        No active operators configured for this service.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={operatorSearch}
                            onChange={(e) => setOperatorSearch(e.target.value)}
                            placeholder="Search operator by name or code..."
                            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                          />
                          {operatorSearch && (
                            <button
                              type="button"
                              onClick={() => setOperatorSearch('')}
                              aria-label="Clear operator search"
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {filteredOperators.length === 0 ? (
                          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 text-xs text-slate-600">
                            <span>No operators match &ldquo;{operatorSearch}&rdquo;.</span>
                            <button
                              type="button"
                              onClick={() => setOperatorSearch('')}
                              className="font-semibold text-blue-700 hover:underline cursor-pointer"
                            >
                              Show all
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {filteredOperators.map((op) => {
                              const selected = op.id === operatorId;
                              return (
                                <button
                                  key={op.id}
                                  type="button"
                                  onClick={() => setOperatorId(op.id)}
                                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                                    selected
                                      ? 'border-blue-700 bg-blue-50/70'
                                      : 'border-slate-200 bg-white hover:bg-slate-50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <OperatorBadge
                                      name={op.name}
                                      symbol={op.symbol}
                                      logoUrl={op.logoUrl}
                                      accentColor={op.accentColor}
                                      size="sm"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-bold text-slate-900 truncate">
                                        {op.name}
                                      </p>
                                      <p className="text-[11px] font-mono text-emerald-700 mt-0.5">
                                        {op.commissionRate}% Commission
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 3. Enter or Pick Amount */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      3. Recharge / Bill Amount ({currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min={selectedOperator?.minAmount || 1}
                      max={selectedOperator?.maxAmount || 100000}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-4 py-3 text-lg font-mono font-bold tabular-nums border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[99, 199, 299, 599, 999].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAmount(String(preset))}
                          className={`px-3 py-1 text-xs font-mono font-semibold rounded-md border cursor-pointer ${
                            Number(amount) === preset
                              ? 'border-blue-700 bg-blue-50 text-blue-800'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {currency}{preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. Direct Cashback Selection (Shown only after number/ID entry) */}
                  {hasEnteredNumber && compatibleOffers.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-700">
                          4. Direct Cashback Offer (Tap to Apply)
                        </label>
                        {matchingOffer && (
                          <button
                            type="button"
                            onClick={() => setSelectedOfferId(null)}
                            className="text-[11px] font-semibold text-slate-500 hover:text-red-600 cursor-pointer"
                          >
                            Remove Cashback
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {compatibleOffers.map((offer) => {
                          const applied = matchingOffer?.id === offer.id;
                          const belowMin = numAmount < offer.minTransactionAmount;
                          return (
                            <div
                              key={offer.id}
                              className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                                applied
                                  ? 'border-emerald-600 bg-emerald-50/60'
                                  : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {offer.title}
                                </p>
                                <p className="text-[11px] text-slate-600 mt-0.5">
                                  {offer.discountType === 'percentage'
                                    ? `${offer.discountValue}% up to ${formatMoney(offer.maxCashback, currency)}`
                                    : `Flat ${formatMoney(offer.discountValue, currency)}`}
                                  {' · '}Min {formatMoney(offer.minTransactionAmount, currency)}
                                </p>
                                {applied && belowMin && (
                                  <button
                                    type="button"
                                    onClick={() => setAmount(String(offer.minTransactionAmount))}
                                    className="text-[11px] font-semibold text-amber-700 hover:underline mt-1 cursor-pointer"
                                  >
                                    Set {formatMoney(offer.minTransactionAmount, currency)} to unlock cashback
                                  </button>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedOfferId(applied ? null : offer.id)
                                }
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 cursor-pointer transition-colors ${
                                  applied
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-50'
                                }`}
                              >
                                {applied ? 'Applied' : 'Apply'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Live Commission & Cashback Breakdown */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-2 text-center sm:text-left">
                    <div>
                      <p className="text-[11px] text-slate-500">Payable</p>
                      <p className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                        {formatMoney(numAmount, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                        <Percent className="w-3 h-3 text-emerald-600" />
                        Comm.
                      </p>
                      <p className="text-sm font-bold text-emerald-700 font-mono tabular-nums">
                        +{formatMoney(estimatedCommission, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                        <Gift className="w-3 h-3 text-blue-600" />
                        Cashback
                      </p>
                      <p className="text-sm font-bold text-blue-700 font-mono tabular-nums">
                        +{formatMoney(estimatedCashback, currency)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || activeOperators.length === 0}
                    className="w-full py-3.5 px-5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {submitting
                      ? 'Processing Payment...'
                      : `Proceed to Pay ${formatMoney(numAmount, currency)}`}
                  </button>
                </form>
              </div>

              {/* Below Card: Operator Offers & Plans (Shown ONLY after entering number or ID) */}
              {hasEnteredNumber && (
                <div className="space-y-5">
                  {/* Operator Plans & Offers Panel */}
                  {servicePlans.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">
                            {selectedOperator
                              ? `${selectedOperator.name} Offers & Plans`
                              : 'Operator Offers & Plans'}
                          </h3>
                          <p className="text-xs text-slate-500">
                            Showing offers for <span className="font-mono font-semibold text-slate-700">{accountNumber.trim()}</span> · Tap any offer to fill amount
                          </p>
                        </div>

                      <div className="relative w-full sm:w-56">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={planSearch}
                          onChange={(e) => setPlanSearch(e.target.value)}
                          placeholder="Search price or data..."
                          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex flex-wrap gap-1.5 pb-1 border-b border-slate-100">
                      {planCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setPlanCategory(cat)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                            planCategory === cat
                              ? 'bg-blue-700 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Plan Cards */}
                    <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                      {filteredPlans.length === 0 ? (
                        <p className="text-sm text-slate-500 py-6 text-center">
                          No plans match your search. Enter a custom amount on the left.
                        </p>
                      ) : (
                        filteredPlans.map((plan) => {
                          const isPicked = Number(amount) === plan.amount;
                          return (
                            <button
                              key={plan.id}
                              type="button"
                              onClick={() => setAmount(String(plan.amount))}
                              className={`w-full p-4 rounded-xl border text-left transition-colors cursor-pointer flex items-center justify-between gap-4 ${
                                isPicked
                                  ? 'border-blue-700 bg-blue-50/70'
                                  : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                              }`}
                            >
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-bold text-slate-900">
                                    {plan.dataOrBenefit}
                                  </span>
                                  <span className="text-xs text-slate-500">· {plan.validity}</span>
                                  {plan.badge && (
                                    <span className="text-[11px] font-semibold text-blue-700">
                                      · {plan.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-600">{plan.description}</p>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="inline-block px-3.5 py-1.5 rounded-lg border border-blue-700 text-blue-700 font-mono font-bold text-sm tabular-nums bg-white">
                                  {formatMoney(plan.amount, currency)}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                  {/* Operator Cashback Offers */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-700" />
                        {selectedOperator
                          ? `${selectedOperator.name} Cashback Offers`
                          : `Cashback Offers for ${activeService.name}`}
                      </h3>
                      <button
                        type="button"
                        onClick={() => onNavigate('offers')}
                        className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                      >
                        All Offers
                      </button>
                    </div>

                    {compatibleOffers.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No cashback offers available for {activeService.name} right now.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {compatibleOffers.map((offer) => {
                          const applied = matchingOffer?.id === offer.id;
                          return (
                            <div
                              key={offer.id}
                              className={`p-4 rounded-xl border space-y-2.5 ${
                                applied
                                  ? 'border-emerald-500 bg-emerald-50/50'
                                  : 'border-slate-200 bg-slate-50'
                              }`}
                            >
                              <div>
                                <p className="text-sm font-bold text-slate-900">{offer.title}</p>
                                <p className="text-xs text-slate-600 mt-1">{offer.description}</p>
                              </div>
                              <div className="flex items-center justify-between pt-1">
                                <span className="font-mono text-xs font-semibold text-slate-700">
                                  {offer.discountType === 'percentage'
                                    ? `${offer.discountValue}% Cashback`
                                    : `Flat ${formatMoney(offer.discountValue, currency)}`}{' '}
                                  · Min {formatMoney(offer.minTransactionAmount, currency)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedOfferId(applied ? null : offer.id)}
                                  className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer whitespace-nowrap ${
                                    applied
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-50'
                                  }`}
                                >
                                  {applied ? 'Applied' : 'Apply Cashback'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Digital Receipt Modal */}
      {receipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Payment Successful</h3>
                  <p className="text-xs text-slate-500">{formatDateTime(receipt.createdAt)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border-t border-b border-slate-200 py-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Reference ID</span>
                <span className="font-mono font-semibold text-slate-900">{receipt.referenceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Service</span>
                <span className="font-medium text-slate-900">{receipt.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Operator</span>
                <span className="font-medium text-slate-900">{receipt.operatorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Account / Number</span>
                <span className="font-mono text-slate-900">{receipt.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {formatMoney(receipt.amount, currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Commission Credited</span>
                <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                  +{formatMoney(receipt.commissionEarned, currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cashback Credited</span>
                <span className="font-mono font-semibold text-blue-700 tabular-nums">
                  +{formatMoney(receipt.cashbackEarned, currency)}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 px-4 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="flex-1 py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
