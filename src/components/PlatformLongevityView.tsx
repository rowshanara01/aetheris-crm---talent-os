import { useEffect, useState } from 'react';
import { Award, CheckCircle2, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import type { DashboardSnapshot, LanguageCode } from '../shared/types';
import { crmApi } from '../services/crmApi';
import { AvatarView } from './AvatarView';

interface PlatformLongevityViewProps {
  snapshot: DashboardSnapshot;
  language: LanguageCode;
  initialEmployeeId?: string;
  onSnapshotChange: (next: DashboardSnapshot) => void;
}

export function PlatformLongevityView({
  snapshot,
  language,
  initialEmployeeId,
  onSnapshotChange,
}: PlatformLongevityViewProps) {
  const activeEmployees = snapshot.employees.filter((e) => e.employmentStatus !== 'Offboarded');
  const [selectedEmpId, setSelectedEmpId] = useState<string>(
    initialEmployeeId || activeEmployees[0]?.id || ''
  );
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialEmployeeId) {
      setSelectedEmpId(initialEmployeeId);
    }
  }, [initialEmployeeId]);

  const activeEmployee =
    activeEmployees.find((e) => e.id === selectedEmpId) ?? activeEmployees[0] ?? null;

  const assignedPortfolio = activeEmployee
    ? snapshot.customers.filter((c) => c.assignedEmployeeId === activeEmployee.id)
    : [];

  async function handleGenerateLongevityPlan() {
    if (!activeEmployee) return;
    setErrorMsg(null);
    setLoadingPlan(true);
    try {
      const { snapshot: nextSnap } = await crmApi.generateEmployeeLongevityPlan(
        activeEmployee.id,
        language
      );
      onSnapshotChange(nextSnap);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate employee longevity plan.');
    } finally {
      setLoadingPlan(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Platform Stickiness Summary Strip */}
      <section className="bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200 grid grid-cols-1 sm:grid-cols-3">
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">
            {language === 'bn' ? '৩৬-মাসের প্ল্যাটফর্ম অ্যাডপশন হার' : '36-Month Platform Adoption Stickiness'}
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">88.5%</div>
          <p className="text-xs text-slate-500 mt-1">
            Sustained via role-matched specialists & proactive SLA governance
          </p>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">
            {language === 'bn' ? 'গড় টিম CSAT স্কোর' : 'Mean Specialist CSAT'}
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {(
              activeEmployees.reduce((s, e) => s + e.csatScore, 0) /
              Math.max(1, activeEmployees.length)
            ).toFixed(1)}
            %
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Direct quality metric from auto-routed client resolutions
          </p>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">
            {language === 'bn' ? 'এমপ্লয়ি বার্নআউট সুরক্ষা' : 'Balanced Capacity Utilization'}
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
            {activeEmployees.reduce((s, e) => s + e.activeAccountsCount, 0)} /{' '}
            {activeEmployees.reduce((s, e) => s + e.maxCapacity, 0)} Slots
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Prevents specialist overload to preserve multi-year talent retention
          </p>
        </div>
      </section>

      {errorMsg && (
        <div role="alert" className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Employee Roster */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-800">Active Talent & Retention Health</span>
            <span className="font-mono tabular-nums">{activeEmployees.length} specialists</span>
          </div>

          <div className="divide-y divide-slate-200">
            {activeEmployees.map((emp) => {
              const isSelected = activeEmployee?.id === emp.id;
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
                    <div className="text-right shrink-0 font-mono tabular-nums">
                      <div className="text-xs font-bold text-slate-900">{emp.retentionScore}/100</div>
                      <div className="text-xs text-slate-500">{emp.tenureMonths}m tenure</div>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500">
                    <span>
                      Load: <strong className="font-mono tabular-nums text-slate-700">{emp.activeAccountsCount}/{emp.maxCapacity}</strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        emp.burnoutRisk === 'Elevated'
                          ? 'text-red-700 font-medium'
                          : emp.burnoutRisk === 'Moderate'
                            ? 'text-amber-700 font-medium'
                            : 'text-emerald-700 font-medium'
                      }
                    >
                      {emp.burnoutRisk} Burnout Risk
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">CSAT {emp.csatScore}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* AI Employee Longevity & Career Advisor */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
          {!activeEmployee ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Select a team member to inspect career longevity and workload balance.
            </div>
          ) : (
            <>
              <div className="p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <AvatarView name={activeEmployee.name} avatarKey={activeEmployee.avatarKey} size="lg" />
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{activeEmployee.name}</h2>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {activeEmployee.role} · {activeEmployee.department} · {activeEmployee.careerTrack}
                      </div>
                      <div className="text-xs text-slate-500 mt-1.5">
                        <span className="font-medium text-slate-700">Domain Strengths: </span>
                        {activeEmployee.skills.join(' · ')}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateLongevityPlan}
                    disabled={loadingPlan}
                    className="px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    {loadingPlan ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {language === 'bn' ? 'AI দীর্ঘমেয়াদী রিটেনশন প্ল্যান' : 'Build AI Longevity Roadmap'}
                    </span>
                  </button>
                </div>

                {/* Assigned Customer Accounts */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-800 mb-2">
                    Assigned Client Portfolio ({assignedPortfolio.length} / {activeEmployee.maxCapacity} Capacity)
                  </div>
                  {assignedPortfolio.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Ready for client routing — assign accounts in Customer Retention or via Email Auto-Reply.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                      {assignedPortfolio.map((cust) => (
                        <div key={cust.id} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-medium text-slate-900">{cust.companyName}</span>
                            <span className="text-slate-400 mx-1.5">·</span>
                            <span className="text-slate-500">{cust.churnRisk} Risk</span>
                          </div>
                          <span className="font-mono tabular-nums font-medium text-slate-700">
                            ${cust.arrUsd.toLocaleString()} ARR
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* AI Career & Burnout Prevention Roadmap */}
              <div className="p-6 space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-700" />
                  <span>
                    {language === 'bn'
                      ? 'এমপ্লয়ি ও প্ল্যাটফর্ম দীর্ঘমেয়াদী স্থায়িত্ব রোডম্যাপ'
                      : '12-Month Talent Retention & Career Growth Plan'}
                  </span>
                </h3>

                {!activeEmployee.longevityPlan ? (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 text-center">
                    Click "Build AI Longevity Roadmap" to synthesize workload calibration, career milestones, and recognition triggers.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-xs font-medium text-slate-600">
                        12-Month Retention Forecast Probability
                      </span>
                      <span className="text-lg font-bold font-mono tabular-nums text-emerald-700">
                        {activeEmployee.longevityPlan.retentionForecast12m}%
                      </span>
                    </div>

                    <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg text-xs leading-relaxed">
                      <div className="p-4">
                        <div className="font-semibold text-slate-900">01. Workload & Burnout Calibration</div>
                        <p className="text-slate-600 mt-1">
                          {activeEmployee.longevityPlan.workloadRecommendation}
                        </p>
                      </div>
                      <div className="p-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-blue-700" />
                          <span>02. Career Progression Milestone</span>
                        </div>
                        <p className="text-slate-600 mt-1">{activeEmployee.longevityPlan.growthMilestone}</p>
                      </div>
                      <div className="p-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>03. Compensation & Recognition Trigger</span>
                        </div>
                        <p className="text-slate-600 mt-1">
                          {activeEmployee.longevityPlan.recognitionTrigger}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50/70">
                        <div className="font-semibold text-slate-900">Executive 1-on-1 Guidance</div>
                        <p className="text-slate-700 mt-1">
                          {activeEmployee.longevityPlan.managerActionNote}
                        </p>
                      </div>
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
