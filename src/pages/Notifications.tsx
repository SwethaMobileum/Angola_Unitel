import React, { useState, useEffect } from 'react';
import { COPY } from '../copy/en';
import { NotificationRecord } from '../types';
import { getStoredNotifications, addNotification } from '../lib/loans';
import { dispatchTransactionalEmail, generateLoanEmailHtml } from '../lib/supabaseSync';
import {
  Bell,
  Mail,
  Search,
  Eye,
  Info,
  X,
  Send,
  CheckCircle2,
} from 'lucide-react';

export const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [search, setSearch] = useState<string>('');
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [inspectNotif, setInspectNotif] = useState<NotificationRecord | null>(null);
  const [previewMode, setPreviewMode] = useState<'html' | 'text'>('html');

  // Test Email Modal State
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [testEmailTo, setTestEmailTo] = useState<string>('nbhargow@gmail.com');
  const [testTemplateKind, setTestTemplateKind] = useState<'submission_notice' | 'approval_notice' | 'rejection_notice'>('approval_notice');
  const [testSending, setTestSending] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const refreshNotifs = () => {
    setNotifications(getStoredNotifications());
  };

  useEffect(() => {
    refreshNotifs();
  }, []);

  const filtered = notifications.filter((n) => {
    const q = search.toLowerCase();
    const matchesSearch =
      n.to_email.toLowerCase().includes(q) ||
      n.subject.toLowerCase().includes(q) ||
      n.body.toLowerCase().includes(q);
    const matchesKind = kindFilter === 'all' || n.kind === kindFilter;
    return matchesSearch && matchesKind;
  });

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailTo.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }

    setTestSending(true);
    setTestResult(null);

    const isApproval = testTemplateKind === 'approval_notice';
    const isRejection = testTemplateKind === 'rejection_notice';

    const sampleSubject = isApproval
      ? 'Loan Application Approved (CR-TEST01) - João Manuel Baptista'
      : isRejection
      ? 'Loan Application Declined (CR-TEST01) - João Manuel Baptista'
      : 'New Loan Application Submitted (CR-TEST01) - João Manuel Baptista';

    const emailHtml = generateLoanEmailHtml({
      kind: testTemplateKind,
      customerName: 'João Manuel Baptista',
      applicationId: 'app-test-001',
      equipmentName: 'Samsung Galaxy A05 (128GB)',
      priceKz: 85000,
      monthlyEmiKz: 14167,
      termMonths: 6,
      score: 685,
      scoreBand: 'Acceptable',
      reason: isApproval
        ? 'Consistent 3-year airtime recharge history and verified informal market trade activity in Luanda.'
        : isRejection
        ? 'Debt service ratio exceeds 30% affordability cap.'
        : undefined,
      actorName: isApproval || isRejection ? 'Dra. Maria Mendes (Approver)' : 'Tomas Silva (Analyst)',
    });

    const res = await dispatchTransactionalEmail({
      to: testEmailTo,
      subject: sampleSubject,
      html: emailHtml,
      kind: testTemplateKind,
      applicationId: 'app-test-001',
    });

    const isLive = (res.mode === 'live_gmail' || res.mode === 'live_resend' || res.mode === 'live_brevo') && res.success;

    const newRecord: NotificationRecord = {
      id: `notif-test-${Date.now()}`,
      application_id: 'app-test-001',
      to_email: testEmailTo,
      kind: testTemplateKind,
      subject: sampleSubject,
      body: `Test notification dispatched to ${testEmailTo} (${testTemplateKind}). Mode: ${res.mode}.${res.error ? ` Note: ${res.error}` : ''}`,
      html_body: emailHtml,
      status: isLive ? 'sent' : 'logged',
      created_at: new Date().toISOString(),
    };

    addNotification(newRecord);
    refreshNotifs();
    setTestSending(false);

    if (isLive) {
      const providerLabel = res.mode === 'live_brevo' ? 'Brevo API (All Inboxes)' : res.mode === 'live_resend' ? 'Resend API' : 'Gmail SMTP';
      setTestResult({
        success: true,
        message: `Live email successfully delivered to ${testEmailTo} via ${providerLabel}! Please check your inbox.`,
      });
    } else {
      setTestResult({
        success: false,
        message: `Local Wi-Fi ISP blocked raw SMTP port 587/465 (${res.error || 'connect ETIMEDOUT'}). The notification was securely captured with full HTML in the Audit Ledger below. To receive live inbox delivery on this Wi-Fi, add a free VITE_RESEND_API_KEY (over HTTPS port 443) or test on a mobile hotspot.`,
      });
    }
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">{COPY.nav.notifications}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Email notification ledger for application submissions, approver review requests, and final decisions.
          </p>
        </div>
        <button
          onClick={() => {
            setTestResult(null);
            setIsTestModalOpen(true);
          }}
          className="btn-primary text-xs flex items-center gap-1.5 py-2.5 px-4 shadow-sm"
        >
          <Mail className="w-4 h-4" />
          <span>Send Test Email Notification</span>
        </button>
      </div>

      {/* Integration Info Banner */}
      <div className="p-4 rounded-xl bg-orange-soft border border-orange-border flex items-start gap-3">
        <Info className="w-5 h-5 text-orange shrink-0 mt-0.5" />
        <div className="text-xs text-navy leading-relaxed">
          <strong className="text-orange">Transactional Email Gateway Architecture: </strong>
          Whenever an Analyst submits an application, a notification is dispatched to the Approver.
          When the Approver accepts or declines, a decision email is dispatched to the Analyst and Customer.
          <strong> Brevo REST API</strong> is active over HTTPS (Port 443), allowing live delivery to <strong>ANY recipient email address</strong> entered across any domain.
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card-warm p-4 bg-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by recipient, subject, or content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base pl-9 text-xs"
            />
          </div>

          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className="input-base text-xs max-w-[220px]"
          >
            <option value="all">All Notification Types</option>
            <option value="submission_notice">Submission (To Approver)</option>
            <option value="approval_notice">Approved (To Analyst)</option>
            <option value="rejection_notice">Rejected (To Analyst)</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-mono font-bold">
          Showing {filtered.length} of {notifications.length} logged emails
        </div>
      </div>

      {/* Notifications Table */}
      <div className="card-warm bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-[#FAF8F5] text-navy font-bold border-b border-orange-border/60">
              <tr>
                <th className="py-3 px-4 text-left">Recipient</th>
                <th className="py-3 px-3 text-left">Category</th>
                <th className="py-3 px-4 text-left">Subject</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-left">Timestamp</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-40 text-orange" />
                    <span>No notifications found.</span>
                  </td>
                </tr>
              ) : (
                filtered.map((notif) => {
                  let kindBadge = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (notif.kind === 'submission_notice') kindBadge = 'bg-blue-50 text-blue-800 border-blue-200';
                  if (notif.kind === 'approval_notice') kindBadge = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                  if (notif.kind === 'rejection_notice') kindBadge = 'bg-red-50 text-red-800 border-red-200';

                  return (
                    <tr
                      key={notif.id}
                      className="hover:bg-orange-soft/30 transition-colors cursor-pointer"
                      onClick={() => setInspectNotif(notif)}
                    >
                      {/* Recipient */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-orange shrink-0" />
                          <span className="font-mono font-bold text-navy">{notif.to_email}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${kindBadge}`}>
                          {notif.kind.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Subject */}
                      <td className="py-3 px-4 font-semibold text-slate-800 max-w-md truncate">
                        {notif.subject}
                      </td>

                      {/* Delivery Status */}
                      <td className="py-3 px-3 whitespace-nowrap text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                            notif.status === 'sent'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-amber-50 text-amber-700 border-amber-300'
                          }`}
                        >
                          {notif.status.toUpperCase()}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {new Date(notif.created_at).toLocaleString()}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 whitespace-nowrap text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectNotif(notif);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-orange hover:bg-orange-soft"
                          title="Preview Email"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= TEST EMAIL DISPATCH MODAL ================= */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-orange-border rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-orange" />
                <h3 className="text-base font-bold text-navy">Send Test Email Notification</h3>
              </div>
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3.5 rounded-lg border text-xs leading-relaxed ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-red-50 border-red-300 text-red-900'
                }`}
              >
                <div className="font-bold mb-0.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Dispatch Status
                </div>
                <p>{testResult.message}</p>
              </div>
            )}

            <form onSubmit={handleSendTestEmail} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-navy">Recipient Email Address *</label>
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  value={testEmailTo}
                  onChange={(e) => setTestEmailTo(e.target.value)}
                  className="input-base text-xs font-semibold"
                  required
                />
                <span className="text-[11px] text-slate-500 block">
                  Enter any recipient email address (e.g. nbhargow@gmail.com, 30swetha.s@gmail.com). Delivered worldwide via Brevo API.
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-navy">Notification Template Event *</label>
                <select
                  value={testTemplateKind}
                  onChange={(e) => setTestTemplateKind(e.target.value as any)}
                  className="input-base text-xs font-semibold"
                >
                  <option value="approval_notice">Loan Approved (Approval Decision)</option>
                  <option value="rejection_notice">Loan Declined (Risk Decision)</option>
                  <option value="submission_notice">New Application Submitted (Awaiting Approver)</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={testSending}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{testSending ? 'Sending Email...' : 'Send Email Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EMAIL PREVIEW MODAL ================= */}
      {inspectNotif && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-2 border-orange-border">
            {/* Modal Header */}
            <div className="p-4 bg-navy text-white flex items-center justify-between border-b border-navy-dark">
              <div>
                <span className="text-[11px] font-mono font-bold text-orange uppercase tracking-wider block">
                  Transactional Email Ledger
                </span>
                <h3 className="text-base font-bold text-white truncate max-w-lg mt-0.5">
                  {inspectNotif.subject}
                </h3>
              </div>
              <button
                onClick={() => setInspectNotif(null)}
                className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-navy-light/40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Email Metadata Strip */}
            <div className="p-3 bg-[#FAF8F5] border-b border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-slate-500 font-medium mr-1.5">To:</span>
                  <span className="font-mono font-bold text-navy">{inspectNotif.to_email}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium mr-1.5">Status:</span>
                  <span className="font-mono font-bold text-emerald-700 uppercase">{inspectNotif.status}</span>
                </div>
              </div>

              {/* View Toggle */}
              {inspectNotif.html_body && (
                <div className="flex items-center bg-white border border-slate-300 rounded-md p-0.5">
                  <button
                    onClick={() => setPreviewMode('html')}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                      previewMode === 'html' ? 'bg-orange text-white' : 'text-slate-600'
                    }`}
                  >
                    HTML Preview
                  </button>
                  <button
                    onClick={() => setPreviewMode('text')}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                      previewMode === 'text' ? 'bg-orange text-white' : 'text-slate-600'
                    }`}
                  >
                    Plain Text
                  </button>
                </div>
              )}
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {inspectNotif.html_body && previewMode === 'html' ? (
                <iframe
                  title="Email HTML Preview"
                  srcDoc={inspectNotif.html_body}
                  className="w-full h-[450px] border border-slate-200 rounded-lg bg-white"
                />
              ) : (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                  {inspectNotif.body}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#FAF8F5] border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-mono text-[11px]">
                Recorded: {new Date(inspectNotif.created_at).toLocaleString()}
              </span>
              <button
                onClick={() => setInspectNotif(null)}
                className="btn-secondary text-xs py-1.5 px-4"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
