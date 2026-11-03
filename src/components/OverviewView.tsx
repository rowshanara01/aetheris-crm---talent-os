import { useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  Mail,
  Play,
  ShieldCheck,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react';
import type { DashboardSnapshot, LanguageCode } from '../shared/types';
import { crmApi } from '../services/crmApi';
import { formatMoney } from '../utils/formatters';
import { AvatarView } from './AvatarView';

interface OverviewViewProps {
  snapshot: DashboardSnapshot;
  language: LanguageCode;
  onSnapshotChange: (next: DashboardSnapshot) => void;
  onNavigate: (
    tab:
      | 'pipeline'
      | 'emails'
      | 'interviews'
      | 'customers'
      | 'hrpayroll'
      | 'longevity'
      | 'architecture'
      | 'settings',
    itemId?: string
  ) => void;
}

export function OverviewView({
  snapshot,
  language,
  onSnapshotChange,
  onNavigate,
}: OverviewViewProps) {
  const [runningSweep, setRunningSweep] = useState(false);
  const [togglingRuleId, setTogglingRuleId] = useState<string | null>(null);
  const [sweepBanner, setSweepBanner] = useState<string | null>(null);
  const org = snapshot.orgSettings;

  const totalArr = snapshot.customers.reduce((acc, c) => acc + c.arrUsd, 0);
  const avgHealth =
    snapshot.customers.length > 0
      ? Math.round(snapshot.customers.reduce((acc, c) => acc + c.healthScore, 0) / snapshot.customers.length)
      : 0;

  const openDeals = (snapshot.deals ?? []).filter(
    (d) => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost'
  );
  const weightedPipeline = Math.round(
    openDeals.reduce((acc, d) => acc + d.valueUsd * (d.winProbability / 100), 0)
  );

  const pendingEmails = snapshot.emails.filter((e) => e.status !== 'Auto-Replied');
  const atRiskCustomers = snapshot.customers.filter((c) => c.churnRisk === 'High' || c.churnRisk === 'Moderate');
  const activeCandidates = snapshot.candidates.filter((c) => c.stage === 'Interviewing' || c.stage === 'Selected');
  const activeEmployees = snapshot.employees.filter((e) => e.employmentStatus !== 'Offboarded');
  const monthlyPayrollCommitment = activeEmployees.reduce(
    (acc, e) => acc + e.baseSalaryUsd + e.performanceBonusUsd,
    0
  );

  async function handleRunAutonomousSweep() {
    setRunningSweep(true);
    setSweepBanner(null);
    try {
      const res = await crmApi.runAutonomousSweep();
      onSnapshotChange(res.snapshot);
      setSweepBanner(res.summary);
    } finally {
      setRunningSweep(false);
    }
  }

  async function handleToggleRule(ruleId: string) {
    setTogglingRuleId(ruleId);
    try {
      const res = await crmApi.toggleAutomationRule(ruleId);
      onSnapshotChange(res.snapshot);
    } finally {
      setTogglingRuleId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Dynamic Colorful Brand Executive Strip */}
      <section className="bg-brand-banner rounded-2xl p-6 sm:p-7 text-white shadow-sm flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
            {org.companyName} · Live Enterprise Pulse
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
            {language === 'bn'
              ? 'কাস্টমার রিটেনশন, ইমেইল অটো-রিপ্লাই ও এইচআর পেরোল রিয়েল-টাইম কমান্ড'
              : 'Unified AI Email Triage, Deal Retention & Workforce Payroll Operations'}
          </h2>
          <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
            {language === 'bn'
              ? `${snapshot.customers.length} টি এন্টারপ্রাইজ অ্যাকাউন্ট, ${openDeals.length} টি সক্রিয় ডিল এবং ${activeEmployees.length} জন অ্যাক্টিভ এমপ্লয়ি SQLite ইঞ্জিনের সাথে সিঙ্ক করা আছে।`
              : `Monitoring ${snapshot.customers.length} accounts, ${openDeals.length} active commercial deals, and ${activeEmployees.length} staff members in real time.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('emails')}
            className="px-4 py-2 text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
          >
            {language === 'bn' ? 'অটো-রিপ্লাই কিউ' : 'Auto-Reply Studio'}
          </button>
          <button
            onClick={() => onNavigate('interviews')}
            className="px-4 py-2 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white border border-white/25 rounded-lg transition-colors whitespace-nowrap"
          >
            {language === 'bn'
              ? `AI ইন্টারভিউ (${activeCandidates.length})`
              : `AI Interviews (${activeCandidates.length})`}
          </button>
        </div>
      </section>

      {/* Top 4-Column Metric Strip */}
      <section
        aria-label="Core Platform Metrics"
        className="bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 shadow-xs"
      >
        <div className="p-5 flex flex-col justify-between gap-2">
          <span className="text-xs font-medium text-slate-500">
            {language === 'bn' ? 'মোট সুরক্ষিত বার্ষিক রেভিনিউ (ARR)' : 'Protected Portfolio ARR'}
          </span>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {formatMoney(totalArr, org)}
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span>{snapshot.customers.length} Accounts</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">Avg Health {avgHealth}%</span>
          </div>
        </div>

        <div className="p-5 flex flex-col justify-between gap-2">
          <span className="text-xs font-medium text-slate-500">
            {language === 'bn' ? 'ওয়েটেড ডিল পাইপলাইন পূর্বাভাস' : 'Weighted Deal Pipeline'}
          </span>
          <div className="text-2xl font-bold text-brand font-mono tabular-nums">
            {formatMoney(weightedPipeline, org)}
          </div>
          <button
            onClick={() => onNavigate('pipeline')}
            className="text-xs font-medium text-brand hover:underline inline-flex items-center gap-1 w-fit whitespace-nowrap"
          >
            <span>
              {language === 'bn'
                ? `${openDeals.length} টি সক্রিয় ডিল দেখুন`
                : `Inspect ${openDeals.length} Active Deals`}
            </span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5 flex flex-col justify-between gap-2">
          <span className="text-xs font-medium text-slate-500">
            {language === 'bn' ? 'অটো-রিপ্লাই ও স্মার্ট রাউটিং কিউ' : 'Email Auto-Reply Queue'}
          </span>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {pendingEmails.length} Pending / {snapshot.emails.length} Total
          </div>
          <button
            onClick={() => onNavigate('emails')}
            className="text-xs font-medium text-brand hover:underline inline-flex items-center gap-1 w-fit whitespace-nowrap"
          >
            <span>{language === 'bn' ? 'অটো-রিপ্লাই স্টুডিও খুলুন' : 'Open Auto-Reply Studio'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5 flex flex-col justify-between gap-2">
          <span className="text-xs font-medium text-slate-500">
            {language === 'bn' ? 'মাসিক বেতন (Payroll) ও অ্যাক্টিভ টিম' : 'Active HR & Monthly Payroll'}
          </span>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {formatMoney(monthlyPayrollCommitment, org)}
          </div>
          <button
            onClick={() => onNavigate('hrpayroll')}
            className="text-xs font-medium text-brand hover:underline inline-flex items-center gap-1 w-fit whitespace-nowrap"
          >
            <span>
              {language === 'bn'
                ? `${activeEmployees.length} জন কর্মী · নিয়োগ, ছুটি ও বেতন`
                : `${activeEmployees.length} Active · HR, Leave & Payroll`}
            </span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* Visual Executive Analytics Strip: Pipeline Funnel, Health Distribution & Workforce Load */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Commercial Pipeline Funnel */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold font-display text-slate-900">
                {language === 'bn' ? 'ডিল পাইপলাইন ফানেল' : 'Commercial Deal Funnel'}
              </h3>
              <p className="text-[11px] text-slate-500">Stage distribution by value</p>
            </div>
            <button
              onClick={() => onNavigate('pipeline')}
              className="text-xs font-semibold text-brand hover:underline"
            >
              {language === 'bn' ? 'বোর্ড খুলুন' : 'View Board'}
            </button>
          </div>

          <div className="space-y-2.5">
            {(['Discovery', 'Solution Fit', 'Proposal', 'Negotiation', 'Closed Won'] as const).map(
              (stage) => {
                const stageDeals = (snapshot.deals ?? []).filter((d) => d.stage === stage);
                const stageSum = stageDeals.reduce((acc, d) => acc + d.valueUsd, 0);
                const totalDealVal = Math.max(
                  1,
                  (snapshot.deals ?? []).reduce((acc, d) => acc + d.valueUsd, 0)
                );
                const pct = Math.min(100, Math.round((stageSum / totalDealVal) * 100));
                return (
                  <div key={stage} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-medium">
                        {stage} <span className="text-slate-400 font-mono">({stageDeals.length})</span>
                      </span>
                      <span className="font-mono tabular-nums text-slate-900 font-semibold">
                        {formatMoney(stageSum, org)}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded overflow-hidden">
                      <div
                        className={`h-full rounded ${
                          stage === 'Closed Won' ? 'bg-emerald-600' : 'bg-brand-banner'
                        }`}
                        style={{ width: `${Math.max(pct, stageDeals.length > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Card 2: Portfolio Health & Churn Exposure */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold font-display text-slate-900">
                {language === 'bn' ? 'কাস্টমার হেলথ ও ঝুঁকি বিশ্লেষণ' : 'Client Health Distribution'}
              </h3>
              <p className="text-[11px] text-slate-500">ARR segmented by retention tier</p>
            </div>
            <button
              onClick={() => onNavigate('customers')}
              className="text-xs font-semibold text-brand hover:underline"
            >
              {language === 'bn' ? 'রিটেনশন হাব' : 'Retention Hub'}
            </button>
          </div>

          <div className="space-y-3">
            {[
              {
                label: language === 'bn' ? 'সুরক্ষিত (Low Risk)' : 'Healthy Tier (Low Risk)',
                risk: 'Low',
                barClass: 'bg-emerald-600',
                textClass: 'text-emerald-700',
              },
              {
                label: language === 'bn' ? 'পর্যবেক্ষণ (Moderate Risk)' : 'Watchlist (Moderate Risk)',
                risk: 'Moderate',
                barClass: 'bg-amber-500',
                textClass: 'text-amber-700',
              },
              {
                label: language === 'bn' ? 'জরুরি ঝুঁকি (High Risk)' : 'Immediate Save (High Risk)',
                risk: 'High',
                barClass: 'bg-red-600',
                textClass: 'text-red-700',
              },
            ].map((tier) => {
              const list = snapshot.customers.filter((c) => c.churnRisk === tier.risk);
              const sumArr = list.reduce((a, b) => a + b.arrUsd, 0);
              const pct = totalArr > 0 ? Math.round((sumArr / totalArr) * 100) : 0;
              return (
                <div key={tier.risk} className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-semibold ${tier.textClass}`}>{tier.label}</span>
                    <span className="font-mono tabular-nums font-bold text-slate-900">
                      {formatMoney(sumArr, org)} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200/80 rounded overflow-hidden">
                    <div
                      className={`h-full rounded ${tier.barClass}`}
                      style={{ width: `${Math.max(pct, list.length > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 3: Workforce Capacity & Department Payroll */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold font-display text-slate-900">
                {language === 'bn' ? 'বিভাগভিত্তিক ক্যাপাসিটি ও বেতন' : 'Workforce Capacity & Payroll'}
              </h3>
              <p className="text-[11px] text-slate-500">Active portfolio load across staff</p>
            </div>
            <button
              onClick={() => onNavigate('hrpayroll')}
              className="text-xs font-semibold text-brand hover:underline"
            >
              {language === 'bn' ? 'পে-রোল খুলুন' : 'HR & Payroll'}
            </button>
          </div>

          <div className="space-y-3">
            {activeEmployees.slice(0, 4).map((emp) => {
              const utilPct = Math.min(
                100,
                Math.round((emp.activeAccountsCount / Math.max(1, emp.maxCapacity)) * 100)
              );
              return (
                <div key={emp.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 truncate max-w-[150px]">{emp.name}</span>
                    <span className="font-mono tabular-nums text-slate-600">
                      {emp.activeAccountsCount}/{emp.maxCapacity} Load ·{' '}
                      <strong className="text-slate-900">
                        {formatMoney(emp.baseSalaryUsd + emp.performanceBonusUsd, org)}
                      </strong>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded overflow-hidden">
                    <div
                      className={`h-full rounded ${
                        utilPct >= 85 ? 'bg-amber-500' : 'bg-brand-banner'
                      }`}
                      style={{ width: `${Math.max(utilPct, 10)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Autonomous Python Workflow Engine Banner & Controls */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand" />
              <span>
                {language === 'bn'
                  ? 'অটোনোমাস ওয়ার্কফ্লো ও SLA গার্ড ইঞ্জিন (Python Automation Rules)'
                  : 'Autonomous CRM & Workforce Workflow Engine'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'bn'
                ? 'এক ক্লিকে ঝুঁকিপূর্ণ কাস্টমারের জন্য অটো-রিনিউয়াল ডিল তৈরি, এমপ্লয়ি লোড ব্যালেন্সিং এবং ইমেইল SLA রাউটিং সম্পন্ন করুন'
                : 'Event-driven Python rules that auto-open renewal deals, prevent employee burnout, and route unassigned escalations'}
            </p>
          </div>

          <button
            onClick={handleRunAutonomousSweep}
            disabled={runningSweep}
            className="btn-brand px-4 py-2 text-xs font-medium rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            {runningSweep ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>
              {language === 'bn' ? 'অটোনোমাস অপারেশন সুইপ চালান' : 'Run Autonomous Ops Sweep'}
            </span>
          </button>
        </div>

        {sweepBanner && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{sweepBanner}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(snapshot.automationRules ?? []).map((rule) => (
            <div
              key={rule.id}
              className="p-4 bg-slate-50/70 border border-slate-200 rounded-lg flex flex-col justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs font-semibold text-slate-900">
                    {language === 'bn' ? rule.bnName : rule.name}
                  </div>
                  <button
                    onClick={() => handleToggleRule(rule.id)}
                    disabled={togglingRuleId === rule.id}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded border transition-colors whitespace-nowrap shrink-0 ${
                      rule.enabled
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    {rule.enabled ? 'Active' : 'Paused'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  <strong>If:</strong> {rule.triggerCondition}
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  <strong>Then:</strong> {rule.automatedAction}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                <span>Runs: {rule.executionsCount}</span>
                <span>{rule.lastTriggeredAt ? new Date(rule.lastTriggeredAt).toLocaleDateString() : 'Ready'}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Main 2-Column Split: Cohort Longevity Trajectory + Priority Action Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {language === 'bn'
                    ? '৩৬-মাসের দীর্ঘমেয়াদী কাস্টমার ও এমপ্লয়ি রিটেনশন কার্ভ'
                    : '36-Month Customer & Employee Retention Trajectory'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {language === 'bn'
                    ? 'স্মার্ট ইমেইল রেসপন্স, সঠিক এমপ্লয়ি সিলেকশন এবং প্রোঅ্যাক্টিভ রিটেনশন প্লেবুকের সমন্বিত ফলাফল'
                    : 'Closed-loop durability linking fast SLA auto-replies, calibrated talent selection, and proactive renewal playbooks'}
                </p>
              </div>
              <button
                onClick={() => onNavigate('longevity')}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                {language === 'bn' ? 'বিস্তারিত দেখুন' : 'Inspect Longevity'}
              </button>
            </div>

            <div className="mt-5 space-y-3.5">
              {snapshot.cohorts.map((point) => (
                <div key={point.periodLabel} className="grid grid-cols-12 items-center gap-3 text-xs">
                  <div className="col-span-2 font-medium text-slate-700 font-mono tabular-nums whitespace-nowrap">
                    {point.periodLabel}
                  </div>
                  <div className="col-span-7 space-y-1.5">
                    <div className="w-full bg-slate-100 h-2 rounded overflow-hidden">
                      <div
                        className="bg-slate-900 h-full rounded"
                        style={{ width: `${point.customerRetentionPct}%` }}
                      />
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded"
                        style={{ width: `${point.employeeRetentionPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="col-span-3 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                    <span>{point.customerRetentionPct.toFixed(1)}%</span>
                    <span className="mx-1 text-slate-300">/</span>
                    <span className="text-blue-700">{point.employeeRetentionPct.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-900 inline-block" />
                <span>Customer Net Retention</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block" />
                <span>Hired Employee Retention</span>
              </span>
            </div>
            <button
              onClick={() => onNavigate('architecture')}
              className="text-blue-700 font-medium hover:underline whitespace-nowrap"
            >
              {language === 'bn' ? 'সিস্টেম আর্কিটেকচার ব্লুপ্রিন্ট →' : 'View System Architecture Blueprint →'}
            </button>
          </div>
        </section>

        {/* Priority Operational Action Queue */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">
                {language === 'bn' ? 'তাৎক্ষণিক অ্যাকশন কিউ' : 'Priority Retention & Hiring Queue'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'bn'
                  ? 'কাস্টমার ধরে রাখা ও সেরা এমপ্লয়ি নির্বাচনের জন্য জরুরি পদক্ষেপসমূহ'
                  : 'Direct workflows requiring AI triage, candidate selection, or renewal protection'}
              </p>
            </div>

            <div className="divide-y divide-slate-200">
              {pendingEmails.slice(0, 2).map((eml) => (
                <div key={eml.id} className="py-3.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Mail className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate font-medium text-slate-700">{eml.companyName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-amber-700 font-medium">{eml.urgency} Urgency</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 truncate mt-0.5">{eml.subject}</p>
                  </div>
                  <button
                    onClick={() => onNavigate('emails', eml.id)}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    {language === 'bn' ? 'AI রিপ্লাই' : 'Auto-Reply'}
                  </button>
                </div>
              ))}

              {atRiskCustomers.slice(0, 2).map((cust) => (
                <div key={cust.id} className="py-3.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span className="font-medium text-red-700">{cust.churnRisk} Churn Risk</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{formatMoney(cust.arrUsd, org)} ARR</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 truncate mt-0.5">{cust.companyName}</p>
                  </div>
                  <button
                    onClick={() => onNavigate('customers', cust.id)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-800 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    {language === 'bn' ? 'রিটেনশন প্ল্যান' : 'Retain Account'}
                  </button>
                </div>
              ))}

              {activeCandidates.slice(0, 1).map((cand) => (
                <div key={cand.id} className="py-3.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <UserCheck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                      <span>{cand.stage}</span>
                      <span aria-hidden="true">·</span>
                      <span>{cand.department}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 truncate mt-0.5">
                      {cand.name} — {cand.role}
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate('interviews', cand.id)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-800 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    {language === 'bn' ? 'ইন্টারভিউ নিন' : 'Evaluate'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>All actions persist to transactional SQLite store</span>
            </span>
            <span className="font-mono tabular-nums">{snapshot.events.length} Audit Events</span>
          </div>
        </section>
      </div>

      {/* Active Specialist Roster & Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {language === 'bn' ? 'নির্বাচিত স্পেশালিস্ট টিম ও ক্যাপাসিটি' : 'Active CRM Specialist Roster'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Auto-reply router & deal commission engine link client portfolios directly to compensation
              </p>
            </div>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 bg-slate-50/70">
                  <th className="py-2.5 px-6">Specialist</th>
                  <th className="py-2.5 px-4">Department</th>
                  <th className="py-2.5 px-4 text-right">Portfolio Load</th>
                  <th className="py-2.5 px-4 text-right">Monthly Comp</th>
                  <th className="py-2.5 px-6 text-right">CSAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {activeEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => onNavigate('hrpayroll', emp.id)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <AvatarView name={emp.name} avatarKey={emp.avatarKey} size="sm" />
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 truncate">{emp.name}</div>
                          <div className="text-xs text-slate-500 truncate">{emp.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">{emp.department}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-700 whitespace-nowrap">
                      {emp.activeAccountsCount} / {emp.maxCapacity}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-medium text-slate-900 whitespace-nowrap">
                      {formatMoney(emp.baseSalaryUsd + emp.performanceBonusUsd, org)}
                    </td>
                    <td className="py-3 px-6 text-right font-mono tabular-nums text-xs font-medium text-emerald-700 whitespace-nowrap">
                      {emp.csatScore.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-900 pb-4 border-b border-slate-200">
            {language === 'bn' ? 'সাম্প্রতিক সিস্টেম অডিট লগ' : 'Recent Domain Event Stream'}
          </h2>
          <div className="divide-y divide-slate-200 mt-1">
            {snapshot.events.slice(0, 5).map((evt) => (
              <div key={evt.id} className="py-3 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2 text-slate-500">
                  <span className="font-medium text-slate-700 inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>{evt.module}</span>
                  </span>
                  <span className="font-mono tabular-nums">
                    {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">{evt.summary}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
