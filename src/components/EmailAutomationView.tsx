import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Loader2,
  MailPlus,
  Send,
  Sparkles,
  Trash2,
  UserCheck,
} from 'lucide-react';
import type { DashboardSnapshot, EmailStatus, LanguageCode } from '../shared/types';
import { crmApi } from '../services/crmApi';
import { AvatarView } from './AvatarView';

interface EmailAutomationViewProps {
  snapshot: DashboardSnapshot;
  language: LanguageCode;
  initialEmailId?: string;
  onSnapshotChange: (next: DashboardSnapshot) => void;
  onOpenNewEmailModal: () => void;
}

export function EmailAutomationView({
  snapshot,
  language,
  initialEmailId,
  onSnapshotChange,
  onOpenNewEmailModal,
}: EmailAutomationViewProps) {
  const [filter, setFilter] = useState<'ALL' | EmailStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(initialEmailId || snapshot.emails[0]?.id || '');
  const [replyDraft, setReplyDraft] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [replyLanguage, setReplyLanguage] = useState<LanguageCode>(language);
  const [busyAction, setBusyAction] = useState<'draft' | 'autosend' | 'send' | 'delete' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialEmailId) {
      setSelectedId(initialEmailId);
    }
  }, [initialEmailId]);

  useEffect(() => {
    setReplyLanguage(language);
  }, [language]);

  const filteredEmails = snapshot.emails.filter((e) => {
    const matchesStatus = filter === 'ALL' || e.status === filter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      e.subject.toLowerCase().includes(q) ||
      e.companyName.toLowerCase().includes(q) ||
      e.customerName.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const activeEmail =
    snapshot.emails.find((e) => e.id === selectedId) ?? filteredEmails[0] ?? snapshot.emails[0] ?? null;

  useEffect(() => {
    if (activeEmail) {
      setReplyDraft(activeEmail.sentReply ?? activeEmail.aiDraftReply ?? '');
      setSelectedEmployeeId(activeEmail.assignedEmployeeId ?? snapshot.employees[0]?.id ?? '');
    }
  }, [activeEmail?.id, activeEmail?.aiDraftReply, activeEmail?.sentReply, activeEmail?.assignedEmployeeId]);

  async function handleRunAiTriage(autoSend: boolean) {
    if (!activeEmail) return;
    setErrorMsg(null);
    setBusyAction(autoSend ? 'autosend' : 'draft');
    try {
      const { email, snapshot: nextSnap } = await crmApi.triageEmailWithAI(
        activeEmail.id,
        replyLanguage,
        autoSend
      );
      onSnapshotChange(nextSnap);
      setReplyDraft(email.sentReply ?? email.aiDraftReply ?? '');
      if (email.assignedEmployeeId) {
        setSelectedEmployeeId(email.assignedEmployeeId);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to run AI email triage.');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSendManualOrEdited() {
    if (!activeEmail || !replyDraft.trim()) return;
    setErrorMsg(null);
    setBusyAction('send');
    try {
      const { snapshot: nextSnap } = await crmApi.sendEmailReply(
        activeEmail.id,
        replyDraft,
        selectedEmployeeId
      );
      onSnapshotChange(nextSnap);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to dispatch reply.');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteThread() {
    if (!activeEmail) return;
    setErrorMsg(null);
    setBusyAction('delete');
    try {
      const { snapshot: nextSnap } = await crmApi.deleteRecord('email', activeEmail.id);
      onSnapshotChange(nextSnap);
      setSelectedId(nextSnap.emails[0]?.id || '');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete email thread.');
    } finally {
      setBusyAction(null);
    }
  }

  function handleDownloadEml() {
    if (!activeEmail) return;
    const subj = activeEmail.subject.toLowerCase().startsWith('re:')
      ? activeEmail.subject
      : `Re: ${activeEmail.subject}`;
    const emlContent = [
      `From: ${snapshot.orgSettings.companyName} <${snapshot.orgSettings.supportEmail}>`,
      `To: ${activeEmail.customerName} <${activeEmail.customerEmail}>`,
      `Subject: ${subj}`,
      `Date: ${new Date().toUTCString()}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      replyDraft || activeEmail.sentReply || '',
    ].join('\r\n');

    const blob = new Blob([emlContent], { type: 'message/rfc822;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reply-${activeEmail.id}.eml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const assignedSpecialist = snapshot.employees.find((e) => e.id === selectedEmployeeId);
  const mailtoHref = activeEmail
    ? `mailto:${encodeURIComponent(activeEmail.customerEmail)}?subject=${encodeURIComponent(
        activeEmail.subject.toLowerCase().startsWith('re:')
          ? activeEmail.subject
          : `Re: ${activeEmail.subject}`
      )}&body=${encodeURIComponent(replyDraft)}`
    : '#';

  return (
    <div className="space-y-6">
      {/* Top Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          {(['ALL', 'Needs Reply', 'Draft Ready', 'Auto-Replied'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === tab ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab === 'ALL' ? 'All Threads' : tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'bn' ? 'ইমেইল বা কোম্পানি খুঁজুন...' : 'Search company or subject...'}
            className="px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 w-60"
          />
          <button
            onClick={onOpenNewEmailModal}
            className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <MailPlus className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'ক্লায়েন্ট ইমেইল লগ করুন' : 'Log Client Email'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div role="alert" className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          {errorMsg}
        </div>
      )}

      {/* Split Workspace: Thread Queue + AI Auto-Reply & Employee Assignment Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-800">Inbound Client Inbox</span>
            <span className="font-mono tabular-nums">{filteredEmails.length} threads</span>
          </div>

          {filteredEmails.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm text-slate-600">No email threads in this view yet.</p>
              <button
                onClick={onOpenNewEmailModal}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
              >
                Log First Client Email
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 max-h-[640px] overflow-y-auto">
              {filteredEmails.map((thread) => {
                const isSelected = activeEmail?.id === thread.id;
                return (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedId(thread.id)}
                    className={`w-full text-left p-4 transition-colors block ${
                      isSelected ? 'bg-slate-100/90' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-800 truncate">{thread.companyName}</span>
                      <span className="font-mono tabular-nums shrink-0">
                        {new Date(thread.receivedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-slate-900 mt-1 line-clamp-1">{thread.subject}</div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{thread.inboundBody}</p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      <span
                        className={
                          thread.status === 'Auto-Replied'
                            ? 'text-emerald-700 font-medium inline-flex items-center gap-1'
                            : 'text-amber-700 font-medium inline-flex items-center gap-1'
                        }
                      >
                        {thread.status === 'Auto-Replied' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        {thread.status}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{thread.urgency} Priority</span>
                      <span aria-hidden="true">·</span>
                      <span>{thread.sentiment}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Detail & AI Studio */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
          {!activeEmail ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Select an email thread to run AI employee routing and auto-reply synthesis.
            </div>
          ) : (
            <>
              {/* Inbound Header & Message */}
              <div className="p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">{activeEmail.customerName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{activeEmail.customerEmail}</span>
                      <span aria-hidden="true">·</span>
                      <span>{activeEmail.category}</span>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 mt-1">{activeEmail.subject}</h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                      <button
                        onClick={() => setReplyLanguage('en')}
                        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                          replyLanguage === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        Reply EN
                      </button>
                      <button
                        onClick={() => setReplyLanguage('bn')}
                        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                          replyLanguage === 'bn' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        বাংলায়
                      </button>
                    </div>
                    <button
                      onClick={handleDeleteThread}
                      disabled={busyAction !== null}
                      title="Delete thread"
                      className="p-2 text-slate-400 hover:text-red-600 border border-slate-200 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {activeEmail.inboundBody}
                </div>
              </div>

              {/* AI Employee Matching & Routing Control */}
              <div className="p-6 space-y-4 bg-slate-50/60">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-700" />
                      <span>
                        {language === 'bn'
                          ? 'AI স্মার্ট এমপ্লয়ি সিলেকশন ও রাউটিং'
                          : 'AI Specialist Selection & Ownership'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Matches customer domain, language fluency, CSAT track record, and active capacity
                    </p>
                  </div>

                  <select
                    aria-label="Assigned Employee"
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {snapshot.employees
                      .filter((emp) => emp.employmentStatus !== 'Offboarded')
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} — {emp.role} ({emp.activeAccountsCount}/{emp.maxCapacity})
                        </option>
                      ))}
                  </select>
                </div>

                {assignedSpecialist && (
                  <div className="flex items-center justify-between gap-4 pt-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <AvatarView
                        name={assignedSpecialist.name}
                        avatarKey={assignedSpecialist.avatarKey}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 truncate">
                          {assignedSpecialist.name} · {assignedSpecialist.department}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          Skills: {assignedSpecialist.skills.join(' · ')}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-mono tabular-nums text-slate-600 shrink-0">
                      CSAT {assignedSpecialist.csatScore}%
                    </div>
                  </div>
                )}

                {activeEmail.aiRoutingReason && (
                  <p className="text-xs text-slate-600 leading-relaxed pt-2 border-t border-slate-200/80">
                    <span className="font-semibold text-slate-800">AI Routing Rationale: </span>
                    {activeEmail.aiRoutingReason}
                  </p>
                )}
              </div>

              {/* Auto-Reply Composer & Action Controls */}
              <div className="p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-900">
                    {activeEmail.status === 'Auto-Replied'
                      ? 'Dispatched Customer Response'
                      : 'AI Auto-Reply Composer'}
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleRunAiTriage(false)}
                      disabled={busyAction !== null}
                      className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      {busyAction === 'draft' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                      )}
                      <span>
                        {language === 'bn' ? 'AI ড্রাফট ও এমপ্লয়ি সিলেক্ট' : 'AI Draft & Match Employee'}
                      </span>
                    </button>

                    <button
                      onClick={() => handleRunAiTriage(true)}
                      disabled={busyAction !== null}
                      className="px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      {busyAction === 'autosend' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{language === 'bn' ? '১-ক্লিক অটো রিপ্লাই পাঠান' : '1-Click AI Auto-Reply'}</span>
                    </button>
                  </div>
                </div>

                <textarea
                  rows={7}
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  placeholder={
                    language === 'bn'
                      ? 'উপরের "AI ড্রাফট ও এমপ্লয়ি সিলেক্ট" বাটনে ক্লিক করলে স্বয়ংক্রিয়ভাবে উত্তর তৈরি হবে...'
                      : 'Click "AI Draft & Match Employee" to synthesize a tailored SLA response and specialist assignment...'
                  }
                  className="w-full p-3.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 leading-relaxed"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 space-y-0.5">
                    {activeEmail.repliedAt ? (
                      <>
                        <div className="font-mono tabular-nums text-emerald-700 font-medium">
                          Sent {new Date(activeEmail.repliedAt).toLocaleString()}
                        </div>
                        {activeEmail.smtpDeliveryStatus && (
                          <div className="text-[11px] text-slate-500">{activeEmail.smtpDeliveryStatus}</div>
                        )}
                      </>
                    ) : (
                      <span>Dispatches via Python SMTP (if configured) or opens in your default mail client</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {replyDraft.trim() && (
                      <>
                        <a
                          href={mailtoHref}
                          className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open in Mail App</span>
                        </a>
                        <button
                          type="button"
                          onClick={handleDownloadEml}
                          className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>.eml</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={handleSendManualOrEdited}
                      disabled={busyAction !== null || !replyDraft.trim()}
                      className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      {busyAction === 'send' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{language === 'bn' ? 'রিপ্লাই কনফার্ম ও সেন্ড' : 'Send Verified Reply'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
