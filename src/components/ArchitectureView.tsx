import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Code2, Database, GitBranch, Layers, Shield } from 'lucide-react';
import type { DashboardSnapshot, LanguageCode } from '../shared/types';
import { crmApi } from '../services/crmApi';

interface ArchitectureViewProps {
  snapshot: DashboardSnapshot;
  language: LanguageCode;
}

const CLOSED_LOOP_PIPELINES = [
  {
    id: 'pipe-email',
    title: '01. Python Specialist Affinity + AI Email Auto-Reply Pipeline',
    bnTitle: '০১. Python এমপ্লয়ি স্কোরিং ও অটো ইমেইল রিপ্লাই পাইপলাইন',
    steps: [
      'Inbound Client Email Logged in SQLite3',
      'Python domain_engine.py Computes Skill & Capacity Rankings',
      'Server-Side AI Synthesizes Bilingual SLA Reply',
      'SQLite Transaction Updates Thread & Account Health',
    ],
  },
  {
    id: 'pipe-talent',
    title: '02. Structured AI Interview & Python HR Promotion Pipeline',
    bnTitle: '০২. AI এমপ্লয়ি ইন্টারভিউ, রুব্রিক মূল্যায়ন ও SQLite টিম প্রমোশন',
    steps: [
      'Candidate Competency Stored in SQLite candidates Table',
      'Adaptive Scenario Interviewing & Live Transcript Commits',
      '4-Axis JSON Rubric Verdict (Technical, Clarity, Empathy, Longevity)',
      'Python hire_candidate() Inserts Directly into employees Table',
    ],
  },
  {
    id: 'pipe-longevity',
    title: '03. Dual Customer & Platform Long-Term Retention Flywheel',
    bnTitle: '০৩. দীর্ঘমেয়াদী কাস্টমার ও প্ল্যাটফর্ম স্থায়িত্ব ফ্লাইহুইল',
    steps: [
      'Python Recomputes Portfolio Load & Burnout Risk on Every Transaction',
      'Churn Risk Calibrated from Health Score + Seat Utilization',
      '3-Horizon Customer Playbook + 12-Month Employee Career Plan',
      'Compounding Multi-Year Net Revenue & Talent Retention',
    ],
  },
];

