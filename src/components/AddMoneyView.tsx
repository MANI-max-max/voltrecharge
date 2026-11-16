import React, { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest, formatDateTime, formatMoney } from '../lib/api';
import { TransactionItem } from '../types';

interface AddMoneyViewProps {
  onRequireAuth?: (promptMessage?: string) => void;
}

export function AddMoneyView({ onRequireAuth }: AddMoneyViewProps) {
  const { user, token, bootstrap, setUser } = useAuth();
  const currency = bootstrap.settings.currency_symbol || '₹';
  const minAdd = Number(bootstrap.settings.min_add_money || '10');
  const maxAdd = Number(bootstrap.settings.max_add_money || '50000');

  const [amount, setAmount] = useState('100');
  const [paymentMethod, setPaymentMethod] = useState('Instant UPI');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deposits, setDeposits] = useState<TransactionItem[]>([]);

  const loadDeposits = async () => {
    if (!token) return;
    try {
      const res = await apiRequest<{ transactions: TransactionItem[] }>('/api/transactions', {
        token,
      });
      setDeposits(res.transactions.filter((t) => t.type === 'add_money'));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadDeposits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleAddMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      onRequireAuth?.('Sign in or create an account to add money to your wallet.');
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await apiRequest<{ user: any; transaction: TransactionItem }>(
        '/api/wallet/add-money',
        {
          method: 'POST',
          token,
          body: {
            amount: Number(amount),
            paymentMethod,
            notes,
          },
        }
      );
      setUser(res.user);
      setSuccessMsg(
        `Added ${formatMoney(res.transaction.amount, currency)} to your wallet (Ref: ${res.transaction.referenceId}).`
      );
      setNotes('');
      await loadDeposits();
    } catch (err: any) {
      setError(err.message || 'Failed to add money');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-700 text-white flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add Money to Wallet</h2>
              <p className="text-xs text-slate-500">
                Limits: {formatMoney(minAdd, currency)} – {formatMoney(maxAdd, currency)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Current Balance</p>
            <p className="text-base font-bold font-mono tabular-nums text-slate-900">
              {formatMoney(user?.walletBalance || 0, currency)}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleAddMoney} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Top-Up Amount ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              min={minAdd}
              max={maxAdd}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 text-base font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[50, 100, 250, 500, 1000, 2500].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(String(val))}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md border cursor-pointer transition-colors ${
                  Number(amount) === val
                    ? 'border-blue-700 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                +{currency}{val}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {['Instant UPI', 'Debit / Credit Card', 'Net Banking', 'Bank Wire Transfer'].map(
                (method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`p-3 rounded-lg border text-left text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                      paymentMethod === method
                        ? 'border-blue-700 bg-blue-50 text-blue-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 shrink-0" />
                    <span className="truncate">{method}</span>
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Payment Reference / Note (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Monthly wallet funding"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-60"
          >
            {submitting
              ? 'Crediting Wallet...'
              : `Add ${formatMoney(Number(amount) || 0, currency)} Now`}
          </button>
        </form>
      </div>

      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">Wallet Deposit History</h3>
          <span className="text-xs text-slate-500 tabular-nums">{deposits.length} deposits</span>
        </div>

        {deposits.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No wallet deposits yet. Use the form on the left to add funds instantly.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-2.5 pr-4">Reference</th>
                  <th className="py-2.5 pr-4">Method</th>
                  <th className="py-2.5 pr-4">Date</th>
                  <th className="py-2.5 pr-4 text-right">Amount</th>
                  <th className="py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {deposits.map((dep) => (
                  <tr key={dep.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 font-mono text-xs text-slate-700">{dep.referenceId}</td>
                    <td className="py-3 pr-4 text-slate-900 font-medium">{dep.paymentMethod}</td>
                    <td className="py-3 pr-4 text-xs text-slate-500">{formatDateTime(dep.createdAt)}</td>
                    <td className="py-3 pr-4 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                      +{formatMoney(dep.amount, currency)}
                    </td>
                    <td className="py-3 text-right text-xs font-semibold text-emerald-700 capitalize">
                      {dep.status}
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
