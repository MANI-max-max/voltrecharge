import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, FileCheck2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest, formatDateTime } from '../lib/api';
import { KycSubmission } from '../types';

interface KycViewProps {
  onRequireAuth?: (promptMessage?: string) => void;
}

export function KycView({ onRequireAuth }: KycViewProps) {
  const { user, token, refreshMe } = useAuth();

  const [fullName, setFullName] = useState(user?.name || '');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [documentType, setDocumentType] = useState('National ID / Aadhaar');
  const [documentNumber, setDocumentNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [documentFrontNote, setDocumentFrontNote] = useState('');
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadKyc = async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{ submissions: KycSubmission[] }>('/api/kyc', { token });
      setSubmissions(data.submissions);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadKyc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      onRequireAuth?.('Sign in or create an account to submit KYC verification.');
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      await apiRequest('/api/kyc', {
        method: 'POST',
        token,
        body: {
          fullName,
          dateOfBirth,
          documentType,
          documentNumber,
          address,
          city,
          postalCode,
          documentFrontNote,
        },
      });
      setSuccessMsg('KYC verification submitted successfully. An administrator will review your details shortly.');
      await refreshMe();
      await loadKyc();
    } catch (err: any) {
      setError(err.message || 'Failed to submit KYC details.');
    } finally {
      setSubmitting(false);
    }
  };

  const status = user?.kycStatus || 'unverified';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
                status === 'verified'
                  ? 'bg-emerald-50 text-emerald-700'
                  : status === 'pending'
                  ? 'bg-amber-50 text-amber-700'
                  : status === 'rejected'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {status === 'verified' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : status === 'pending' ? (
                <Clock className="w-5 h-5" />
              ) : status === 'rejected' ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <FileCheck2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Current KYC Status</p>
              <h2 className="text-lg font-bold text-slate-900 capitalize">{status}</h2>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            {status === 'verified'
              ? 'Your identity is verified. You have full access to high-limit transactions, referral payouts, and priority support.'
              : status === 'pending'
              ? 'Your KYC application has been submitted and is currently under administrator review.'
              : status === 'rejected'
              ? 'Your previous KYC submission was rejected. Review the administrator remarks below and submit updated information.'
              : 'Complete Know Your Customer (KYC) authentication to unlock higher wallet limits and verified merchant status.'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Submission History</h3>
          {submissions.length === 0 ? (
            <p className="text-xs text-slate-500">No KYC applications submitted yet.</p>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => (
                <div key={sub.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900">{sub.documentType}</span>
                    <span
                      className={`font-semibold capitalize ${
                        sub.status === 'verified'
                          ? 'text-emerald-700'
                          : sub.status === 'pending'
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-600">ID: {sub.documentNumber}</p>
                  <p className="text-xs text-slate-500">Submitted {formatDateTime(sub.createdAt)}</p>
                  {sub.adminRemarks && (
                    <p className="text-xs text-slate-700 pt-1 border-t border-slate-200">
                      Admin Remarks: {sub.adminRemarks}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
        <div className="pb-4 border-b border-slate-200 mb-5">
          <h2 className="text-base font-bold text-slate-900">KYC Identity Authentication Form</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Provide government-issued identification details matching your account profile
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Legal Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="As printed on ID document"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Date of Birth
              </label>
              <input
                type="date"
                required
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Document Type
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="National ID / Aadhaar">National ID / Aadhaar</option>
                <option value="Passport">Passport</option>
                <option value="Driver License">Driver&apos;s License</option>
                <option value="Tax / PAN Card">Tax / PAN Card</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Document Identification Number
              </label>
              <input
                type="text"
                required
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Enter ID / Passport number"
                className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Residential Street Address
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House/Apt number, street name"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">City</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Postal Code</label>
              <input
                type="text"
                required
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="Postal / ZIP code"
                className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Document Verification Reference / Selfie Note (Optional)
            </label>
            <input
              type="text"
              value={documentFrontNote}
              onChange={(e) => setDocumentFrontNote(e.target.value)}
              placeholder="Issuing authority or verification note"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || status === 'verified'}
            className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-60"
          >
            {status === 'verified'
              ? 'Account Already Verified'
              : submitting
              ? 'Submitting KYC...'
              : 'Submit KYC for Verification'}
          </button>
        </form>
      </div>
    </div>
  );
}
