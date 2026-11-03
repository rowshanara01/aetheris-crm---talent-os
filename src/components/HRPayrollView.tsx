import React, { useEffect, useState } from 'react';
import {
  Calculator,
  Calendar,
  CheckCircle2,
  DollarSign,
  Download,
  FileText,
  Loader2,
  RotateCcw,
  Sparkles,
  UserMinus,
  UserPlus,
  XCircle,
} from 'lucide-react';
import type { DashboardSnapshot, EmploymentStatus, LanguageCode, LeaveRequest } from '../shared/types';
import { crmApi } from '../services/crmApi';
import { formatMoney } from '../utils/formatters';
import { AvatarView } from './AvatarView';
import type { VoucherPayload } from './DocumentVoucherModal';

interface HRPayrollViewProps {
  snapshot: DashboardSnapshot;
  language: LanguageCode;
  initialEmployeeId?: string;
  onSnapshotChange: (next: DashboardSnapshot) => void;
  onOpenDirectHireModal: () => void;
  onOpenVoucher: (v: VoucherPayload) => void;
}

export function HRPayrollView({
  snapshot,
  language,
  initialEmployeeId,
  onSnapshotChange,
  onOpenDirectHireModal,
  onOpenVoucher,
}: HRPayrollViewProps) {
  const org = snapshot.orgSettings;
  const [subView, setSubView] = useState<'workforce' | 'payroll' | 'attendance'>('workforce');
  const [statusFilter, setStatusFilter] = useState<'ALL' | EmploymentStatus>('ALL');
  const [selectedEmpId, setSelectedEmpId] = useState<string>(
    initialEmployeeId || snapshot.employees[0]?.id || ''
  );

  // Salary Editor State
  const [editBase, setEditBase] = useState<number>(5200);
  const [editBonus, setEditBonus] = useState<number>(500);
  const [editStatus, setEditStatus] = useState<EmploymentStatus>('Active');

  // Offboarding State
  const [offboardReason, setOffboardReason] = useState<string>('Performance Below SLA Target');
  const [handoverEmpId, setHandoverEmpId] = useState<string>('');

  // Payroll Period State
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-11');

  // Leave Request Form State
  const activeWorkforce = snapshot.employees.filter((e) => e.employmentStatus !== 'Offboarded');
  const [leaveEmpId, setLeaveEmpId] = useState<string>(activeWorkforce[0]?.id ?? '');
  const [leaveType, setLeaveType] = useState<LeaveRequest['leaveType']>('AnnualPaid');
  const [leaveStart, setLeaveStart] = useState<string>('2026-11-24');
  const [leaveEnd, setLeaveEnd] = useState<string>('2026-11-26');
  const [leaveDays, setLeaveDays] = useState<number>(3);
  const [leaveReason, setLeaveReason] = useState<string>('');

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialEmployeeId) {
      setSelectedEmpId(initialEmployeeId);
    }
  }, [initialEmployeeId]);

  const filteredEmployees = snapshot.employees.filter(
    (e) => statusFilter === 'ALL' || e.employmentStatus === statusFilter
  );

  const activeEmployee =
    snapshot.employees.find((e) => e.id === selectedEmpId) ??
    filteredEmployees[0] ??
    snapshot.employees[0] ??
    null;

  const activeSuccessors = snapshot.employees.filter(
    (e) => e.id !== activeEmployee?.id && e.employmentStatus !== 'Offboarded'
  );

  useEffect(() => {
    if (activeEmployee) {
      setEditBase(activeEmployee.baseSalaryUsd);
      setEditBonus(activeEmployee.performanceBonusUsd);
      setEditStatus(
        activeEmployee.employmentStatus === 'Offboarded' ? 'Active' : activeEmployee.employmentStatus
      );
      setHandoverEmpId(activeSuccessors[0]?.id ?? '');
    }
  }, [
    activeEmployee?.id,
    activeEmployee?.baseSalaryUsd,
    activeEmployee?.performanceBonusUsd,
    activeEmployee?.employmentStatus,
  ]);

  const offboardedCount = snapshot.employees.filter((e) => e.employmentStatus === 'Offboarded').length;
  const monthlyGrossLiability = activeWorkforce.reduce(
    (sum, e) => sum + e.baseSalaryUsd + e.performanceBonusUsd,
    0
  );

  const periodPayroll = (snapshot.payroll ?? []).filter((p) => p.periodMonth === selectedPeriod);
  const pendingSlips = periodPayroll.filter((p) => p.status === 'Pending');
  const totalPeriodNet = periodPayroll.reduce((sum, p) => sum + p.netPayUsd, 0);
  const pendingLeavesCount = (snapshot.leaveRequests ?? []).filter((l) => l.status === 'Pending').length;

  async function handleSaveCompensation() {
    if (!activeEmployee) return;
    setErrorMsg(null);
    setBusyAction('save-comp');
    try {
      const { snapshot: nextSnap } = await crmApi.updateEmployeeCompensation(
        activeEmployee.id,
        editBase,
        editBonus,
        editStatus
      );
      onSnapshotChange(nextSnap);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update salary structure.');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRunAiAudit() {
    if (!activeEmployee) return;
    setErrorMsg(null);
    setBusyAction('ai-audit');
    try {
      const { employee, snapshot: nextSnap } = await crmApi.runEmployeeCompReview(
        activeEmployee.id,
        language
      );
      onSnapshotChange(nextSnap);
      if (employee.compReview) {
        setEditBase(employee.compReview.recommendedBaseUsd);
        setEditBonus(employee.compReview.recommendedBonusUsd);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to run AI compensation audit.');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleOffboard() {
    if (!activeEmployee) return;
    setErrorMsg(null);
    setBusyAction('offboard');
    try {
      const { snapshot: nextSnap } = await crmApi.offboardEmployee(
        activeEmployee.id,
        offboardReason,
        handoverEmpId || undefined
      );
      onSnapshotChange(nextSnap);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to offboard employee.');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleReinstate() {
    if (!activeEmployee) return;
    setErrorMsg(null);
    setBusyAction('reinstate');
    try {
      const { snapshot: nextSnap } = await crmApi.reinstateEmployee(activeEmployee.id);
      onSnapshotChange(nextSnap);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to reinstate employee.');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleGeneratePayrollBatch() {
    setErrorMsg(null);
    setBusyAction('gen-payroll');
    try {
      const { snapshot: nextSnap } = await crmApi.generatePayrollBatch(selectedPeriod);
      onSnapshotChange(nextSnap);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to calculate monthly payroll.');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDisburseSingle(payrollId: string) {
    setErrorMsg(null);
    setBusyAction(payrollId);
    try {
      const { snapshot: nextSnap } = await crmApi.disbursePayroll({ payrollId });
      onSnapshotChange(nextSnap);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to disburse payslip.');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDisburseAllPeriod() {
    setErrorMsg(null);
    setBusyAction('pay-all');
    try {
      const { snapshot: nextSnap } = await crmApi.disbursePayroll({ periodMonth: selectedPeriod });
      onSnapshotChange(nextSnap);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to disburse payroll batch.');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreateLeave(e: React.FormEvent) {
    e.preventDefault();
    if (!leaveEmpId) return;
    setErrorMsg(null);
    setBusyAction('create-leave');
    try {
      const { snapshot: nextSnap } = await crmApi.createLeaveRequest({
        employeeId: leaveEmpId,
        leaveType,
        startDate: leaveStart,
        endDate: leaveEnd,
        daysCount: leaveDays,
        reason: leaveReason || 'Planned leave with client handover runbook',
      });
      onSnapshotChange(nextSnap);
      setLeaveReason('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit leave request.');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleReviewLeave(leaveId: string, decision: 'Approved' | 'Declined') {
    setErrorMsg(null);
    setBusyAction(`${leaveId}-${decision}`);
    try {
      const { snapshot: nextSnap } = await crmApi.reviewLeaveRequest(leaveId, decision);
      onSnapshotChange(nextSnap);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to review leave request.');
    } finally {
      setBusyAction(null);
    }
  }

  function handleExportCsv() {
    const rows = [
      [
        'Payslip ID',
        'Period',
        'Employee Name',
        'Role',
        'Department',
        `Base (${org?.currencyCode || 'USD'})`,
        `Bonus (${org?.currencyCode || 'USD'})`,
        `Tax (${org?.currencyCode || 'USD'})`,
        `Net Pay (${org?.currencyCode || 'USD'})`,
        'Status',
        'Disbursed At',
      ],
      ...periodPayroll.map((p) => [
        p.id,
        p.periodMonth,
        p.employeeName,
        p.role,
        p.department,
        String(p.baseSalaryUsd),
        String(p.performanceBonusUsd),
        String(p.taxDeductionUsd),
        String(p.netPayUsd),
        p.status,
        p.disbursedAt ?? '',
      ]),
    ];
    const csvContent = rows
      .map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aetheris-payroll-${selectedPeriod}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Top 4-Column HR, Attendance & Payroll Summary Strip */}
      <section className="bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">
            {language === 'bn' ? 'সক্রিয় এমপ্লয়ি ও স্ট্যাটাস' : 'Active Workforce Roster'}
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {activeWorkforce.length} Active
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            {offboardedCount} Offboarded · {snapshot.candidates.length} In Interview
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">
            {language === 'bn' ? 'মাসিক মোট বেতন ও বোনাস বাজেট' : 'Monthly Gross Payroll'}
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {formatMoney(monthlyGrossLiability, org)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Base Salary + Deal & KPI Bonuses</div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">
            {language === 'bn' ? `${selectedPeriod} নিট পে-রোল` : `${selectedPeriod} Net Disbursement`}
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-blue-700 mt-1">
            {formatMoney(totalPeriodNet, org)}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            {pendingSlips.length} Pending · {periodPayroll.length - pendingSlips.length} Paid
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">
            {language === 'bn' ? 'গড় উপস্থিতি (Attendance) ও ছুটি' : 'Team Attendance & Leave Cover'}
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
            {(
              activeWorkforce.reduce((s, e) => s + (e.attendanceRatePct ?? 98.5), 0) /
              Math.max(1, activeWorkforce.length)
            ).toFixed(1)}
            %
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            {pendingLeavesCount} Leave Request(s) Pending
          </div>
        </div>
      </section>

      {/* Primary Mode Switcher + Direct Hire CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
          <button
            onClick={() => setSubView('workforce')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subView === 'workforce' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {language === 'bn' ? 'নিয়োগ, বেতন নির্ধারণ ও ছাঁটাই' : 'Hiring, Salary & Offboarding'}
          </button>
          <button
            onClick={() => setSubView('payroll')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subView === 'payroll' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {language === 'bn' ? 'মাসিক বেতন ও পে-স্লিপ লেজার' : 'Monthly Payroll & Payslips'}
          </button>
          <button
            onClick={() => setSubView('attendance')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subView === 'attendance'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {language === 'bn'
              ? `হাজিরা, ছুটি ও ব্যাকআপ কভার (${pendingLeavesCount})`
              : `Attendance & Leave Cover (${pendingLeavesCount})`}
          </button>
        </div>

        <button
          onClick={onOpenDirectHireModal}
          className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'নতুন এমপ্লয়ি সরাসরি নিয়োগ' : 'Direct Hire Employee'}</span>
        </button>
      </div>

      {errorMsg && (
        <div role="alert" className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          {errorMsg}
        </div>
      )}

      {subView === 'workforce' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Workforce Roster */}
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800">Employee Lifecycle Roster</span>
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md">
                {(['ALL', 'Active', 'Probation', 'Offboarded'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                      statusFilter === st ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {filteredEmployees.map((emp) => {
                const isSelected = activeEmployee?.id === emp.id;
                const netMonthly = Math.max(
                  0,
                  emp.baseSalaryUsd + emp.performanceBonusUsd - emp.taxDeductionUsd
                );
                return (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmpId(emp.id)}
                    className={`w-full text-left p-4 transition-colors block ${
                      isSelected ? 'bg-slate-100/90' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <AvatarView name={emp.name} avatarKey={emp.avatarKey} size="md" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">{emp.name}</div>
                          <div className="text-xs text-slate-500 truncate">{emp.role}</div>
                        </div>
                      </div>
                      <div className="text-right font-mono tabular-nums shrink-0">
                        <div className="text-xs font-bold text-slate-900">
                          {formatMoney(netMonthly, org)}/mo
                        </div>
                        <div className="text-[11px] text-slate-500">Net Take-Home</div>
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      <span
                        className={
                          emp.employmentStatus === 'Offboarded'
                            ? 'text-red-700 font-medium'
                            : emp.employmentStatus === 'Probation'
                              ? 'text-amber-700 font-medium'
                              : 'text-emerald-700 font-medium'
                        }
                      >
                        {emp.employmentStatus}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        Base {formatMoney(emp.baseSalaryUsd, org)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        Att {(emp.attendanceRatePct ?? 98.5).toFixed(1)}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Right Salary Structure, AI Audit & Offboarding Control */}
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
            {!activeEmployee ? (
              <div className="p-10 text-center text-sm text-slate-500">
                Select an employee to manage compensation, performance standing, or offboarding.
              </div>
            ) : (
              <>
                <div className="p-6 flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <AvatarView name={activeEmployee.name} avatarKey={activeEmployee.avatarKey} size="lg" />
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{activeEmployee.name}</h2>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {activeEmployee.role} · {activeEmployee.department} · Status:{' '}
                        <strong className="text-slate-800">{activeEmployee.employmentStatus}</strong>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                        Joined {activeEmployee.joinedAt} · CSAT {activeEmployee.csatScore}% · Attendance{' '}
                        {(activeEmployee.attendanceRatePct ?? 98.5).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleRunAiAudit}
                    disabled={busyAction !== null}
                    className="px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    {busyAction === 'ai-audit' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {language === 'bn' ? 'AI বেতন ও পারফরম্যান্স অডিট' : 'AI Salary & Performance Audit'}
                    </span>
                  </button>
                </div>

                {activeEmployee.compReview && (
                  <div className="p-6 bg-slate-50/70 space-y-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">
                        AI Standing Verdict: {activeEmployee.compReview.standingVerdict}
                      </span>
                      <span className="font-mono tabular-nums text-blue-700 font-semibold">
                        Suggested Base {formatMoney(activeEmployee.compReview.recommendedBaseUsd, org)} + Bonus{' '}
                        {formatMoney(activeEmployee.compReview.recommendedBonusUsd, org)}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{activeEmployee.compReview.rationale}</p>
                    <p className="text-slate-600">
                      <strong className="text-slate-900">HR Recommendation: </strong>
                      {activeEmployee.compReview.hrActionNote}
                    </p>
                  </div>
                )}

                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-700" />
                      <span>
                        {language === 'bn'
                          ? 'বেতন কাঠামো ও বোনাস নির্ধারণ (Salary & Bonus)'
                          : 'Monthly Salary, Bonus & Tier Adjustment'}
                      </span>
                    </h3>
                    <span className="text-xs font-mono tabular-nums text-slate-500">
                      Est. Net:{' '}
                      {formatMoney(
                        Math.max(
                          0,
                          editBase +
                            editBonus -
                            Math.round((editBase + editBonus) * (editBase + editBonus >= 6000 ? 0.1 : 0.08))
                        ),
                        org
                      )}
                      /mo
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Base Salary ({org?.currencyCode || 'USD'} / Month)
                      </label>
                      <input
                        type="number"
                        min={500}
                        step={100}
                        value={editBase}
                        onChange={(e) => setEditBase(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Performance Bonus ({org?.currencyCode || 'USD'})
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={editBonus}
                        onChange={(e) => setEditBonus(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Employment Standing
                      </label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as EmploymentStatus)}
                        disabled={activeEmployee.employmentStatus === 'Offboarded'}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                      >
                        <option value="Active">Active (Permanent)</option>
                        <option value="Probation">Probation (90-Day Review)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveCompensation}
                      disabled={busyAction !== null || activeEmployee.employmentStatus === 'Offboarded'}
                      className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {busyAction === 'save-comp' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{language === 'bn' ? 'বেতন ও বোনাস আপডেট করুন' : 'Save Compensation Structure'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {activeEmployee.employmentStatus === 'Offboarded' ? (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1 text-xs">
                        <div className="font-semibold text-red-800">
                          Offboarded on {activeEmployee.offboardedAt}
                        </div>
                        <p className="text-slate-600">Reason: {activeEmployee.offboardReason}</p>
                      </div>
                      <button
                        onClick={handleReinstate}
                        disabled={busyAction !== null}
                        className="px-4 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        {busyAction === 'reinstate' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        <span>{language === 'bn' ? 'পুনর্বহাল করুন (Reinstate)' : 'Reinstate to Active Team'}</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                          <UserMinus className="w-4 h-4 text-red-700" />
                          <span>
                            {language === 'bn'
                              ? 'নিয়ন্ত্রিত ছাঁটাই / অব্যাহতি ও কাস্টমার হ্যান্ডওভার (Offboarding)'
                              : 'Controlled Offboarding / Termination & Account Handover'}
                          </span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Automatically transfers {activeEmployee.activeAccountsCount} client account(s) & open deals so zero customers are left unattended
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Offboarding / Termination Reason
                          </label>
                          <select
                            value={offboardReason}
                            onChange={(e) => setOffboardReason(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                          >
                            <option value="Performance Below SLA Target">Performance Below SLA Target</option>
                            <option value="Organizational Restructuring">Organizational Restructuring</option>
                            <option value="Voluntary Resignation">Voluntary Resignation</option>
                            <option value="Compliance / Policy Breach">Compliance / Policy Breach</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Handover Client Accounts To
                          </label>
                          <select
                            value={handoverEmpId}
                            onChange={(e) => setHandoverEmpId(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                          >
                            {activeSuccessors.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.activeAccountsCount}/{s.maxCapacity} load · CSAT {s.csatScore}%)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={handleOffboard}
                          disabled={busyAction !== null || activeSuccessors.length === 0}
                          className="px-4 py-2 text-xs font-medium text-white bg-red-700 hover:bg-red-800 rounded-lg disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                        >
                          {busyAction === 'offboard' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserMinus className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {language === 'bn'
                              ? 'অব্যাহতি দিন ও কাস্টমার হস্তান্তর করুন'
                              : 'Execute Offboarding & Handover'}
                          </span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {subView === 'payroll' && (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="payroll-period" className="text-xs font-semibold text-slate-800">
                Payroll Cycle:
              </label>
              <select
                id="payroll-period"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900"
              >
                <option value="2026-11">2026-11 (Current Cycle)</option>
                <option value="2026-10">2026-10 (Previous Cycle)</option>
                <option value="2026-12">2026-12 (Next Cycle)</option>
              </select>

              <button
                onClick={handleGeneratePayrollBatch}
                disabled={busyAction !== null}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                {busyAction === 'gen-payroll' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Calculator className="w-3.5 h-3.5 text-blue-700" />
                )}
                <span>
                  {language === 'bn' ? 'Python KPI পে-রোল হিসাব করুন' : 'Recalculate KPI Payroll'}
                </span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleExportCsv}
                disabled={periodPayroll.length === 0}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV</span>
              </button>

              <button
                onClick={handleDisburseAllPeriod}
                disabled={busyAction !== null || pendingSlips.length === 0}
                className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                {busyAction === 'pay-all' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>
                  {language === 'bn'
                    ? `সকল বকেয়া বেতন পরিশোধ (${pendingSlips.length})`
                    : `Disburse All Pending (${pendingSlips.length})`}
                </span>
              </button>
            </div>
          </div>

          {periodPayroll.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm text-slate-600">
                No payroll slips generated for {selectedPeriod} yet.
              </p>
              <button
                onClick={handleGeneratePayrollBatch}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
              >
                Generate {selectedPeriod} Payroll Batch
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 bg-slate-50/80">
                    <th className="py-3 px-6">Employee</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4 text-right">Base Salary</th>
                    <th className="py-3 px-4 text-right">KPI & Deal Bonus</th>
                    <th className="py-3 px-4 text-right">Tax Withheld</th>
                    <th className="py-3 px-4 text-right">Net Pay</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {periodPayroll.map((slip) => (
                    <tr key={slip.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="font-medium text-slate-900">{slip.employeeName}</div>
                        <div className="text-xs text-slate-500">{slip.role}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                        {slip.department}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-slate-700 whitespace-nowrap">
                        {formatMoney(slip.baseSalaryUsd, org)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-emerald-700 whitespace-nowrap">
                        +{formatMoney(slip.performanceBonusUsd, org)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-slate-500 whitespace-nowrap">
                        -{formatMoney(slip.taxDeductionUsd, org)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs font-bold text-slate-900 whitespace-nowrap">
                        {formatMoney(slip.netPayUsd, org)}
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        {slip.status === 'Disbursed' ? (
                          <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Disbursed
                          </span>
                        ) : (
                          <span className="text-amber-700 font-medium">Pending</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            onClick={() => onOpenVoucher({ kind: 'payslip', record: slip })}
                            className="px-2.5 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-700" />
                            <span>{language === 'bn' ? 'ভাউচার / পে-স্লিপ' : 'Payslip'}</span>
                          </button>

                          {slip.status === 'Pending' ? (
                            <button
                              onClick={() => handleDisburseSingle(slip.id)}
                              disabled={busyAction !== null}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-50 inline-flex items-center gap-1"
                            >
                              {busyAction === slip.id && <Loader2 className="w-3 h-3 animate-spin" />}
                              <span>{language === 'bn' ? 'বেতন দিন' : 'Pay Now'}</span>
                            </button>
                          ) : (
                            <span className="text-xs font-mono tabular-nums text-slate-400">
                              {slip.disbursedAt ? new Date(slip.disbursedAt).toLocaleDateString() : 'Paid'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {subView === 'attendance' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Submit Leave Request Form */}
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-700" />
                <span>
                  {language === 'bn'
                    ? 'নতুন ছুটির আবেদন ও SLA কভার (Submit Leave)'
                    : 'Log Leave Request & SLA Backup Cover'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Approved leaves automatically assign an active backup specialist; unpaid leave adjusts pending payroll pro-rata.
              </p>
            </div>

            <form onSubmit={handleCreateLeave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Employee</label>
                <select
                  value={leaveEmpId}
                  onChange={(e) => setLeaveEmpId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                >
                  {activeWorkforce.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} — {e.role} ({(e.attendanceRatePct ?? 98.5).toFixed(1)}% Att)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Leave Type</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value as LeaveRequest['leaveType'])}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="AnnualPaid">Annual Paid Leave</option>
                    <option value="MedicalPaid">Medical Paid Leave</option>
                    <option value="UnpaidLeave">Unpaid Leave (Pro-Rata Deduct)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Total Days</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={leaveDays}
                    onChange={(e) => setLeaveDays(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Reason & Handover Notes</label>
                <textarea
                  rows={2}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Client SLA handover notes during leave..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={busyAction !== null}
                className="w-full px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center justify-center gap-1.5"
              >
                {busyAction === 'create-leave' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{language === 'bn' ? 'ছুটির আবেদন জমা দিন' : 'Submit Leave Request'}</span>
              </button>
            </form>
          </section>

          {/* Leave Approval Queue & Backup SLA Specialist Ledger */}
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                {language === 'bn'
                  ? 'ছুটি অনুমোদন ও অটোমেটিক ক্লায়েন্ট ব্যাকআপ তালিকা'
                  : 'Leave Approval & Automatic SLA Backup Ledger'}
              </h3>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {(snapshot.leaveRequests ?? []).length} requests
              </span>
            </div>

            <div className="divide-y divide-slate-200">
              {(snapshot.leaveRequests ?? []).map((lv) => (
                <div key={lv.id} className="p-5 flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-semibold text-slate-900">{lv.employeeName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-slate-700">{lv.leaveType}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums text-slate-600">
                        {lv.startDate} to {lv.endDate} ({lv.daysCount}d)
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{lv.reason}</p>
                    {lv.backupEmployeeName && (
                      <div className="text-xs text-emerald-700 font-medium">
                        Auto-Assigned SLA Backup Specialist: {lv.backupEmployeeName}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {lv.status === 'Pending' ? (
                      <>
                        <button
                          onClick={() => handleReviewLeave(lv.id, 'Approved')}
                          disabled={busyAction !== null}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg inline-flex items-center gap-1"
                        >
                          {busyAction === `${lv.id}-Approved` && (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          )}
                          <span>{language === 'bn' ? 'অনুমোদন ও ব্যাকআপ' : 'Approve & Cover'}</span>
                        </button>
                        <button
                          onClick={() => handleReviewLeave(lv.id, 'Declined')}
                          disabled={busyAction !== null}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                          <span>Decline</span>
                        </button>
                      </>
                    ) : (
                      <span
                        className={`text-xs font-medium ${
                          lv.status === 'Approved' ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {lv.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
