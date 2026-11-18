import React, { useState, useEffect, useMemo } from 'react';
import { NotificationRecord } from '../types';
import { getStoredNotifications, addNotification } from '../lib/loans';
import { useSyncDatabase } from '../lib/syncClient';
import { dispatchTransactionalEmail, generateLoanEmailHtml } from '../lib/supabaseSync';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import {
  Bell,
  Mail,
  Search,
  Eye,
  X,
  Send,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [search, setSearch] = useState<string>('');
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [inspectNotif, setInspectNotif] = useState<NotificationRecord | null>(null);
  const [previewMode, setPreviewMode] = useState<'html' | 'text'>('html');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 7;

  // Test Email Modal State
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [testEmailTo, setTestEmailTo] = useState<string>('bhargownarravula777@gmail.com');
  const [testTemplateKind, setTestTemplateKind] = useState<'submission_notice' | 'approval_notice' | 'rejection_notice'>('approval_notice');
  const [testSending, setTestSending] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Template Previews Modal State
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [activePreviewTemplate, setActivePreviewTemplate] = useState<'submission_notice' | 'approval_notice' | 'rejection_notice'>('approval_notice');

  const refreshNotifs = () => {
    setNotifications(getStoredNotifications());
  };

  useEffect(() => {
    refreshNotifs();
  }, []);

  useSyncDatabase(() => {
    refreshNotifs();
  });

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      const q = search.toLowerCase();
      const matchesSearch =
        n.to_email.toLowerCase().includes(q) ||
        n.subject.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q);
      const matchesKind = kindFilter === 'all' || n.kind === kindFilter;
      return matchesSearch && matchesKind;
    });
  }, [notifications, search, kindFilter]);

  // Paging
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedNotifications = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

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
      ? 'Your application is approved'
      : isRejection
        ? 'Application update'
        : 'New loan application: Matthew Silva';

    const emailHtml = generateLoanEmailHtml({
      kind: testTemplateKind,
      customerName: 'Matthew Silva',
      applicationId: 'app-matthew-101',
      segment: 'S3 Smartphone Wallet',
      equipmentName: 'Samsung Galaxy A15 4G (128GB)',
      priceKz: 85000,
      monthlyEmiKz: 14167,
      termMonths: 6,
      score: 685,
      scoreBand: 'Acceptable',
      autoSummary:
        'Matthew Silva applied for equipment financing (S3).\nAssessed proxy score: 685/900 (Acceptable Band).\nSelected device: Samsung Galaxy A15 4G for 85,000 Kz.\nPayment plan: 6 months at 14,167 Kz/mo (Affordability: 11.8%).',
      reason: isRejection
        ? 'Telecom tenure below 6-month threshold for requested credit limit tier.'
        : undefined,
      actorName: isApproval || isRejection ? 'Dra. Maria Mendes (Approver)' : 'Tomas Silva (Applicant)',
    });

    const res = await dispatchTransactionalEmail({
      to: testEmailTo,
      subject: sampleSubject,
      html: emailHtml,
      kind: testTemplateKind,
      applicationId: 'app-matthew-101',
    });

    const isLive = res.success && res.mode === 'live_brevo';

    const newRecord: NotificationRecord = {
      id: `notif-${Date.now()}`,
      application_id: 'app-matthew-101',
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
      setTestResult({
        success: true,
        message: `Live email delivered to ${testEmailTo} via Brevo REST API! Please check your inbox.`,
      });
    } else {
      setTestResult({
        success: true,
        message: `Email recorded locally in notification ledger (${res.mode}).`,
      });
    }
  };

  // Sample HTML preview for modal
  const samplePreviewHtml = useMemo(() => {
    return generateLoanEmailHtml({
      kind: activePreviewTemplate,
      customerName: 'Matthew Silva',
      applicationId: 'app-matthew-101',
      segment: 'S3 Smartphone Wallet',
      equipmentName: 'Samsung Galaxy A15 4G (128GB)',
      priceKz: 85000,
      monthlyEmiKz: 14167,
      termMonths: 6,
      score: 685,
      scoreBand: 'Acceptable',
      autoSummary:
        'Matthew Silva applied for equipment financing (S3).\nAssessed proxy score: 685/900 (Acceptable Band).\nSelected device: Samsung Galaxy A15 4G for 85,000 Kz.\nPayment plan: 6 months at 14,167 Kz/mo (Affordability: 11.8%).',
      reason:
        activePreviewTemplate === 'rejection_notice'
          ? 'Telecom tenure below 6-month threshold for requested credit limit tier.'
          : undefined,
      actorName:
        activePreviewTemplate === 'submission_notice'
          ? 'Tomas Silva (Applicant)'
          : 'Dra. Maria Mendes (Approver)',
    });
  }, [activePreviewTemplate]);

  return (
    <div className="space-y-4 w-full min-w-0 max-w-full pb-10">
      {/* Page Header (Few-words rule: title <= 4 words, helper <= 10 words) */}
      <PageHeader
        title="Notifications Ledger"
        helperText="Email dispatch ledger, delivery status, and template previews."
        badgeText="Brevo REST Active"
      />

      {/* Top Filter & Actions Bar */}
      <div className="bg-white rounded-xl p-3 shadow-xs border-2 border-orange flex flex-wrap items-center justify-between gap-3 w-full">
        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-64 sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search recipient, subject..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="input-base pl-8 py-1.5 text-xs w-full"
            />
          </div>

          <div className="flex items-center gap-1">
            {(['all', 'submission_notice', 'approval_notice', 'rejection_notice'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKindFilter(k);
                  setCurrentPage(1);
                }}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${kindFilter === k
                  ? 'bg-ink text-white'
                  : 'bg-cream/60 text-slate-600 hover:text-ink hover:bg-cream border border-slate-200'
                  }`}
              >
                {k === 'all'
                  ? 'All'
                  : k === 'submission_notice'
                    ? 'Submitted'
                    : k === 'approval_notice'
                      ? 'Approved'
                      : 'Rejected'}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPreviewModalOpen(true)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-cream text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-orange" />
            <span>Preview Templates</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTestResult(null);
              setIsTestModalOpen(true);
            }}
            className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3.5 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Sample Email</span>
          </button>
        </div>
      </div>

      {/* Notifications Table Card */}
      <div className="bg-white rounded-xl border-2 border-orange shadow-xs overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs divide-y divide-slate-100 min-w-[650px]">
            <thead className="bg-cream/60 text-ink font-bold">
              <tr>
                <th className="py-2.5 px-4 text-left w-[230px]">Recipient</th>
                <th className="py-2.5 px-3 text-center w-[120px]">Category</th>
                <th className="py-2.5 px-4 text-left">Subject</th>
                <th className="py-2.5 px-3 text-center w-[140px]">Delivery Status</th>
                <th className="py-2.5 px-4 text-left w-[170px]">Dispatched At</th>
                <th className="py-2.5 px-3 text-center w-[90px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedNotifications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <Bell className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-orange" />
                    <span>No notifications matching current filters.</span>
                  </td>
                </tr>
              ) : (
                pagedNotifications.map((notif) => {
                  const isSent = notif.status === 'sent';
                  const isApprove = notif.kind === 'approval_notice';
                  const isReject = notif.kind === 'rejection_notice';

                  return (
                    <tr
                      key={notif.id}
                      onClick={() => setInspectNotif(notif)}
                      className="hover:bg-cream/20 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-orange shrink-0" />
                          <span className="font-mono font-bold text-ink">{notif.to_email}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${isApprove
                            ? 'bg-green/10 text-green'
                            : isReject
                              ? 'bg-red/10 text-red'
                              : 'bg-teal/10 text-teal'
                            }`}
                        >
                          {notif.kind === 'submission_notice'
                            ? 'SUBMITTED'
                            : notif.kind === 'approval_notice'
                              ? 'APPROVED'
                              : 'REJECTED'}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 font-semibold text-ink">
                        {notif.subject}
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${isSent
                            ? 'bg-green/10 text-green'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                        >
                          {isSent ? 'SENT (BREVO)' : 'LOGGED'}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {new Date(notif.created_at).toLocaleString()}
                      </td>

                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectNotif(notif);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-orange hover:bg-cream transition-colors"
                          title="Inspect email"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paging Footer (Zero page scroll) */}
        <div className="p-2.5 bg-cream/40 border-t border-peach/30 flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono text-[11px]">
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} notifications
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-cream disabled:opacity-40 disabled:cursor-not-allowed"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="font-mono px-2 py-0.5 text-xs font-bold text-ink">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-cream disabled:opacity-40 disabled:cursor-not-allowed"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: SEND SAMPLE EMAIL VIA BREVO REST API                  */}
      {/* ============================================================== */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        className="bg-white rounded-2xl max-w-xl w-full p-6 border-2 border-orange/40 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between border-b border-peach/30 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange/10 flex items-center justify-center text-orange">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-ink">Send Sample Email</h3>
              <p className="text-[10px] text-slate-500">Delivered via Brevo REST API over HTTPS</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsTestModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-ink hover:bg-cream"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2 ${testResult.success
              ? 'bg-green/10 border-green/30 text-green'
              : 'bg-red/10 border-red/30 text-red'
              }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{testResult.message}</span>
          </div>
        )}

        <form onSubmit={handleSendTestEmail} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-ink block mb-1">Recipient Email Address *</label>
            <input
              type="email"
              value={testEmailTo}
              onChange={(e) => setTestEmailTo(e.target.value)}
              className="input-base text-xs font-semibold w-full"
              required
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Delivers directly to your inbox via authenticated Brevo gateway.
            </span>
          </div>

          <div>
            <label className="font-bold text-ink block mb-1">Email Template *</label>
            <div className="grid grid-cols-1 gap-1.5">
              {[
                { id: 'submission_notice', label: '1. Submitted (To Approver)', desc: 'New loan application notice' },
                { id: 'approval_notice', label: '2. Approved (To Applicant)', desc: 'Application approved & Proceed to buy' },
                { id: 'rejection_notice', label: '3. Rejected (To Applicant)', desc: 'Application update & next steps' },
              ].map((tpl) => (
                <label
                  key={tpl.id}
                  className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${testTemplateKind === tpl.id
                    ? 'border-orange bg-cream'
                    : 'border-slate-200 bg-white hover:bg-cream/40'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="tpl"
                      checked={testTemplateKind === tpl.id}
                      onChange={() => setTestTemplateKind(tpl.id as any)}
                      className="accent-orange"
                    />
                    <span className="font-bold text-ink text-xs">{tpl.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{tpl.desc}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsTestModalOpen(false)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-cream"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={testSending}
              className="btn-primary text-xs py-1.5 px-4 shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{testSending ? 'Sending...' : 'Send Live Email'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: TEMPLATE PREVIEWS (SUBMITTED, APPROVED, REJECTED)     */}
      {/* ============================================================== */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-2 border-orange/40 animate-in zoom-in-95 duration-150"
      >
        <div className="flex flex-col h-full w-full">
          {/* Header */}
          <div className="p-3.5 bg-ink text-white flex items-center justify-between border-b border-ink-light">
            <div>
              <span className="text-[10px] font-mono font-bold text-yellow uppercase tracking-wider block">
                Email Design Review
              </span>
              <h3 className="text-sm font-extrabold text-white">Three Branded Email Templates</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-ink-light"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Template Selector Tabs */}
          <div className="bg-cream/60 p-2 border-b border-peach/30 flex items-center gap-1">
            {[
              { id: 'submission_notice', label: '1. Submitted (Approver)' },
              { id: 'approval_notice', label: '2. Approved (Applicant)' },
              { id: 'rejection_notice', label: '3. Rejected (Applicant)' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActivePreviewTemplate(tab.id as any)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${activePreviewTemplate === tab.id
                  ? 'bg-orange text-white shadow-xs'
                  : 'text-slate-600 hover:text-ink hover:bg-cream'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Rendered Email Frame */}
          <div className="flex-1 overflow-y-auto p-4 bg-[#FAF8F5] flex justify-center">
            <div className="w-full max-w-[560px] bg-white rounded-xl shadow-xs overflow-hidden border border-peach/40">
              <iframe
                title="Template Preview"
                srcDoc={samplePreviewHtml}
                className="w-full h-[460px] border-none"
                sandbox="allow-same-origin"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">
              Matches Section 10: Orange header bar, white body, summary table, 1 main button.
            </span>
            <button
              type="button"
              onClick={() => {
                setIsPreviewModalOpen(false);
                setTestTemplateKind(activePreviewTemplate);
                setIsTestModalOpen(true);
              }}
              className="btn-primary text-xs py-1.5 px-3.5 shadow-sm flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send This Template</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: NOTIFICATION INSPECTION MODAL                         */}
      {/* ============================================================== */}
      <Modal
        isOpen={!!inspectNotif}
        onClose={() => setInspectNotif(null)}
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-2 border-orange/40 animate-in zoom-in-95 duration-150"
      >
        {inspectNotif && (
          <div className="flex flex-col h-full w-full">
            {/* Header */}
            <div className="p-3.5 bg-ink text-white flex items-center justify-between border-b border-ink-light">
              <div className="min-w-0 pr-3">
                <span className="text-[10px] font-mono font-bold text-yellow uppercase tracking-wider block">
                  Notification Payload Inspection
                </span>
                <h3 className="text-sm font-extrabold text-white truncate mt-0.5">
                  {inspectNotif.subject}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectNotif(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-ink-light shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switch & Metadata */}
            <div className="p-2.5 bg-cream/50 border-b border-peach/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-ink">To: {inspectNotif.to_email}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-peach text-orange font-bold">
                  {inspectNotif.status.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPreviewMode('html')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${previewMode === 'html' ? 'bg-orange text-white' : 'text-slate-600'
                    }`}
                >
                  Rendered HTML
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('text')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${previewMode === 'text' ? 'bg-orange text-white' : 'text-slate-600'
                    }`}
                >
                  Raw Summary
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#FAF8F5]">
              {previewMode === 'html' && inspectNotif.html_body ? (
                <div className="w-full max-w-[560px] mx-auto bg-white rounded-xl shadow-xs overflow-hidden border border-peach/40">
                  <iframe
                    title="Inspected Email"
                    srcDoc={inspectNotif.html_body}
                    className="w-full h-[440px] border-none"
                    sandbox="allow-same-origin"
                  />
                </div>
              ) : (
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed text-slate-700">
                  {inspectNotif.body}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 bg-white border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectNotif(null)}
                className="btn-primary text-xs py-1.5 px-4 shadow-sm"
              >
                Close Preview
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Notifications;
