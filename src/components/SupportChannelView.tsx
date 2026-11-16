import { useState } from 'react';
import { ExternalLink, Mail, Megaphone, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { buildWhatsAppSupportUrl } from '../lib/api';

export function SupportChannelView() {
  const { user, bootstrap } = useAuth();
  const supportPhone = bootstrap.settings.whatsapp_support_number || '+15550194820';
  const defaultSupportMessage =
    bootstrap.settings.whatsapp_support_message ||
    'Hello Support, I need help with my account.';
  const channelUrl =
    bootstrap.settings.whatsapp_channel_url || 'https://whatsapp.com/channel/0029VaVoltPayOfficial';
  const channelLabel =
    bootstrap.settings.whatsapp_channel_label || 'Join Official VoltPay Updates Channel';
  const supportEmail = bootstrap.settings.support_email || 'support@voltpay.io';

  const [customIssue, setCustomIssue] = useState('');

  const fullMessage = customIssue.trim()
    ? `${defaultSupportMessage}\nAccount: ${user?.email || 'Guest'}\nIssue: ${customIssue.trim()}`
    : `${defaultSupportMessage}\nAccount: ${user?.email || 'Guest'}`;

  const whatsappDirectUrl = buildWhatsAppSupportUrl(supportPhone, fullMessage);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* WhatsApp Support */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">WhatsApp Live Support</h2>
            <p className="text-xs text-slate-500">
              Official Support Number: <span className="font-mono font-semibold text-slate-700">{supportPhone}</span>
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          Need help with a pending recharge, wallet deposit, or KYC verification? Describe your question below and launch an instant WhatsApp chat with our support desk.
        </p>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Describe Your Issue or Transaction Reference (Optional)
          </label>
          <textarea
            rows={3}
            value={customIssue}
            onChange={(e) => setCustomIssue(e.target.value)}
            placeholder="e.g., Need help with reference VP-12345..."
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <a
          href={whatsappDirectUrl}
          target="_blank"
          rel="noreferrer"
          className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Chat on WhatsApp Support</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* WhatsApp Channel & Email */}
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Official WhatsApp Channel</h2>
              <p className="text-xs text-slate-500">Real-time operator alerts, new cashback codes &amp; rate updates</p>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            Subscribe to our broadcast channel on WhatsApp to receive instant notifications whenever new promo codes, higher commission slabs, or maintenance notices are published.
          </p>

          <a
            href={channelUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <span>{channelLabel}</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Email Escalation Desk</p>
              <p className="text-xs font-mono text-slate-500">{supportEmail}</p>
            </div>
          </div>
          <a
            href={`mailto:${supportEmail}`}
            className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
          >
            Send Email
          </a>
        </div>
      </div>
    </div>
  );
}
