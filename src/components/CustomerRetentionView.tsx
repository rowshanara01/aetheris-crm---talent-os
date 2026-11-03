import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Edit3,
  FileText,
  Loader2,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { ChurnRiskLevel, CustomerAccount, DashboardSnapshot, LanguageCode } from '../shared/types';
import { crmApi } from '../services/crmApi';
import { formatMoney } from '../utils/formatters';
import { AvatarView } from './AvatarView';
import type { VoucherPayload } from './DocumentVoucherModal';

interface CustomerRetentionViewProps {
  snapshot: DashboardSnapshot;
  language: LanguageCode;
  initialCustomerId?: string;
  onSnapshotChange: (next: DashboardSnapshot) => void;
  onOpenNewCustomerModal: () => void;
  onOpenVoucher: (v: VoucherPayload) => void;
}

export function CustomerRetentionView({
  snapshot,
  language,
  initialCustomerId,
  onSnapshotChange,
  onOpenNewCustomerModal,
  onOpenVoucher,
}: CustomerRetentionViewProps) {
  const [riskFilter, setRiskFilter] = useState<'ALL' | ChurnRiskLevel>('ALL');
  const [selectedId, setSelectedId] = useState<string>(initialCustomerId || snapshot.customers[0]?.id || '');
  const [busyMode, setBusyMode] = useState<'plan' | 'execute' | 'assign' | 'edit' | 'delete' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inline Customer Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editCompany, setEditCompany] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editArr, setEditArr] = useState(0);
  const [editHealth, setEditHealth] = useState(80);
  const [editRenewal, setEditRenewal] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const org = snapshot.orgSettings;

  useEffect(() => {
    if (initialCustomerId) {
      setSelectedId(initialCustomerId);
    }
  }, [initialCustomerId]);

  const filteredCustomers = snapshot.customers.filter(
    (c) => riskFilter === 'ALL' || c.churnRisk === riskFilter
  );

  const activeCustomer: CustomerAccount | null =
    snapshot.customers.find((c) => c.id === selectedId) ??
    filteredCustomers[0] ??
    snapshot.customers[0] ??
    null;

  useEffect(() => {
    if (activeCustomer) {
      setEditCompany(activeCustomer.companyName);
      setEditContact(activeCustomer.contactName);
      setEditEmail(activeCustomer.contactEmail);
      setEditArr(activeCustomer.arrUsd);
      setEditHealth(activeCustomer.healthScore);
      setEditRenewal(activeCustomer.renewalDate);
      setEditNotes(activeCustomer.notes);
      setIsEditing(false);
    }
  }, [activeCustomer?.id]);

  async function handleSaveCustomerEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCustomer) return;
    setErrorMsg(null);
    setBusyMode('edit');
    try {
      const { snapshot: nextSnap } = await crmApi.updateCustomer(activeCustomer.id, {
        companyName: editCompany,
        contactName: editContact,
        contactEmail: editEmail,
        arrUsd: editArr,
        healthScore: editHealth,
        renewalDate: editRenewal,
        notes: editNotes,
      });
      onSnapshotChange(nextSnap);
      setIsEditing(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update customer account.');
    } finally {
      setBusyMode(null);
    }
  }

  async function handleDeleteCustomer() {
    if (!activeCustomer) return;
    setErrorMsg(null);
    setBusyMode('delete');
    try {
      const { snapshot: nextSnap } = await crmApi.deleteRecord('customer', activeCustomer.id);
      onSnapshotChange(nextSnap);
      setSelectedId(nextSnap.customers[0]?.id || '');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete customer account.');
    } finally {
      setBusyMode(null);
    }
  }

  async function handleGeneratePlaybook() {
    if (!activeCustomer) return;
    setErrorMsg(null);
    setBusyMode('plan');
    try {
      const { snapshot: nextSnap } = await crmApi.generateCustomerRetentionPlan(activeCustomer.id, language);
      onSnapshotChange(nextSnap);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate retention playbook.');
    } finally {
      setBusyMode(null);
    }
  }

  async function handleExecuteIntervention() {
    if (!activeCustomer) return;
    setErrorMsg(null);
    setBusyMode('execute');
    try {
      const { snapshot: nextSnap } = await crmApi.executeCustomerRetention(activeCustomer.id);
      onSnapshotChange(nextSnap);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to execute retention outreach.');
    } finally {
      setBusyMode(null);
    }
  }

  async function handleReassignOwner(empId: string) {
    if (!activeCustomer) return;
    setErrorMsg(null);
    setBusyMode('assign');
    try {
      const { snapshot: nextSnap } = await crmApi.reassignCustomer(activeCustomer.id, empId);
      onSnapshotChange(nextSnap);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to reassign account specialist.');
    } finally {
      setBusyMode(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          {(['ALL', 'High', 'Moderate', 'Low'] as const).map((rf) => (
            <button
              key={rf}
              onClick={() => setRiskFilter(rf)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                riskFilter === rf ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {rf === 'ALL' ? 'All Accounts' : `${rf} Churn Risk`}
            </button>
          ))}
        </div>

        <button
          onClick={onOpenNewCustomerModal}
          className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'নতুন কাস্টমার অ্যাকাউন্ট' : 'Add Client Account'}</span>
        </button>
      </div>

      {errorMsg && (
        <div role="alert" className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Account Portfolio List */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-800">Customer Portfolio</span>
            <span className="font-mono tabular-nums">{filteredCustomers.length} accounts</span>
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm text-slate-600">No client accounts yet.</p>
              <button
                onClick={onOpenNewCustomerModal}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
              >
                Add First Customer Account
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredCustomers.map((cust) => {
                const isSelected = activeCustomer?.id === cust.id;
                const owner = snapshot.employees.find((e) => e.id === cust.assignedEmployeeId);
                return (
                  <button
                    key={cust.id}
                    onClick={() => setSelectedId(cust.id)}
                    className={`w-full text-left p-4 transition-colors block ${
                      isSelected ? 'bg-slate-100/90' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <AvatarView name={cust.companyName} avatarKey={cust.avatarKey} size="sm" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">{cust.companyName}</div>
                          <div className="text-xs text-slate-500 truncate">
                            {cust.contactName} · {cust.industry}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold font-mono tabular-nums text-slate-900">
                          {formatMoney(cust.arrUsd, org)}
                        </div>
                        <div className="text-xs font-mono tabular-nums text-slate-500">
                          Health {cust.healthScore}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      <span
                        className={
                          cust.churnRisk === 'High'
                            ? 'text-red-700 font-medium inline-flex items-center gap-1'
                            : cust.churnRisk === 'Moderate'
                              ? 'text-amber-700 font-medium inline-flex items-center gap-1'
                              : 'text-emerald-700 font-medium inline-flex items-center gap-1'
                        }
                      >
                        {cust.churnRisk === 'High' ? (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        )}
                        {cust.churnRisk} Risk
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">Renewal {cust.renewalDate}</span>
                      <span aria-hidden="true">·</span>
                      <span>Owner: {owner?.name ?? 'Unassigned'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Account Longevity, Invoice & Retention Playbook Studio */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
          {!activeCustomer ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Select or onboard a customer account to manage billing invoices and retention playbooks.
            </div>
          ) : (
            <>
              <div className="p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{activeCustomer.companyName}</h2>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <span>{activeCustomer.contactName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{activeCustomer.contactEmail}</span>
                      <span aria-hidden="true">·</span>
                      <span>{activeCustomer.industry}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenVoucher({ kind: 'invoice', customer: activeCustomer })}
                      className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-700" />
                      <span>{language === 'bn' ? 'ইনভয়েস প্রিন্ট' : 'Client Invoice'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsEditing((v) => !v)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isEditing ? 'Cancel' : 'Edit'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteCustomer}
                      disabled={busyMode !== null}
                      title="Delete customer account"
                      className="p-1.5 text-slate-400 hover:text-red-600 border border-slate-200 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <form onSubmit={handleSaveCustomerEdit} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-slate-700 mb-1">Company Name</label>
                        <input
                          required
                          type="text"
                          value={editCompany}
                          onChange={(e) => setEditCompany(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 mb-1">Contact Name</label>
                        <input
                          required
                          type="text"
                          value={editContact}
                          onChange={(e) => setEditContact(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-medium text-slate-700 mb-1">Contact Email</label>
                        <input
                          required
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 mb-1">
                          Annual Contract ({org.currencyCode})
                        </label>
                        <input
                          type="number"
                          value={editArr}
                          onChange={(e) => setEditArr(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 font-mono bg-white border border-slate-200 rounded"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 mb-1">Health Score (1-100)</label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={editHealth}
                          onChange={(e) => setEditHealth(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 font-mono bg-white border border-slate-200 rounded"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-medium text-slate-700 mb-1">Renewal Date</label>
                        <input
                          type="date"
                          value={editRenewal}
                          onChange={(e) => setEditRenewal(e.target.value)}
                          className="w-full px-2.5 py-1.5 font-mono bg-white border border-slate-200 rounded"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-medium text-slate-700 mb-1">Account Notes</label>
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={busyMode !== null}
                        className="px-3.5 py-1.5 font-medium text-white bg-slate-900 rounded-lg inline-flex items-center gap-1.5"
                      >
                        {busyMode === 'edit' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        <span>Save Account Changes</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-500">Assigned Account Specialist:</span>
                      <select
                        id="account-owner-select"
                        disabled={busyMode === 'assign'}
                        value={activeCustomer.assignedEmployeeId}
                        onChange={(e) => handleReassignOwner(e.target.value)}
                        className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-900"
                      >
                        {snapshot.employees
                          .filter((emp) => emp.employmentStatus !== 'Offboarded')
                          .map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} ({emp.activeAccountsCount}/{emp.maxCapacity})
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Telemetry Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100">
                      <div>
                        <div className="text-xs text-slate-500">Contract ARR</div>
                        <div className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                          {formatMoney(activeCustomer.arrUsd, org)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Health Index</div>
                        <div className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                          {activeCustomer.healthScore}/100
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Active Seat Ratio</div>
                        <div className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                          {Math.round(activeCustomer.activeSeatsRatio * 100)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Renewal Date</div>
                        <div className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                          {activeCustomer.renewalDate}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed pt-2 border-t border-slate-100">
                      <span className="font-semibold text-slate-800">Account Context: </span>
                      {activeCustomer.notes}
                    </p>
                  </>
                )}
              </div>

              {/* AI Retention Playbook Section */}
              <div className="p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {language === 'bn'
                        ? 'AI ৩-ধাপের দীর্ঘমেয়াদী কাস্টমার রিটেনশন প্লেবুক'
                        : 'AI 3-Horizon Long-Term Retention Playbook'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Synthesizes account usage, renewal proximity, and email sentiment into multi-year lock-in steps
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGeneratePlaybook}
                      disabled={busyMode !== null}
                      className="px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      {busyMode === 'plan' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {language === 'bn' ? 'AI রিটেনশন প্ল্যান তৈরি করুন' : 'Generate AI Retention Plan'}
                      </span>
                    </button>

                    {activeCustomer.retentionPlan && (
                      <button
                        onClick={handleExecuteIntervention}
                        disabled={busyMode !== null}
                        className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        {busyMode === 'execute' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {language === 'bn' ? 'রিটেনশন ইন্টারভেনশন চালু করুন' : 'Execute Retention Outreach'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {!activeCustomer.retentionPlan ? (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 text-center">
                    Click "Generate AI Retention Plan" to build a custom 7-day, 30-day, and 90-day renewal lock-in strategy.
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs leading-relaxed">
                      <p className="text-slate-700">
                        <span className="font-semibold text-slate-900">Diagnostic Summary: </span>
                        {activeCustomer.retentionPlan.riskSummary}
                      </p>
                      <p className="text-slate-700">
                        <span className="font-semibold text-slate-900">Recommended Loyalty Structure: </span>
                        {activeCustomer.retentionPlan.loyaltyIncentive}
                      </p>
                    </div>

                    <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                      {activeCustomer.retentionPlan.steps.map((step, idx) => (
                        <div key={idx} className="p-4 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-900">
                              0{idx + 1}. {step.actionTitle}
                            </span>
                            <span className="font-mono tabular-nums text-blue-700 font-medium">
                              {step.horizon}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{step.executionDetail}</p>
                          <div className="text-xs text-emerald-700 font-medium inline-flex items-center gap-1 pt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Target Outcome: {step.expectedImpact}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                      <div className="text-xs font-semibold text-slate-900">
                        Proactive Executive Outreach: {activeCustomer.retentionPlan.outreachSubject}
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {activeCustomer.retentionPlan.outreachBody}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
