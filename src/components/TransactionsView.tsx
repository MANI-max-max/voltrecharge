import { useEffect, useMemo, useState } from 'react';
import { Download, Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest, formatDateTime, formatMoney } from '../lib/api';
import { TransactionItem } from '../types';

interface TransactionsViewProps {
  onRequireAuth?: (promptMessage?: string) => void;
}

export function TransactionsView({ onRequireAuth }: TransactionsViewProps) {
  const { token, bootstrap } = useAuth();
  const currency = bootstrap.settings.currency_symbol || '₹';

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTxn, setSelectedTxn] = useState<TransactionItem | null>(null);

  useEffect(() => {
    if (!token) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    apiRequest<{ transactions: TransactionItem[] }>('/api/transactions', { token })
      .then((res) => setTransactions(res.transactions))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        t.referenceId.toLowerCase().includes(q) ||
        (t.serviceName || '').toLowerCase().includes(q) ||
        (t.operatorName || '').toLowerCase().includes(q) ||
        (t.accountNumber || '').toLowerCase().includes(q)
      );
    });
  }, [transactions, search, typeFilter, statusFilter]);

  const handleExportCsv = () => {
    const headers = [
      'Reference ID',
      'Date',
      'Type',
      'Service',
      'Operator',
      'Account Number',
      'Amount',
      'Commission',
      'Cashback',
      'Status',
    ];
    const rows = filtered.map((t) => [
      t.referenceId,
      t.createdAt,
      t.type,
      t.serviceName || '',
      t.operatorName || '',
      t.accountNumber || '',
      t.amount.toFixed(2),
      t.commissionEarned.toFixed(2),
      t.cashbackEarned.toFixed(2),
      t.status,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voltpay-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Transaction History</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete audit ledger of recharges, bill payments, wallet deposits, commissions, and referrals
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={filtered.length === 0}
          className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference ID, operator, or account number..."
            className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {[
              { id: 'all', label: 'All' },
              { id: 'recharge', label: 'Recharges' },
              { id: 'bill_payment', label: 'Bills' },
              { id: 'add_money', label: 'Add Money' },
              { id: 'referral_bonus', label: 'Referrals' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  typeFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {!token ? (
        <div className="py-10 px-4 text-center space-y-3 border border-slate-200 rounded-xl bg-slate-50">
          <p className="text-sm font-semibold text-slate-900">
            Sign in to view your transaction history
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Browse all recharge and utility services first. Sign in or create an account whenever you are ready to view your personal payment ledger and receipts.
          </p>
          {onRequireAuth && (
            <button
              type="button"
              onClick={() =>
                onRequireAuth('Sign in or create an account to view your transaction history.')
              }
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Sign In / Create Account
            </button>
          )}
        </div>
      ) : loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading transaction ledger...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500">
          No transactions match your current filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="py-2.5 pr-4">Reference ID</th>
                <th className="py-2.5 pr-4">Date &amp; Time</th>
                <th className="py-2.5 pr-4">Service / Type</th>
                <th className="py-2.5 pr-4">Account / Subscriber</th>
                <th className="py-2.5 pr-4 text-right">Amount</th>
                <th className="py-2.5 pr-4 text-right">Commission</th>
                <th className="py-2.5 pr-4 text-right">Cashback</th>
                <th className="py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.map((tx) => (
                <tr
                  key={tx.id}
                  onClick={() => setSelectedTxn(tx)}
                  className="hover:bg-slate-50 cursor-pointer"
                >
                  <td className="py-3 pr-4 font-mono text-xs font-medium text-blue-700">
                    {tx.referenceId}
                  </td>
                  <td className="py-3 pr-4 text-xs text-slate-500 whitespace-nowrap">
                    {formatDateTime(tx.createdAt)}
                  </td>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-slate-900">{tx.serviceName || tx.type}</p>
                    <p className="text-xs text-slate-500">{tx.operatorName || tx.paymentMethod}</p>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-slate-600">
                    {tx.accountNumber || '-'}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono font-semibold tabular-nums text-slate-900">
                    {formatMoney(tx.amount, currency)}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-xs tabular-nums text-emerald-700">
                    {tx.commissionEarned > 0 ? `+${formatMoney(tx.commissionEarned, currency)}` : '—'}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-xs tabular-nums text-blue-700">
                    {tx.cashbackEarned > 0 ? `+${formatMoney(tx.cashbackEarned, currency)}` : '—'}
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

      {selectedTxn && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Transaction Details</h3>
              <button
                type="button"
                onClick={() => setSelectedTxn(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="border-t border-b border-slate-200 py-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Reference ID</span>
                <span className="font-mono font-semibold text-slate-900">{selectedTxn.referenceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="text-slate-900">{formatDateTime(selectedTxn.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Service</span>
                <span className="text-slate-900 font-medium">{selectedTxn.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Operator / Channel</span>
                <span className="text-slate-900">{selectedTxn.operatorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Account / Number</span>
                <span className="font-mono text-slate-900">{selectedTxn.accountNumber || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {formatMoney(selectedTxn.amount, currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Commission</span>
                <span className="font-mono text-emerald-700 tabular-nums">
                  +{formatMoney(selectedTxn.commissionEarned, currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cashback</span>
                <span className="font-mono text-blue-700 tabular-nums">
                  +{formatMoney(selectedTxn.cashbackEarned, currency)}
                </span>
              </div>
              {selectedTxn.promoCode && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Promo Code</span>
                  <span className="font-mono font-semibold text-slate-900">{selectedTxn.promoCode}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="font-semibold capitalize text-slate-900">{selectedTxn.status}</span>
              </div>
              {selectedTxn.notes && (
                <div className="pt-2">
                  <p className="text-xs text-slate-500">Notes</p>
                  <p className="text-xs text-slate-800 mt-0.5">{selectedTxn.notes}</p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedTxn(null)}
              className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
