import { useMemo, useState } from 'react';
import { Percent } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../lib/api';
import { OperatorBadge } from './OperatorBadge';
import { ServiceIcon } from './ServiceIcon';

export function CommissionsView() {
  const { user, bootstrap } = useAuth();
  const currency = bootstrap.settings.currency_symbol || '₹';
  const [selectedServiceSlug, setSelectedServiceSlug] = useState<string>('all');

  const rows = useMemo(() => {
    const result: Array<{
      serviceName: string;
      serviceSlug: string;
      iconName: string;
      operatorName: string;
      operatorCode: string;
      symbol?: string;
      logoUrl?: string;
      accentColor?: string;
      commissionRate: number;
      flatFee: number;
      minAmount: number;
      maxAmount: number;
    }> = [];

    for (const svc of bootstrap.services) {
      if (selectedServiceSlug !== 'all' && svc.slug !== selectedServiceSlug) continue;
      for (const op of svc.operators || []) {
        result.push({
          serviceName: svc.name,
          serviceSlug: svc.slug,
          iconName: svc.iconName,
          operatorName: op.name,
          operatorCode: op.code,
          symbol: op.symbol,
          logoUrl: op.logoUrl,
          accentColor: op.accentColor,
          commissionRate: op.commissionRate,
          flatFee: op.flatFee,
          minAmount: op.minAmount,
          maxAmount: op.maxAmount,
        });
      }
    }
    return result;
  }, [bootstrap.services, selectedServiceSlug]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Lifetime Commission Earned</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700 font-mono tabular-nums">
            {formatMoney(user?.totalCommissionEarned || 0, currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Credited automatically to your wallet on every payment</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Active Commissionable Operators</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {rows.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Across {bootstrap.services.length} utility categories</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Highest Active Rate</p>
          <p className="mt-2 text-2xl font-bold text-blue-700 font-mono tabular-nums">
            {rows.length > 0 ? Math.max(...rows.map((r) => r.commissionRate)).toFixed(2) : '0.00'}%
          </p>
          <p className="mt-1 text-xs text-slate-500">Rates managed centrally by platform admin</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Commission Rate Schedule</h2>
              <p className="text-xs text-slate-500">
                Real-time commission percentages and flat bonuses earned per recharge or bill settlement
              </p>
            </div>
          </div>

          <select
            value={selectedServiceSlug}
            onChange={(e) => setSelectedServiceSlug(e.target.value)}
            className="px-3.5 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Service Categories</option>
            {bootstrap.services.map((s) => (
              <option key={s.id} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="py-2.5 pr-4">Service</th>
                <th className="py-2.5 pr-4">Operator</th>
                <th className="py-2.5 pr-4">Code</th>
                <th className="py-2.5 pr-4 text-right">Commission Rate</th>
                <th className="py-2.5 pr-4 text-right">Flat Bonus</th>
                <th className="py-2.5 text-right">Amount Range</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {rows.map((row) => (
                <tr key={row.operatorCode} className="hover:bg-slate-50">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <ServiceIcon name={row.iconName} className="w-4 h-4 text-slate-500" />
                      <span className="font-medium text-slate-900">{row.serviceName}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <OperatorBadge
                        name={row.operatorName}
                        symbol={row.symbol}
                        logoUrl={row.logoUrl}
                        accentColor={row.accentColor}
                        size="sm"
                      />
                      <span className="font-medium text-slate-800">{row.operatorName}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-slate-500">{row.operatorCode}</td>
                  <td className="py-3 pr-4 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                    {row.commissionRate.toFixed(2)}%
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-xs text-slate-600 tabular-nums">
                    {row.flatFee > 0 ? `+${formatMoney(row.flatFee, currency)}` : '—'}
                  </td>
                  <td className="py-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                    {formatMoney(row.minAmount, currency)} – {formatMoney(row.maxAmount, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
