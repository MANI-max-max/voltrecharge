import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  CheckCheck,
  FileCheck2,
  Gift,
  History,
  Landmark,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  Percent,
  PlusCircle,
  Settings,
  Share2,
  Smartphone,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { RechargeWorkspace } from './components/RechargeWorkspace';
import { AddMoneyView } from './components/AddMoneyView';
import { TransactionsView } from './components/TransactionsView';
import { CommissionsView } from './components/CommissionsView';
import { OffersView } from './components/OffersView';
import { KycView } from './components/KycView';
import { ReferEarnView } from './components/ReferEarnView';
import { SupportChannelView } from './components/SupportChannelView';
import { AdminConsoleView } from './components/AdminConsoleView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { apiRequest, formatDateTime, formatMoney } from './lib/api';
import { NotificationItem } from './types';

type WorkspaceTab =
  | 'dashboard'
  | 'add-money'
  | 'transactions'
  | 'commissions'
  | 'offers'
  | 'kyc'
  | 'refer-earn'
  | 'support'
  | 'admin';

function MainShell() {
  const { user, token, loading, bootstrap, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedServiceSlug, setSelectedServiceSlug] = useState<string>('mobile');
  const [isServiceDetailOpen, setIsServiceDetailOpen] = useState<boolean>(false);
  const [preselectedPromo, setPreselectedPromo] = useState<string | undefined>(undefined);
  const [authModal, setAuthModal] = useState<{
    open: boolean;
    mode: 'login' | 'signup';
    promptMessage?: string;
  }>({ open: false, mode: 'login' });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement | null>(null);

  const openAuthModal = useCallback((promptMessage?: string, mode: 'login' | 'signup' = 'login') => {
    setAuthModal({ open: true, mode, promptMessage });
  }, []);

  useEffect(() => {
    if (user) {
      setAuthModal((prev) => (prev.open ? { ...prev, open: false } : prev));
    }
  }, [user]);

  const loadNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiRequest<{ notifications: NotificationItem[]; unreadCount: number }>(
        '/api/notifications',
        { token }
      );
      setNotificationsList(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      // ignore transient notification load errors
    }
  }, [token]);

  useEffect(() => {
    if (user && token) {
      loadNotifications();
    } else {
      setNotificationsList([]);
      setUnreadCount(0);
    }
  }, [user, token, user?.walletBalance, user?.kycStatus, activeTab, loadNotifications]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationsOpen]);

  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      await apiRequest('/api/notifications/read-all', { method: 'POST', token });
      setNotificationsList((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.isRead && token) {
      setNotificationsList((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      apiRequest(`/api/notifications/${item.id}/read`, { method: 'POST', token }).catch(() => {});
    }
    const allowedTabs: WorkspaceTab[] = [
      'dashboard',
      'add-money',
      'transactions',
      'commissions',
      'offers',
      'kyc',
      'refer-earn',
      'support',
      'admin',
    ];
    if (allowedTabs.includes(item.targetTab as WorkspaceTab)) {
      setActiveTab(item.targetTab as WorkspaceTab);
      if (item.targetTab === 'dashboard') {
        setIsServiceDetailOpen(false);
      }
    }
    setNotificationsOpen(false);
  };

  if (loading && bootstrap.services.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm font-medium text-slate-600">Loading workspace...</p>
      </div>
    );
  }

  const brandName = bootstrap.settings.brand_name || 'VoltPay';
  const currency = bootstrap.settings.currency_symbol || '₹';

  const navItems: Array<{ id: WorkspaceTab; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'dashboard', label: 'Recharge & Bills', icon: LayoutDashboard },
    { id: 'add-money', label: 'Add Money', icon: PlusCircle },
    { id: 'transactions', label: 'Transaction History', icon: History },
    { id: 'commissions', label: 'Commissions', icon: Percent },
    { id: 'offers', label: 'Cashback Offers', icon: Gift },
    { id: 'kyc', label: 'KYC Verification', icon: FileCheck2 },
    { id: 'refer-earn', label: 'Refer & Earn', icon: Share2 },
    { id: 'support', label: 'WhatsApp & Channel', icon: MessageCircle },
  ];

  if (user?.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Admin Console', icon: Settings });
  }

  const activeNav = navItems.find((n) => n.id === activeTab) || navItems[0];

  const handleApplyOffer = (serviceSlug: string, promoCode: string) => {
    setSelectedServiceSlug(serviceSlug);
    setPreselectedPromo(promoCode);
    setIsServiceDetailOpen(true);
    setActiveTab('dashboard');
  };

  const handleMobileQuickService = (slug: string) => {
    setSelectedServiceSlug(slug);
    setIsServiceDetailOpen(true);
    setActiveTab('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-white border-r border-slate-200 min-h-screen sticky top-0 h-screen">
        <div className="px-6 py-5 border-b border-slate-200">
          <span className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap">
            {brandName}
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id === 'dashboard') {
                    setIsServiceDetailOpen(false);
                  }
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-blue-50 text-blue-800 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-700' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-2.5">
          {user ? (
            <div className="px-2">
              <p className="text-xs font-semibold text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">
                {user.email} · <span className="capitalize">{user.role}</span>
              </p>
            </div>
          ) : (
            <div className="px-2">
              <p className="text-xs font-semibold text-slate-900">Guest Browsing</p>
              <p className="text-xs text-slate-500">Sign in when ready to pay</p>
            </div>
          )}
          <PWAInstallButton variant="sidebar" />
          {user ? (
            <button
              type="button"
              onClick={signOut}
              className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal('Sign in or create an account to manage your wallet and payments.')}
              className="w-full px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Sign Up</span>
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative z-10 w-64 bg-white h-full flex flex-col border-r border-slate-200">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <span className="text-lg font-bold text-slate-900">{brandName}</span>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-1">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      if (item.id === 'dashboard') {
                        setIsServiceDetailOpen(false);
                      }
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium cursor-pointer ${
                      active ? 'bg-blue-50 text-blue-800 font-semibold' : 'text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200 space-y-2.5">
              <PWAInstallButton variant="sidebar" />
              {user ? (
                <button
                  type="button"
                  onClick={signOut}
                  className="w-full py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal('Sign in or create an account to manage your wallet and payments.');
                  }}
                  className="w-full py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In / Sign Up
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-600 shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
              {activeNav.label}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
            {user && (
              <div className="text-right">
                <p className="text-[11px] sm:text-xs text-slate-500 leading-none">Wallet</p>
                <p className="text-xs sm:text-sm font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                  {formatMoney(user.walletBalance, currency)}
                </p>
              </div>
            )}
            <PWAInstallButton variant="header" />

            {user ? (
              <button
                type="button"
                onClick={() => setActiveTab('add-money')}
                className="hidden sm:inline-flex px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Add Money
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal('Sign in or create an account to recharge or pay utility bills.')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            {/* Top-Right Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                aria-label="Notifications"
                onClick={() => {
                  if (!user) {
                    openAuthModal('Sign in to view your wallet and transaction notifications.');
                    return;
                  }
                  const next = !notificationsOpen;
                  setNotificationsOpen(next);
                  if (next) loadNotifications();
                }}
                className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center relative cursor-pointer transition-colors"
              >
                <Bell className="w-4 h-4" />
                {user && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-700 text-white text-[10px] font-bold font-mono tabular-nums flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="fixed sm:absolute right-3 sm:right-0 top-16 sm:top-11 w-[calc(100vw-24px)] sm:w-96 max-h-[75vh] bg-white border border-slate-200 rounded-xl shadow-xl z-50 flex flex-col overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="text-[11px] font-mono font-semibold text-blue-700">
                          ({unreadCount} unread)
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>

                  <div className="overflow-y-auto divide-y divide-slate-100">
                    {notificationsList.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500">
                        You have no notifications yet.
                      </div>
                    ) : (
                      notificationsList.map((n) => {
                        const Icon =
                          n.category === 'wallet'
                            ? Wallet
                            : n.category === 'offer'
                            ? Gift
                            : n.category === 'kyc'
                            ? FileCheck2
                            : Zap;
                        return (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => handleNotificationClick(n)}
                            className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3 cursor-pointer ${
                              !n.isRead ? 'bg-blue-50/40' : 'bg-white'
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                !n.isRead
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {n.title}
                                </p>
                                {!n.isRead && (
                                  <span className="w-2 h-2 rounded-full bg-blue-700 shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                                {n.message}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-1">
                                {formatDateTime(n.createdAt)}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-6 max-w-7xl w-full min-w-0 mx-auto">
          {activeTab === 'dashboard' && (
            <RechargeWorkspace
              preselectedServiceSlug={selectedServiceSlug}
              preselectedPromoCode={preselectedPromo}
              isDetailOpen={isServiceDetailOpen}
              onOpenService={(slug) => {
                setSelectedServiceSlug(slug);
                setIsServiceDetailOpen(true);
              }}
              onCloseService={() => setIsServiceDetailOpen(false)}
              onNavigate={(tab) => setActiveTab(tab as WorkspaceTab)}
              onRequireAuth={(msg) => openAuthModal(msg)}
            />
          )}
          {activeTab === 'add-money' && <AddMoneyView onRequireAuth={(msg) => openAuthModal(msg)} />}
          {activeTab === 'transactions' && <TransactionsView onRequireAuth={(msg) => openAuthModal(msg)} />}
          {activeTab === 'commissions' && <CommissionsView />}
          {activeTab === 'offers' && <OffersView onApplyOffer={handleApplyOffer} />}
          {activeTab === 'kyc' && <KycView onRequireAuth={(msg) => openAuthModal(msg)} />}
          {activeTab === 'refer-earn' && <ReferEarnView onRequireAuth={(msg) => openAuthModal(msg)} />}
          {activeTab === 'support' && <SupportChannelView />}
          {activeTab === 'admin' && user?.role === 'admin' && <AdminConsoleView />}
        </main>
      </div>

      {/* Fixed Bottom Mobile Menu (Add Money, Mobile Recharge, Electric Bill, Loan) */}
      <nav
        aria-label="Mobile quick navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 grid grid-cols-4 h-16"
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab('add-money');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center gap-1 px-1 min-h-[44px] cursor-pointer transition-colors ${
            activeTab === 'add-money'
              ? 'text-blue-700 font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <PlusCircle className="w-5 h-5 shrink-0" />
          <span className="text-[11px] leading-none whitespace-nowrap">Add Money</span>
        </button>

        <button
          type="button"
          onClick={() => handleMobileQuickService('mobile')}
          className={`flex flex-col items-center justify-center gap-1 px-1 min-h-[44px] cursor-pointer transition-colors ${
            activeTab === 'dashboard' && selectedServiceSlug === 'mobile'
              ? 'text-blue-700 font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Smartphone className="w-5 h-5 shrink-0" />
          <span className="text-[11px] leading-none whitespace-nowrap">Mobile</span>
        </button>

        <button
          type="button"
          onClick={() => handleMobileQuickService('electricity')}
          className={`flex flex-col items-center justify-center gap-1 px-1 min-h-[44px] cursor-pointer transition-colors ${
            activeTab === 'dashboard' && selectedServiceSlug === 'electricity'
              ? 'text-blue-700 font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Zap className="w-5 h-5 shrink-0" />
          <span className="text-[11px] leading-none whitespace-nowrap">Electric Bill</span>
        </button>

        <button
          type="button"
          onClick={() => handleMobileQuickService('loan')}
          className={`flex flex-col items-center justify-center gap-1 px-1 min-h-[44px] cursor-pointer transition-colors ${
            activeTab === 'dashboard' && selectedServiceSlug === 'loan'
              ? 'text-blue-700 font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Landmark className="w-5 h-5 shrink-0" />
          <span className="text-[11px] leading-none whitespace-nowrap">Loan</span>
        </button>
      </nav>

      <OfflineIndicator />

      {!user && authModal.open && (
        <AuthScreen
          isModal
          initialMode={authModal.mode}
          promptMessage={authModal.promptMessage}
          onClose={() => setAuthModal((prev) => ({ ...prev, open: false }))}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainShell />
    </AuthProvider>
  );
}
