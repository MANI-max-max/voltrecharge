import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Edit3,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest, formatDateTime, formatMoney } from '../lib/api';
import {
  CashbackOffer,
  KycSubmission,
  OfferBanner,
  OperatorItem,
  PlatformSetting,
  ServiceItem,
  TransactionItem,
  UserProfile,
} from '../types';
import { OperatorBadge } from './OperatorBadge';

type AdminSubTab =
  | 'services'
  | 'banners'
  | 'operators'
  | 'offers'
  | 'settings'
  | 'kyc'
  | 'users'
  | 'transactions';

interface AdminOverviewData {
  services: ServiceItem[];
  operators: OperatorItem[];
  offers: CashbackOffer[];
  banners: OfferBanner[];
  settings: PlatformSetting[];
  users: UserProfile[];
  kycSubmissions: KycSubmission[];
  transactions: TransactionItem[];
}

export function AdminConsoleView() {
  const { token, bootstrap, refreshBootstrap, refreshMe } = useAuth();
  const currency = bootstrap.settings.currency_symbol || '₹';

  const [subTab, setSubTab] = useState<AdminSubTab>('services');
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Service Form State
  const [editingService, setEditingService] = useState<Partial<ServiceItem> | null>(null);
  // Offer Banner Form State
  const [editingBanner, setEditingBanner] = useState<Partial<OfferBanner> | null>(null);
  // Operator Form State
  const [editingOperator, setEditingOperator] = useState<Partial<OperatorItem> | null>(null);
  const [operatorSearch, setOperatorSearch] = useState('');
  // Offer Form State
  const [editingOffer, setEditingOffer] = useState<Partial<CashbackOffer> | null>(null);
  // Settings Form State
  const [settingsDraft, setSettingsDraft] = useState<Record<string, string>>({});
  // KYC Review State
  const [kycRemarks, setKycRemarks] = useState<Record<number, string>>({});
  // User Edit State
  const [editingUser, setEditingUser] = useState<{
    user: UserProfile;
    role: 'admin' | 'user';
    status: 'active' | 'suspended';
    walletAdjustment: string;
    adjustmentNote: string;
  } | null>(null);

  const loadOverview = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiRequest<AdminOverviewData>('/api/admin/overview', { token });
      setData(res);
      const map: Record<string, string> = {};
      for (const s of res.settings) {
        map[s.key] = s.value;
      }
      setSettingsDraft(map);
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message || 'Failed to load admin console' });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const notify = (type: 'success' | 'error', text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 4000);
  };

  // --- Services Handlers ---
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingService) return;
    try {
      if (editingService.id) {
        await apiRequest(`/api/admin/services/${editingService.id}`, {
          method: 'PUT',
          token,
          body: editingService,
        });
        notify('success', 'Service updated successfully.');
      } else {
        await apiRequest('/api/admin/services', {
          method: 'POST',
          token,
          body: editingService,
        });
        notify('success', 'New service added.');
      }
      setEditingService(null);
      await Promise.all([loadOverview(), refreshBootstrap()]);
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleDeleteService = async (id: number) => {
    if (!token) return;
    try {
      await apiRequest(`/api/admin/services/${id}`, { method: 'DELETE', token });
      notify('success', 'Service deleted.');
      await Promise.all([loadOverview(), refreshBootstrap()]);
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  // --- Operators Handlers ---
  const handleSaveOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingOperator) return;
    try {
      if (editingOperator.id) {
        await apiRequest(`/api/admin/operators/${editingOperator.id}`, {
          method: 'PUT',
          token,
          body: editingOperator,
        });
        notify('success', 'Operator & commission rate updated.');
      } else {
        await apiRequest('/api/admin/operators', {
          method: 'POST',
          token,
          body: editingOperator,
        });
        notify('success', 'New operator added.');
      }
      setEditingOperator(null);
      await Promise.all([loadOverview(), refreshBootstrap()]);
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleDeleteOperator = async (id: number) => {
    if (!token) return;
    try {
      await apiRequest(`/api/admin/operators/${id}`, { method: 'DELETE', token });
      notify('success', 'Operator deleted.');
      await Promise.all([loadOverview(), refreshBootstrap()]);
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  // --- Offers Handlers ---
  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingOffer) return;
    try {
      if (editingOffer.id) {
        await apiRequest(`/api/admin/offers/${editingOffer.id}`, {
          method: 'PUT',
          token,
          body: editingOffer,
        });
        notify('success', 'Cashback offer updated.');
      } else {
        await apiRequest('/api/admin/offers', {
          method: 'POST',
          token,
          body: editingOffer,
        });
        notify('success', 'New cashback offer created.');
      }
      setEditingOffer(null);
      await Promise.all([loadOverview(), refreshBootstrap()]);
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleDeleteOffer = async (id: number) => {
    if (!token) return;
    try {
      await apiRequest(`/api/admin/offers/${id}`, { method: 'DELETE', token });
      notify('success', 'Cashback offer deleted.');
      await Promise.all([loadOverview(), refreshBootstrap()]);
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  // --- Offer Banners Handlers ---
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingBanner) return;
    try {
      if (editingBanner.id) {
        await apiRequest(`/api/admin/banners/${editingBanner.id}`, {
          method: 'PUT',
          token,
          body: editingBanner,
        });
        notify('success', 'Offer banner updated.');
      } else {
        await apiRequest('/api/admin/banners', {
          method: 'POST',
          token,
          body: editingBanner,
        });
        notify('success', 'New offer banner added.');
      }
      setEditingBanner(null);
      await Promise.all([loadOverview(), refreshBootstrap()]);
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleDeleteBanner = async (id: number) => {
    if (!token) return;
    try {
      await apiRequest(`/api/admin/banners/${id}`, { method: 'DELETE', token });
      notify('success', 'Offer banner deleted.');
      await Promise.all([loadOverview(), refreshBootstrap()]);
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleBannerImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingBanner) return;
    if (file.size > 2 * 1024 * 1024) {
      notify('error', 'Banner image must be smaller than 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditingBanner((prev) => (prev ? { ...prev, imageUrl: reader.result as string } : prev));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOperatorLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingOperator) return;
    if (file.size > 1 * 1024 * 1024) {
      notify('error', 'Operator logo must be smaller than 1 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditingOperator((prev) => (prev ? { ...prev, logoUrl: reader.result as string } : prev));
      }
    };
    reader.readAsDataURL(file);
  };

  // --- Settings Handler ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !data) return;
    try {
      const payload = Object.entries(settingsDraft).map(([key, value]) => ({
        key,
        value,
      }));
      await apiRequest('/api/admin/settings', {
        method: 'PUT',
        token,
        body: { settings: payload },
      });
      notify('success', 'Platform & WhatsApp settings saved.');
      await Promise.all([loadOverview(), refreshBootstrap()]);
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  // --- KYC Handler ---
  const handleReviewKyc = async (id: number, status: 'verified' | 'rejected') => {
    if (!token) return;
    try {
      await apiRequest(`/api/admin/kyc/${id}`, {
        method: 'PUT',
        token,
        body: {
          status,
          adminRemarks: kycRemarks[id] || (status === 'verified' ? 'Approved by Administrator' : 'Rejected by Administrator'),
        },
      });
      notify('success', `KYC submission marked as ${status}.`);
      await Promise.all([loadOverview(), refreshMe()]);
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  // --- User Update Handler ---
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingUser) return;
    try {
      await apiRequest(`/api/admin/users/${editingUser.user.id}`, {
        method: 'PUT',
        token,
        body: {
          role: editingUser.role,
          status: editingUser.status,
          walletAdjustment: Number(editingUser.walletAdjustment || 0),
          adjustmentNote: editingUser.adjustmentNote,
        },
      });
      notify('success', 'User account & wallet updated.');
      setEditingUser(null);
      await Promise.all([loadOverview(), refreshMe()]);
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  // --- Transaction Status Handler ---
  const handleUpdateTransactionStatus = async (id: number, status: 'success' | 'pending' | 'failed') => {
    if (!token) return;
    try {
      await apiRequest(`/api/admin/transactions/${id}`, {
        method: 'PUT',
        token,
        body: { status },
      });
      notify('success', `Transaction #${id} updated to ${status}.`);
      await loadOverview();
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  if (loading && !data) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-500">
        Loading Administrator Console...
      </div>
    );
  }

  const totalVolume = (data?.transactions || [])
    .filter((t) => t.status === 'success')
    .reduce((sum, t) => sum + t.amount, 0);
  const pendingKycCount = (data?.kycSubmissions || []).filter((k) => k.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Top Admin Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Registered Users</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {data?.users.length || 0}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Total Transaction Volume</p>
          <p className="mt-2 text-2xl font-bold text-blue-700 font-mono tabular-nums">
            {formatMoney(totalVolume, currency)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Active Operators &amp; Offers</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {data?.operators.length || 0} / {data?.offers.length || 0}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Pending KYC Reviews</p>
          <p className="mt-2 text-2xl font-bold text-amber-700 font-mono tabular-nums">
            {pendingKycCount}
          </p>
        </div>
      </div>

      {banner && (
        <div
          className={`p-3.5 rounded-lg border text-sm font-medium ${
            banner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* Sub-navigation tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 flex flex-wrap gap-1">
        {(
          [
            { id: 'services', label: 'Services' },
            { id: 'banners', label: 'Offer Banners' },
            { id: 'operators', label: 'Operators & Commissions' },
            { id: 'offers', label: 'Cashback Offers' },
            { id: 'settings', label: 'WhatsApp & Settings' },
            { id: 'kyc', label: `KYC Queue (${pendingKycCount})` },
            { id: 'users', label: 'Users & Wallets' },
            { id: 'transactions', label: 'All Transactions' },
          ] as Array<{ id: AdminSubTab; label: string }>
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              subTab === tab.id
                ? 'bg-blue-700 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. SERVICES MANAGEMENT */}
      {subTab === 'services' && data && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Manage Recharge &amp; Utility Services</h3>
              <p className="text-xs text-slate-500">Add new categories or edit labels, descriptions, and active status</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setEditingService({
                  slug: '',
                  name: '',
                  description: '',
                  iconName: 'Zap',
                  identifierLabel: 'Account Number',
                  identifierPlaceholder: 'Enter account number',
                  isActive: true,
                  sortOrder: data.services.length + 1,
                })
              }
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Service
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-2.5 pr-4">Order</th>
                  <th className="py-2.5 pr-4">Service Name</th>
                  <th className="py-2.5 pr-4">Slug</th>
                  <th className="py-2.5 pr-4">Input Label</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {data.services.map((svc) => (
                  <tr key={svc.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 font-mono text-xs text-slate-500">{svc.sortOrder}</td>
                    <td className="py-3 pr-4 font-semibold text-slate-900">{svc.name}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-slate-600">{svc.slug}</td>
                    <td className="py-3 pr-4 text-xs text-slate-600">{svc.identifierLabel}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-semibold ${svc.isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {svc.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setEditingService(svc)}
                        className="p-1.5 text-slate-600 hover:text-blue-700 cursor-pointer"
                        title="Edit Service"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteService(svc.id)}
                        className="p-1.5 text-slate-500 hover:text-red-700 cursor-pointer"
                        title="Delete Service"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. OPERATORS & COMMISSIONS */}
      {subTab === 'operators' && data && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Operators &amp; Commission Rates</h3>
              <p className="text-xs text-slate-500">Add or update providers, commission percentages, flat fees, and min/max limits</p>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={operatorSearch}
                  onChange={(e) => setOperatorSearch(e.target.value)}
                  placeholder="Search operators..."
                  className="pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 w-44 sm:w-56"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setEditingOperator({
                    serviceId: data.services[0]?.id || 1,
                    name: '',
                    code: '',
                    symbol: '',
                    logoUrl: '',
                    commissionRate: 2.0,
                    flatFee: 0,
                    minAmount: 10,
                    maxAmount: 50000,
                    accentColor: '#1D4ED8',
                    isActive: true,
                  })
                }
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add Operator
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-2.5 pr-4">Operator</th>
                  <th className="py-2.5 pr-4">Service</th>
                  <th className="py-2.5 pr-4">Code</th>
                  <th className="py-2.5 pr-4 text-right">Commission %</th>
                  <th className="py-2.5 pr-4 text-right">Flat Fee</th>
                  <th className="py-2.5 pr-4 text-right">Limits</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {data.operators
                  .filter((op) => {
                    const q = operatorSearch.trim().toLowerCase();
                    if (!q) return true;
                    const svcName = data.services.find((s) => s.id === op.serviceId)?.name || '';
                    return (
                      op.name.toLowerCase().includes(q) ||
                      op.code.toLowerCase().includes(q) ||
                      svcName.toLowerCase().includes(q)
                    );
                  })
                  .map((op) => {
                  const svc = data.services.find((s) => s.id === op.serviceId);
                  return (
                    <tr key={op.id} className="hover:bg-slate-50">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <OperatorBadge
                            name={op.name}
                            symbol={op.symbol}
                            logoUrl={op.logoUrl}
                            accentColor={op.accentColor}
                            size="sm"
                          />
                          <span className="font-semibold text-slate-900">{op.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-600">{svc?.name || op.serviceId}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-slate-600">{op.code}</td>
                      <td className="py-3 pr-4 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                        {op.commissionRate.toFixed(2)}%
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-xs text-slate-600 tabular-nums">
                        {formatMoney(op.flatFee, currency)}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-xs text-slate-600 tabular-nums">
                        {op.minAmount}–{op.maxAmount}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs font-semibold ${op.isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {op.isActive ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      <td className="py-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setEditingOperator(op)}
                          className="p-1.5 text-slate-600 hover:text-blue-700 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOperator(op.id)}
                          className="p-1.5 text-slate-500 hover:text-red-700 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. CASHBACK OFFERS */}
      {subTab === 'offers' && data && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Cashback Offers &amp; Promo Codes</h3>
              <p className="text-xs text-slate-500">Create, edit, enable, or remove cashback campaigns</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setEditingOffer({
                  title: '',
                  description: '',
                  promoCode: '',
                  serviceSlug: 'all',
                  discountType: 'percentage',
                  discountValue: 5,
                  maxCashback: 25,
                  minTransactionAmount: 20,
                  isActive: true,
                  expiresAt: '2026-12-31',
                })
              }
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Cashback Offer
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-2.5 pr-4">Promo Code</th>
                  <th className="py-2.5 pr-4">Offer Title</th>
                  <th className="py-2.5 pr-4">Service</th>
                  <th className="py-2.5 pr-4 text-right">Reward</th>
                  <th className="py-2.5 pr-4 text-right">Min / Max</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {data.offers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 font-mono font-bold text-blue-700">{offer.promoCode}</td>
                    <td className="py-3 pr-4 font-medium text-slate-900">{offer.title}</td>
                    <td className="py-3 pr-4 text-xs capitalize text-slate-600">{offer.serviceSlug}</td>
                    <td className="py-3 pr-4 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                      {offer.discountType === 'percentage'
                        ? `${offer.discountValue}%`
                        : formatMoney(offer.discountValue, currency)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-xs text-slate-600 tabular-nums">
                      {offer.minTransactionAmount} / {offer.maxCashback}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-semibold ${offer.isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {offer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setEditingOffer(offer)}
                        className="p-1.5 text-slate-600 hover:text-blue-700 cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteOffer(offer.id)}
                        className="p-1.5 text-slate-500 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 1B. OFFER BANNERS MANAGEMENT */}
      {subTab === 'banners' && data && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Manage 2cm Offer Banners</h3>
              <p className="text-xs text-slate-500">
                Add, edit, or upload promotional 2cm banners displayed above the Recharge section
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setEditingBanner({
                  title: '',
                  subtitle: '',
                  promoCode: '',
                  serviceSlug: 'mobile',
                  imageUrl: '',
                  accentColor: '#1D4ED8',
                  ctaLabel: 'Apply Offer',
                  isActive: true,
                  sortOrder: (data.banners?.length || 0) + 1,
                })
              }
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start"
            >
              <Plus className="w-4 h-4" />
              Add Offer Banner
            </button>
          </div>

          <div className="space-y-3">
            {(data.banners || []).length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">
                No offer banners added yet. Click Add Offer Banner above to create one.
              </p>
            ) : (
              (data.banners || []).map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-16 h-10 rounded-lg border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: b.accentColor || '#1D4ED8' }}
                    >
                      {b.imageUrl ? (
                        <img
                          src={b.imageUrl}
                          alt={b.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>2cm</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{b.title}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {b.subtitle || 'No subtitle'} · Code:{' '}
                        <span className="font-mono font-semibold text-slate-800">
                          {b.promoCode || 'None'}
                        </span>{' '}
                        · Service: {b.serviceSlug} ·{' '}
                        <span className={b.isActive ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                          {b.isActive ? 'Active' : 'Hidden'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingBanner(b)}
                      className="p-2 text-slate-600 hover:text-blue-700 cursor-pointer"
                      title="Edit Banner"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBanner(b.id)}
                      className="p-2 text-slate-500 hover:text-red-700 cursor-pointer"
                      title="Delete Banner"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. WHATSAPP & PLATFORM SETTINGS */}
      {subTab === 'settings' && data && (
        <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">WhatsApp, Referral &amp; Brand Configuration</h3>
              <p className="text-xs text-slate-500">
                Edit WhatsApp Support phone number, WhatsApp Channel link, currency symbol, and referral rewards
              </p>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Save className="w-4 h-4" />
              Save All Settings
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {data.settings.map((setting) => (
              <div key={setting.key} className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800">
                  {setting.label}
                </label>
                <input
                  type="text"
                  value={settingsDraft[setting.key] ?? ''}
                  onChange={(e) =>
                    setSettingsDraft((prev) => ({ ...prev, [setting.key]: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <p className="text-xs text-slate-500">{setting.description}</p>
              </div>
            ))}
          </div>
        </form>
      )}

      {/* 5. KYC QUEUE */}
      {subTab === 'kyc' && data && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">KYC Verification Queue</h3>
            <p className="text-xs text-slate-500">Inspect submitted user identity documents and approve or reject verification</p>
          </div>

          {data.kycSubmissions.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No KYC submissions yet.</p>
          ) : (
            <div className="space-y-4">
              {data.kycSubmissions.map((item) => (
                <div key={item.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {item.fullName} <span className="font-normal text-slate-500">({item.userEmail})</span>
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {item.documentType} · <span className="font-mono font-semibold">{item.documentNumber}</span> · DOB: {item.dateOfBirth}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Address: {item.address}, {item.city} {item.postalCode}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold capitalize ${
                        item.status === 'verified'
                          ? 'text-emerald-700'
                          : item.status === 'pending'
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-200">
                    <input
                      type="text"
                      value={kycRemarks[item.id] ?? item.adminRemarks ?? ''}
                      onChange={(e) =>
                        setKycRemarks((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      placeholder="Optional admin remarks..."
                      className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleReviewKyc(item.id, 'verified')}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve KYC
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewKyc(item.id, 'rejected')}
                      className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. USERS & WALLETS */}
      {subTab === 'users' && data && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">User Accounts &amp; Wallet Balances</h3>
            <p className="text-xs text-slate-500">Manage user roles, account statuses, and manual wallet credits/debits</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-2.5 pr-4">User</th>
                  <th className="py-2.5 pr-4">Role</th>
                  <th className="py-2.5 pr-4">KYC</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5 pr-4 text-right">Wallet Balance</th>
                  <th className="py-2.5 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {data.users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-slate-900">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="py-3 pr-4 text-xs font-semibold capitalize text-slate-700">{u.role}</td>
                    <td className="py-3 pr-4 text-xs capitalize text-slate-600">{u.kycStatus}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-semibold capitalize ${u.status === 'active' ? 'text-emerald-700' : 'text-red-700'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right font-mono font-bold tabular-nums text-slate-900">
                      {formatMoney(u.walletBalance, currency)}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingUser({
                            user: u,
                            role: u.role,
                            status: u.status,
                            walletAdjustment: '0',
                            adjustmentNote: '',
                          })
                        }
                        className="px-3 py-1.5 text-xs font-semibold text-blue-700 border border-blue-200 rounded-md hover:bg-blue-50 cursor-pointer"
                      >
                        Edit / Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. ALL TRANSACTIONS AUDIT */}
      {subTab === 'transactions' && data && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">Platform Transaction Audit</h3>
            <p className="text-xs text-slate-500">Monitor and update status of all user transactions across the platform</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-2.5 pr-4">Ref ID</th>
                  <th className="py-2.5 pr-4">User</th>
                  <th className="py-2.5 pr-4">Service</th>
                  <th className="py-2.5 pr-4">Date</th>
                  <th className="py-2.5 pr-4 text-right">Amount</th>
                  <th className="py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {data.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 font-mono text-xs text-blue-700">{tx.referenceId}</td>
                    <td className="py-3 pr-4">
                      <p className="text-xs font-semibold text-slate-900">{tx.userName}</p>
                      <p className="text-xs text-slate-500">{tx.userEmail}</p>
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-700">
                      {tx.serviceName} · {tx.operatorName}
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-500 whitespace-nowrap">
                      {formatDateTime(tx.createdAt)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono font-semibold tabular-nums text-slate-900">
                      {formatMoney(tx.amount, currency)}
                    </td>
                    <td className="py-3 text-right">
                      <select
                        value={tx.status}
                        onChange={(e) =>
                          handleUpdateTransactionStatus(
                            tx.id,
                            e.target.value as 'success' | 'pending' | 'failed'
                          )
                        }
                        className="px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded-md bg-white"
                      >
                        <option value="success">Success</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: EDIT / ADD SERVICE */}
      {editingService && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveService}
            className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingService.id ? 'Edit Service' : 'Add New Service'}
              </h3>
              <button type="button" onClick={() => setEditingService(null)} className="cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Service Name</label>
                <input
                  type="text"
                  required
                  value={editingService.name || ''}
                  onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Slug (unique)</label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingService.id)}
                  value={editingService.slug || ''}
                  onChange={(e) => setEditingService({ ...editingService, slug: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg disabled:bg-slate-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
              <input
                type="text"
                required
                value={editingService.description || ''}
                onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Label</label>
                <input
                  type="text"
                  required
                  value={editingService.identifierLabel || ''}
                  onChange={(e) =>
                    setEditingService({ ...editingService, identifierLabel: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Icon</label>
                <select
                  value={editingService.iconName || 'Zap'}
                  onChange={(e) => setEditingService({ ...editingService, iconName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {['Smartphone', 'Tv', 'Radio', 'Zap', 'Droplets', 'Wifi', 'Flame', 'ShieldCheck', 'Landmark', 'CreditCard'].map((icon) => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={editingService.sortOrder ?? 1}
                  onChange={(e) =>
                    setEditingService({ ...editingService, sortOrder: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-800 pt-5">
                <input
                  type="checkbox"
                  checked={editingService.isActive ?? true}
                  onChange={(e) => setEditingService({ ...editingService, isActive: e.target.checked })}
                />
                Service Active
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingService(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                Save Service
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EDIT / ADD OPERATOR */}
      {editingOperator && data && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveOperator}
            className="bg-white border border-slate-200 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingOperator.id ? 'Edit Operator & Commission' : 'Add Operator'}
              </h3>
              <button type="button" onClick={() => setEditingOperator(null)} className="cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <OperatorBadge
                name={editingOperator.name || 'Operator'}
                symbol={editingOperator.symbol}
                logoUrl={editingOperator.logoUrl}
                accentColor={editingOperator.accentColor || '#1D4ED8'}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {editingOperator.name || 'Operator Preview'}
                </p>
                <p className="text-[11px] text-slate-500">
                  Shows uploaded/URL logo first, or custom symbol &amp; badge color
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Service Category</label>
              <select
                value={editingOperator.serviceId || data.services[0]?.id}
                onChange={(e) =>
                  setEditingOperator({ ...editingOperator, serviceId: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {data.services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Operator Name</label>
                <input
                  type="text"
                  required
                  value={editingOperator.name || ''}
                  onChange={(e) => setEditingOperator({ ...editingOperator, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Operator Code</label>
                <input
                  type="text"
                  required
                  value={editingOperator.code || ''}
                  onChange={(e) => setEditingOperator({ ...editingOperator, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Symbol / Short Badge (Optional)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. AIR, JIO, ⚡"
                  value={editingOperator.symbol || ''}
                  onChange={(e) => setEditingOperator({ ...editingOperator, symbol: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Badge Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editingOperator.accentColor || '#1D4ED8'}
                    onChange={(e) =>
                      setEditingOperator({ ...editingOperator, accentColor: e.target.value })
                    }
                    className="h-9 w-12 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={editingOperator.accentColor || '#1D4ED8'}
                    onChange={(e) =>
                      setEditingOperator({ ...editingOperator, accentColor: e.target.value })
                    }
                    className="flex-1 px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Operator Logo URL or Upload (Optional)
              </label>
              <input
                type="text"
                placeholder="https://example.com/logo.png"
                value={editingOperator.logoUrl || ''}
                onChange={(e) => setEditingOperator({ ...editingOperator, logoUrl: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <div className="flex items-center justify-between gap-2 mt-2">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer">
                  <span>Upload Logo Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleOperatorLogoFile}
                    className="hidden"
                  />
                </label>
                {editingOperator.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setEditingOperator({ ...editingOperator, logoUrl: '' })}
                    className="text-xs font-medium text-red-600 hover:text-red-700 cursor-pointer"
                  >
                    Remove Logo
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editingOperator.commissionRate ?? 0}
                  onChange={(e) =>
                    setEditingOperator({ ...editingOperator, commissionRate: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Flat Bonus ({currency})</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingOperator.flatFee ?? 0}
                  onChange={(e) =>
                    setEditingOperator({ ...editingOperator, flatFee: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Min Amount</label>
                <input
                  type="number"
                  value={editingOperator.minAmount ?? 10}
                  onChange={(e) =>
                    setEditingOperator({ ...editingOperator, minAmount: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Max Amount</label>
                <input
                  type="number"
                  value={editingOperator.maxAmount ?? 50000}
                  onChange={(e) =>
                    setEditingOperator({ ...editingOperator, maxAmount: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={editingOperator.isActive ?? true}
                onChange={(e) => setEditingOperator({ ...editingOperator, isActive: e.target.checked })}
              />
              Operator Active
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingOperator(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                Save Operator
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EDIT / ADD CASHBACK OFFER */}
      {editingOffer && data && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveOffer}
            className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingOffer.id ? 'Edit Cashback Offer' : 'Create Cashback Offer'}
              </h3>
              <button type="button" onClick={() => setEditingOffer(null)} className="cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Offer Title</label>
                <input
                  type="text"
                  required
                  value={editingOffer.title || ''}
                  onChange={(e) => setEditingOffer({ ...editingOffer, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Promo Code</label>
                <input
                  type="text"
                  required
                  value={editingOffer.promoCode || ''}
                  onChange={(e) =>
                    setEditingOffer({ ...editingOffer, promoCode: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
              <input
                type="text"
                required
                value={editingOffer.description || ''}
                onChange={(e) => setEditingOffer({ ...editingOffer, description: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Applicable Service</label>
                <select
                  value={editingOffer.serviceSlug || 'all'}
                  onChange={(e) => setEditingOffer({ ...editingOffer, serviceSlug: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="all">All Services</option>
                  {data.services.map((s) => (
                    <option key={s.id} value={s.slug}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Discount Type</label>
                <select
                  value={editingOffer.discountType || 'percentage'}
                  onChange={(e) =>
                    setEditingOffer({
                      ...editingOffer,
                      discountType: e.target.value as 'percentage' | 'flat',
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat Amount ({currency})</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Value</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingOffer.discountValue ?? 5}
                  onChange={(e) =>
                    setEditingOffer({ ...editingOffer, discountValue: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Max Cashback</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingOffer.maxCashback ?? 25}
                  onChange={(e) =>
                    setEditingOffer({ ...editingOffer, maxCashback: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Min Order</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingOffer.minTransactionAmount ?? 10}
                  onChange={(e) =>
                    setEditingOffer({
                      ...editingOffer,
                      minTransactionAmount: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Expires At</label>
                <input
                  type="date"
                  value={editingOffer.expiresAt || '2026-12-31'}
                  onChange={(e) => setEditingOffer({ ...editingOffer, expiresAt: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-800 pt-5">
                <input
                  type="checkbox"
                  checked={editingOffer.isActive ?? true}
                  onChange={(e) => setEditingOffer({ ...editingOffer, isActive: e.target.checked })}
                />
                Offer Active
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingOffer(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                Save Offer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EDIT USER & ADJUST WALLET */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveUser}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Manage User Account</h3>
                <p className="text-xs text-slate-500">{editingUser.user.email}</p>
              </div>
              <button type="button" onClick={() => setEditingUser(null)} className="cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, role: e.target.value as 'admin' | 'user' })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
                <select
                  value={editingUser.status}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      status: e.target.value as 'active' | 'suspended',
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Wallet Balance Adjustment ({currency}) — positive to credit, negative to debit
              </label>
              <input
                type="number"
                step="0.01"
                value={editingUser.walletAdjustment}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, walletAdjustment: e.target.value })
                }
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adjustment Reason / Note
              </label>
              <input
                type="text"
                value={editingUser.adjustmentNote}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, adjustmentNote: e.target.value })
                }
                placeholder="e.g., Promotional wallet bonus"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                Update User
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EDIT / ADD OFFER BANNER */}
      {editingBanner && data && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveBanner}
            className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingBanner.id ? 'Edit 2cm Offer Banner' : 'Add 2cm Offer Banner'}
              </h3>
              <button type="button" onClick={() => setEditingBanner(null)} className="cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Banner Title</label>
              <input
                type="text"
                required
                value={editingBanner.title || ''}
                onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                placeholder="e.g., Flat ₹25 Cashback on Mobile Recharge"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subtitle</label>
              <input
                type="text"
                value={editingBanner.subtitle || ''}
                onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                placeholder="e.g., Valid on minimum ₹199 recharge using code MOBILE5"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Promo Code (Optional)</label>
                <input
                  type="text"
                  value={editingBanner.promoCode || ''}
                  onChange={(e) =>
                    setEditingBanner({ ...editingBanner, promoCode: e.target.value.toUpperCase() })
                  }
                  placeholder="MOBILE5"
                  className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Service</label>
                <select
                  value={editingBanner.serviceSlug || 'mobile'}
                  onChange={(e) => setEditingBanner({ ...editingBanner, serviceSlug: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {data.services.map((s) => (
                    <option key={s.id} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Button Label</label>
                <input
                  type="text"
                  value={editingBanner.ctaLabel || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, ctaLabel: e.target.value })}
                  placeholder="Apply Offer"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Background Color</label>
                <input
                  type="color"
                  value={editingBanner.accentColor || '#1D4ED8'}
                  onChange={(e) => setEditingBanner({ ...editingBanner, accentColor: e.target.value })}
                  className="w-full h-9 p-1 border border-slate-300 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Banner Image URL or Upload Image (Optional, recommended 1200x160)
              </label>
              <input
                type="text"
                value={editingBanner.imageUrl || ''}
                onChange={(e) => setEditingBanner({ ...editingBanner, imageUrl: e.target.value })}
                placeholder="Paste image URL or upload file below"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg mb-2"
              />
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerImageFile}
                  className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-300 file:text-xs file:font-semibold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
                />
                {editingBanner.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setEditingBanner({ ...editingBanner, imageUrl: '' })}
                    className="text-xs font-semibold text-red-600 hover:underline cursor-pointer whitespace-nowrap"
                  >
                    Remove Image
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Display Order</label>
                <input
                  type="number"
                  value={editingBanner.sortOrder ?? 1}
                  onChange={(e) =>
                    setEditingBanner({ ...editingBanner, sortOrder: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-800 pt-5">
                <input
                  type="checkbox"
                  checked={editingBanner.isActive ?? true}
                  onChange={(e) => setEditingBanner({ ...editingBanner, isActive: e.target.checked })}
                />
                Banner Active
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingBanner(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                Save Banner
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