export function ArchitectureView({ snapshot, language }: ArchitectureViewProps) {
  const [selectedLayerId, setSelectedLayerId] = useState<string>(
    snapshot.architectureLayers[2]?.id ?? snapshot.architectureLayers[0]?.id ?? 'layer-python-domain'
  );
  const [pythonInfo, setPythonInfo] = useState<{ engine: string; sources: Record<string, string> } | null>(
    null
  );
  const [selectedFile, setSelectedFile] = useState<string>('domain_engine.py');

  useEffect(() => {
    crmApi
      .getPythonBackendInfo()
      .then((data) => setPythonInfo(data))
      .catch(() => setPythonInfo(null));
  }, []);

  const activeLayer =
    snapshot.architectureLayers.find((l) => l.id === selectedLayerId) ?? snapshot.architectureLayers[0];

  return (
    <div className="space-y-8">
      {/* System Design Header Summary */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">
            {language === 'bn'
              ? 'Python 3 + SQLite3 রিলেশনাল ব্যাকএন্ড এবং ৫-লেয়ার সিস্টেম আর্কিটেকচার'
              : 'Python 3 + SQLite3 Relational Backend & 5-Layer System Architecture'}
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {language === 'bn'
              ? 'এই CRM প্ল্যাটফর্মটির মূল বিজনেস ইঞ্জিন, এমপ্লয়ি স্কোরিং অ্যালগরিদম এবং রিলেশনাল ডাটাবেস (SQLite3 WAL) সম্পূর্ণ Python 3-তে তৈরি (`backend_python/*.py`), যা এপিআই গেটওয়ের মাধ্যমে ফ্রন্টএন্ড ড্যাশবোর্ডের সাথে যুক্ত।'
              : 'Core CRM business rules, specialist capacity-affinity scoring, churn calibration, and relational ACID storage run in Python 3 (`backend_python/*.py`) backed by SQLite3 in Write-Ahead Logging (WAL) mode.'}
          </p>
        </div>

        {pythonInfo && (
          <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono tabular-nums text-slate-800 shrink-0">
            Active Backend: {pythonInfo.engine}
          </div>
        )}
      </section>

      {/* Live Python Source Code & SQLite DDL Inspector */}
      {pythonInfo && (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-blue-700" />
              <h3 className="text-sm font-semibold text-slate-900">
                {language === 'bn'
                  ? 'লাইভ Python ব্যাকএন্ড মডিউল ও SQLite স্কিমা (`backend_python/`)'
                  : 'Live Python 3 Backend Modules & SQLite Schema (`backend_python/`)'}
              </h3>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
              {Object.keys(pythonInfo.sources).map((fname) => (
                <button
                  key={fname}
                  onClick={() => setSelectedFile(fname)}
                  className={`px-3 py-1 text-xs font-mono rounded transition-colors whitespace-nowrap shrink-0 ${
                    selectedFile === fname
                      ? 'bg-white text-slate-900 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {fname}
                </button>
              ))}
            </div>
          </div>

          <pre className="p-5 bg-slate-950 text-slate-100 text-xs font-mono leading-relaxed overflow-x-auto max-h-96">
            <code>{pythonInfo.sources[selectedFile] ?? ''}</code>
          </pre>
        </section>
      )}

      {/* Interactive 5-Layer Stack Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
          <div className="px-5 py-3.5 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-800 inline-flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-700" />
              <span>5-Tier Decoupled Architecture Stack</span>
            </span>
            <span>Select layer to inspect</span>
          </div>

          {snapshot.architectureLayers.map((layer) => {
            const isSelected = activeLayer?.id === layer.id;
            return (
              <button
                key={layer.id}
                onClick={() => setSelectedLayerId(layer.id)}
                className={`w-full text-left p-4 transition-colors block ${
                  isSelected ? 'bg-slate-100/90' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-mono tabular-nums font-semibold text-blue-700">
                    Layer {layer.order}
                  </span>
                  <span>{layer.designPattern}</span>
                </div>
                <div className="text-sm font-semibold text-slate-900 mt-1">{layer.name}</div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {language === 'bn' ? layer.bengaliSummary : layer.responsibility}
                </p>
              </button>
            );
          })}
        </section>

        {/* Selected Layer Specification */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          {activeLayer && (
            <div className="space-y-5">
              <div className="pb-4 border-b border-slate-200">
                <div className="text-xs font-mono tabular-nums text-blue-700 font-semibold">
                  Layer {activeLayer.order} · {activeLayer.designPattern}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mt-1">{activeLayer.name}</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{activeLayer.bengaliSummary}</p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-800">Core Architectural Responsibility</h4>
                <p className="text-sm text-slate-700 leading-relaxed">{activeLayer.responsibility}</p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-800">Key Modules & Subsystems</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeLayer.components.map((comp) => (
                    <div
                      key={comp}
                      className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                      <span>{comp}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Production Reliability & Security Invariant</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{activeLayer.resilienceGuarantee}</p>
              </div>
            </div>
          )}

          <div className="pt-4 mt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>Python 3.10 SQLite WAL + Server-Side AI Gateway</span>
            <span className="font-mono tabular-nums">Zero Client Secret Exposure</span>
          </div>
        </section>
      </div>

      {/* Closed-Loop End-to-End Pipelines */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
          <GitBranch className="w-4 h-4 text-blue-700" />
          <h3 className="text-base font-semibold text-slate-900">
            {language === 'bn'
              ? 'Python + AI ক্লোজড-লুপ অর্কেস্ট্রেশন পাইপলাইন'
              : 'Python + AI Closed-Loop Domain Pipelines'}
          </h3>
        </div>

        <div className="divide-y divide-slate-200">
          {CLOSED_LOOP_PIPELINES.map((pipe) => (
            <div key={pipe.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
              <div className="text-sm font-semibold text-slate-900">
                {language === 'bn' ? pipe.bnTitle : pipe.title}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {pipe.steps.map((step, i) => (
                  <div
                    key={step}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-2 text-xs text-slate-800"
                  >
                    <span>
                      <strong className="font-mono tabular-nums text-blue-700 mr-1.5">{i + 1}.</strong>
                      {step}
                    </span>
                    {i < pipe.steps.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden md:block" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Relational SQLite Tables & Live Immutable Event Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <Database className="w-4 h-4 text-blue-700" />
            <h3 className="text-sm font-semibold text-slate-900">SQLite3 Relational Tables (`schema.sql`)</h3>
          </div>

          <div className="divide-y divide-slate-200 text-xs">
            <div className="py-3 space-y-1">
              <div className="font-mono font-semibold text-slate-900">
                customers ({snapshot.customers.length} rows)
              </div>
              <p className="text-slate-600">
                `id`, `arr_usd`, `health_score`, `active_seats_ratio`, `churn_risk`, `assigned_employee_id`, `retention_plan_json`
              </p>
            </div>
            <div className="py-3 space-y-1">
              <div className="font-mono font-semibold text-slate-900">
                emails ({snapshot.emails.length} rows)
              </div>
              <p className="text-slate-600">
                `id`, `customer_id`, `sentiment`, `urgency`, `assigned_employee_id`, `ai_routing_reason`, `ai_draft_reply`, `sent_reply`
              </p>
            </div>
            <div className="py-3 space-y-1">
              <div className="font-mono font-semibold text-slate-900">
                candidates ({snapshot.candidates.length} rows)
              </div>
              <p className="text-slate-600">
                `id`, `role`, `department`, `stage`, `interview_transcript_json`, `evaluation_json`
              </p>
            </div>
            <div className="py-3 space-y-1">
              <div className="font-mono font-semibold text-slate-900">
                deals ({(snapshot.deals ?? []).length} rows)
              </div>
              <p className="text-slate-600">
                `id`, `title`, `customer_id`, `deal_type`, `stage`, `value_usd`, `win_probability`, `owner_employee_id`, `ai_coaching_json`
              </p>
            </div>
            <div className="py-3 space-y-1">
              <div className="font-mono font-semibold text-slate-900">
                employees ({snapshot.employees.length} rows) · leave_requests ({(snapshot.leaveRequests ?? []).length} rows)
              </div>
              <p className="text-slate-600">
                `employment_status`, `base_salary_usd`, `performance_bonus_usd`, `attendance_rate_pct`, `backup_employee_id`
              </p>
            </div>
            <div className="py-3 space-y-1">
              <div className="font-mono font-semibold text-slate-900">
                payroll_records ({snapshot.payroll.length} rows) · automation_rules ({(snapshot.automationRules ?? []).length} rows)
              </div>
              <p className="text-slate-600">
                `period_month`, `net_pay_usd`, `status`, `trigger_condition`, `automated_action`, `executions_count`
              </p>
            </div>
          </div>
        </section>

        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">SQLite `domain_events` Audit Stream</h3>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {snapshot.events.length} persisted rows
            </span>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-200">
            {snapshot.events.map((evt) => (
              <div key={evt.id} className="px-6 py-3 text-xs flex items-start justify-between gap-4">
                <div className="space-y-0.5 min-w-0">
                  <div className="font-mono text-slate-800 font-semibold">{evt.eventType}</div>
                  <p className="text-slate-600">{evt.summary}</p>
                  <div className="text-slate-400">
                    {evt.module} · Actor: {evt.actor}
                  </div>
                </div>
                <span className="font-mono tabular-nums text-slate-400 shrink-0">
                  {new Date(evt.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
