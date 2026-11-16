import { useState } from 'react';
import { Check, Copy, Download, Share2, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'card';
}

export function PWAInstallButton({ variant = 'header' }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleAction = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowGuide(true);
      }
      return;
    }
    setShowGuide(true);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <>
      {variant === 'card' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <img
              src="/pwa-192x192.png"
              alt="VoltPay App Icon"
              className="w-11 h-11 rounded-xl border border-slate-200 shrink-0"
            />
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Download VoltPay Mobile App
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Install on Android or iPhone home screen for faster one-tap recharges &amp; bill payments
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAction}
            className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>{isInstallable ? 'Install App' : 'Download App'}</span>
          </button>
        </div>
      )}

      {variant === 'header' && (
        <button
          type="button"
          onClick={handleAction}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">{isInstallable ? 'Install App' : 'Download App'}</span>
          <span className="sm:hidden">App</span>
        </button>
      )}

      {variant === 'sidebar' && (
        <button
          type="button"
          onClick={handleAction}
          className="w-full px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          <span>{isInstallable ? 'Install Mobile App' : 'Download Mobile App'}</span>
        </button>
      )}

      {showGuide && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src="/pwa-192x192.png"
                  alt="VoltPay Mobile App"
                  className="w-11 h-11 rounded-xl border border-slate-200 shrink-0"
                />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isIOS ? 'Install VoltPay on iPhone / iPad' : 'Download VoltPay Mobile App'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Runs full-screen like a native app on Android &amp; iOS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-blue-700" />
                  <span>Safari Installation Steps</span>
                </p>
                <p>1. Tap the <strong>Share</strong> button in the Safari toolbar.</p>
                <p>2. Scroll down and tap <strong>Add to Home Screen</strong>.</p>
                <p>3. Tap <strong>Add</strong> in the top-right corner.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
                  <p className="font-semibold text-slate-900">Android (Chrome / Edge)</p>
                  <p>1. Open the app URL in Chrome on your Android phone.</p>
                  <p>2. Tap the browser menu (<strong>⋮</strong>) in the top-right corner.</p>
                  <p>3. Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
                  <p className="font-semibold text-slate-900">iPhone / iPad (Safari)</p>
                  <p>1. Open the app URL in Safari on your iPhone.</p>
                  <p>2. Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>.</p>
                </div>
              </div>
            )}

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-slate-600 truncate">
                {typeof window !== 'undefined' ? window.location.origin : ''}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-md hover:bg-blue-50 inline-flex items-center gap-1 shrink-0 cursor-pointer"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
