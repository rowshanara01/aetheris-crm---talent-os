import React, { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type {
  CandidateProfile,
  DashboardSnapshot,
  DealOpportunity,
  DealStage,
  EmploymentStatus,
} from '../shared/types';
import { crmApi } from '../services/crmApi';

interface ModalProps {
  modalType: 'email' | 'candidate' | 'customer' | 'directHire' | 'deal' | null;
  snapshot: DashboardSnapshot;
  onClose: () => void;
  onSnapshotChange: (next: DashboardSnapshot, focusId?: string) => void;
}

export function ActionModals({ modalType, snapshot, onClose, onSnapshotChange }: ModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const org = snapshot.orgSettings;
  const currencyCode = org?.currencyCode || 'USD';
  const activeEmployees = snapshot.employees.filter((e) => e.employmentStatus !== 'Offboarded');

  // Inbound Email State (supports both existing CRM account and external/new sender)
  const [emailSourceMode, setEmailSourceMode] = useState<'account' | 'external'>(
    snapshot.customers.length > 0 ? 'account' : 'external'
  );
  const [emailCustId, setEmailCustId] = useState(snapshot.customers[0]?.id ?? '');
  const [extSenderName, setExtSenderName] = useState('');
  const [extSenderCompany, setExtSenderCompany] = useState('');
  const [extSenderEmail, setExtSenderEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // Deal Opportunity State
  const [dealTitle, setDealTitle] = useState('');
  const [dealCustId, setDealCustId] = useState(snapshot.customers[0]?.id ?? '');
  const [dealCompany, setDealCompany] = useState('');
  const [dealType, setDealType] = useState<DealOpportunity['dealType']>(
    snapshot.customers.length > 0 ? 'Seat Expansion' : 'New Enterprise Logo'
  );
  const [dealStage, setDealStage] = useState<DealStage>('Discovery');
  const [dealValue, setDealValue] = useState(65000);
  const [dealCloseDate, setDealCloseDate] = useState('2026-12-20');
  const [dealOwnerId, setDealOwnerId] = useState(activeEmployees[0]?.id ?? '');
  const [dealNotes, setDealNotes] = useState('');

  // Candidate State
  const [candName, setCandName] = useState('');
  const [candEmail, setCandEmail] = useState('');
  const [candRole, setCandRole] = useState('Senior Customer Success Architect');
  const [candDept, setCandDept] = useState<CandidateProfile['department']>('Customer Success');
  const [candExp, setCandExp] = useState(5);
  const [candSkills, setCandSkills] = useState('Enterprise Retention, Executive QBR, SLA Escalation');
  const [candSummary, setCandSummary] = useState('');

  // Direct Hire Employee State
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empRole, setEmpRole] = useState('Enterprise Support & Retention Specialist');
  const [empDept, setEmpDept] = useState('Customer Success');
  const [empSalary, setEmpSalary] = useState(5200);
  const [empStatus, setEmpStatus] = useState<EmploymentStatus>('Active');
  const [empSkills, setEmpSkills] = useState('Bengali & English Support, SLA Escalation, Enterprise CRM');

  // Customer Account State
  const [compName, setCompName] = useState('');
  const [industry, setIndustry] = useState('Enterprise Fintech');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [arrUsd, setArrUsd] = useState(120000);
  const [renewalDate, setRenewalDate] = useState('2027-10-31');
  const [notes, setNotes] = useState('');

  if (!modalType) return null;

  async function handleDealSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const linkedCust =
        dealType === 'New Enterprise Logo'
          ? undefined
          : snapshot.customers.find((c) => c.id === dealCustId);
      const { deal, snapshot: nextSnap } = await crmApi.createDeal({
        title: dealTitle,
        customerId: linkedCust?.id,
        companyName: linkedCust?.companyName || dealCompany || 'Enterprise Prospect',
        dealType,
        stage: dealStage,
        valueUsd: dealValue,
        expectedCloseDate: dealCloseDate,
        ownerEmployeeId: dealOwnerId || activeEmployees[0]?.id,
        notes: dealNotes,
      });
      onSnapshotChange(nextSnap, deal.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create deal opportunity.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const useAccount = emailSourceMode === 'account' && snapshot.customers.length > 0;
      const linked = useAccount ? snapshot.customers.find((c) => c.id === emailCustId) : undefined;
      const { email, snapshot: nextSnap } = await crmApi.createEmail({
        customerId: linked?.id,
        companyName: linked?.companyName || extSenderCompany || 'External Client',
        customerName: linked?.contactName || extSenderName || 'Client Contact',
        customerEmail: linked?.contactEmail || extSenderEmail || 'client@company.com',
        subject: emailSubject,
        inboundBody: emailBody,
      });
      onSnapshotChange(nextSnap, email.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log inbound email.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCandidateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { candidate, snapshot: nextSnap } = await crmApi.createCandidate({
        name: candName,
        email: candEmail,
        role: candRole,
        department: candDept,
        experienceYears: candExp,
        skills: candSkills,
        resumeSummary: candSummary,
      });
      onSnapshotChange(nextSnap, candidate.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add candidate.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDirectHireSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { employee, snapshot: nextSnap } = await crmApi.directHireEmployee({
        name: empName,
        email: empEmail,
        role: empRole,
        department: empDept,
        skills: empSkills,
        baseSalaryUsd: empSalary,
        employmentStatus: empStatus,
      });
      onSnapshotChange(nextSnap, employee.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not onboard employee.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCustomerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { customer, snapshot: nextSnap } = await crmApi.createCustomer({
        companyName: compName,
        industry,
        contactName,
        contactEmail,
        arrUsd,
        renewalDate,
        assignedEmployeeId: activeEmployees[0]?.id,
        notes,
      });
      onSnapshotChange(nextSnap, customer.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create customer account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full max-h-[90dvh] flex flex-col overflow-hidden shadow-lg my-auto">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <h2 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
            {modalType === 'deal' && 'Create Commercial Deal Opportunity'}
            {modalType === 'email' && 'Log Inbound Client Email'}
            {modalType === 'candidate' && 'Add Candidate for AI Interview & Selection'}
            {modalType === 'directHire' && 'Direct Employee Hire & Payroll Enrollment'}
            {modalType === 'customer' && 'Onboard Enterprise Customer Account'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              {error}
            </div>
          )}

          {modalType === 'deal' && (
            <form onSubmit={handleDealSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Deal Opportunity Title
                </label>
                <input
                  required
                  type="text"
                  value={dealTitle}
                  onChange={(e) => setDealTitle(e.target.value)}
                  placeholder="e.g. Dhaka Bank — 80-Seat Enterprise CRM Rollout"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Deal Type</label>
                  <select
                    value={dealType}
                    onChange={(e) => setDealType(e.target.value as DealOpportunity['dealType'])}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="Seat Expansion">Seat Expansion</option>
                    <option value="Multi-Year Renewal">Multi-Year Renewal</option>
                    <option value="New Enterprise Logo">New Enterprise Logo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Initial Stage</label>
                  <select
                    value={dealStage}
                    onChange={(e) => setDealStage(e.target.value as DealStage)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="Discovery">Discovery (25%)</option>
                    <option value="Technical Validation">Technical Validation (50%)</option>
                    <option value="Executive Proposal">Executive Proposal (70%)</option>
                    <option value="Contract Negotiation">Contract Negotiation (85%)</option>
                  </select>
                </div>
              </div>

              {dealType === 'New Enterprise Logo' || snapshot.customers.length === 0 ? (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Prospect Company Name
                  </label>
                  <input
                    required
                    type="text"
                    value={dealCompany}
                    onChange={(e) => setDealCompany(e.target.value)}
                    placeholder="e.g. Jamuna Cloud Systems"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Linked Enterprise Customer
                  </label>
                  <select
                    value={dealCustId}
                    onChange={(e) => setDealCustId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  >
                    {snapshot.customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName} ({org?.currencySymbol || '$'}
                        {c.arrUsd.toLocaleString()} ARR)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Contract Value ({currencyCode})
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={dealValue}
                    onChange={(e) => setDealValue(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Expected Close Date
                  </label>
                  <input
                    type="date"
                    value={dealCloseDate}
                    onChange={(e) => setDealCloseDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Deal Owner (Earns Closing Commission)
                </label>
                <select
                  value={dealOwnerId}
                  onChange={(e) => setDealOwnerId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                >
                  {activeEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Scope & Commercial Notes
                </label>
                <textarea
                  rows={2}
                  value={dealNotes}
                  onChange={(e) => setDealNotes(e.target.value)}
                  placeholder="Key buyer requirements, seat volume, SLA terms..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Deal</span>
                </button>
              </div>
            </form>
          )}

          {modalType === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {snapshot.customers.length > 0 && (
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setEmailSourceMode('account')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      emailSourceMode === 'account'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Existing CRM Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailSourceMode('external')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      emailSourceMode === 'external'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    New / External Sender
                  </button>
                </div>
              )}

              {emailSourceMode === 'account' && snapshot.customers.length > 0 ? (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Enterprise Account Sender
                  </label>
                  <select
                    value={emailCustId}
                    onChange={(e) => setEmailCustId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  >
                    {snapshot.customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName} — {c.contactName} ({c.contactEmail})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Sender Name</label>
                    <input
                      required
                      type="text"
                      value={extSenderName}
                      onChange={(e) => setExtSenderName(e.target.value)}
                      placeholder="e.g. Kamal Hossain"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Company</label>
                    <input
                      required
                      type="text"
                      value={extSenderCompany}
                      onChange={(e) => setExtSenderCompany(e.target.value)}
                      placeholder="e.g. Pran-RFL Group"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Sender Email</label>
                    <input
                      required
                      type="email"
                      value={extSenderEmail}
                      onChange={(e) => setExtSenderEmail(e.target.value)}
                      placeholder="kamal@company.com"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Subject</label>
                <input
                  required
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="e.g. API rate limit upgrade & multi-year SLA inquiry"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Client Email Message (English or বাংলা)
                </label>
                <textarea
                  required
                  rows={4}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Paste or type inbound client inquiry or escalation..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Log Inbound Email</span>
                </button>
              </div>
            </form>
          )}

          {modalType === 'candidate' && (
            <form onSubmit={handleCandidateSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    required
                    type="text"
                    value={candName}
                    onChange={(e) => setCandName(e.target.value)}
                    placeholder="e.g. Tariqul Alam"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                  <input
                    required
                    type="email"
                    value={candEmail}
                    onChange={(e) => setCandEmail(e.target.value)}
                    placeholder="tariq@domain.com"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Target Role</label>
                  <input
                    required
                    type="text"
                    value={candRole}
                    onChange={(e) => setCandRole(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Experience (Yrs)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={candExp}
                    onChange={(e) => setCandExp(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-mono tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
                <select
                  value={candDept}
                  onChange={(e) => setCandDept(e.target.value as CandidateProfile['department'])}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                >
                  <option value="Customer Success">Customer Success</option>
                  <option value="Solutions Engineering">Solutions Engineering</option>
                  <option value="Enterprise Sales">Enterprise Sales</option>
                  <option value="Platform Operations">Platform Operations</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Skills (comma separated)
                </label>
                <input
                  type="text"
                  value={candSkills}
                  onChange={(e) => setCandSkills(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Resume & Retention Track Summary
                </label>
                <textarea
                  rows={3}
                  value={candSummary}
                  onChange={(e) => setCandSummary(e.target.value)}
                  placeholder="Key enterprise achievements, client retention metrics, technical depth..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Start AI Interview Pipeline</span>
                </button>
              </div>
            </form>
          )}

          {modalType === 'directHire' && (
            <form onSubmit={handleDirectHireSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Employee Name</label>
                  <input
                    required
                    type="text"
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    placeholder="e.g. Arifur Rahman"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Work Email</label>
                  <input
                    required
                    type="email"
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    placeholder="arif@aetheris.io"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Role Title</label>
                  <input
                    required
                    type="text"
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
                  <select
                    value={empDept}
                    onChange={(e) => setEmpDept(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="Customer Success">Customer Success</option>
                    <option value="Solutions Engineering">Solutions Engineering</option>
                    <option value="Enterprise Sales">Enterprise Sales</option>
                    <option value="Platform Operations">Platform Operations</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Monthly Base Salary ({currencyCode})
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={100}
                    value={empSalary}
                    onChange={(e) => setEmpSalary(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Employment Tier</label>
                  <select
                    value={empStatus}
                    onChange={(e) => setEmpStatus(e.target.value as EmploymentStatus)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="Active">Active (Permanent)</option>
                    <option value="Probation">Probation (90-Day)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Core Skills (comma separated)
                </label>
                <input
                  type="text"
                  value={empSkills}
                  onChange={(e) => setEmpSkills(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Hire & Enroll in Payroll</span>
                </button>
              </div>
            </form>
          )}

          {modalType === 'customer' && (
            <form onSubmit={handleCustomerSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Company Name</label>
                  <input
                    required
                    type="text"
                    value={compName}
                    onChange={(e) => setCompName(e.target.value)}
                    placeholder="e.g. Bengal Logistics Corp"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Industry</label>
                  <input
                    required
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Executive Contact</label>
                  <input
                    required
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Nadia Karim"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Contact Email</label>
                  <input
                    required
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="nadia@bengallogistics.com"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Annual ARR ({currencyCode})
                  </label>
                  <input
                    type="number"
                    min={5000}
                    step={1000}
                    value={arrUsd}
                    onChange={(e) => setArrUsd(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Renewal Date</label>
                  <input
                    type="date"
                    value={renewalDate}
                    onChange={(e) => setRenewalDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-mono tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Retention Priorities</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Key business goals and multi-year adoption milestones..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Onboard Account</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
