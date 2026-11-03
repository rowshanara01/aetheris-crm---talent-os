import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  FileText,
  Mail,
  UserCheck,
} from 'lucide-react';
import type { LanguageCode } from '../shared/types';

interface InteractivePlatformSandboxProps {
  language: LanguageCode;
  companyName: string;
  onNavigateContact: () => void;
  onNavigateRegister: () => void;
}

type SandboxTabId = 'router' | 'roi' | 'interview' | 'voucher';

const EMAIL_SCENARIOS = [
  {
    id: 'esc-1',
    client: 'Eastern Bank Corporate Treasury',
    subject: 'Urgent SLA Escalation & Multi-Branch Seat Renewal',
    urgency: 'Critical · Renewal Window (18 Days)',
    inboundSnippet:
      'We are expanding to 42 treasury desks next quarter, but need guaranteed <15m API webhook failover and a dedicated bilingual account lead before signing the 3-year renewal.',
    selectedSpecialist: 'Nusrat Jahan',
    specialistRole: 'Principal Retention Strategist',
    matchScore: 97,
    candidates: [
      { name: 'Nusrat Jahan', load: '4 / 8 Accounts', csat: '99.1%', score: 97 },
      { name: 'Tanvir Mahmud', load: '6 / 8 Accounts', csat: '96.4%', score: 86 },
      { name: 'Rafiul Islam', load: '7 / 8 Accounts', csat: '95.8%', score: 78 },
    ],
    replyBn:
      'প্রিয় ইস্টার্ন ব্যাংক ট্রেজারি টিম, আপনার ৪২টি নতুন ডেস্ক সম্প্রসারণ ও ৩-বছরের রিনিউয়াল প্রস্তাবের জন্য ধন্যবাদ। আপনার অ্যাকাউন্টের জন্য প্রিন্সিপাল স্ট্র্যাটেজিস্ট নুসরাত জাহানকে তাৎক্ষণিক দায়িত্ব দেওয়া হয়েছে এবং <১৫ মিনিটের ওয়েবহুক ফেইলওভার SLA আজই সক্রিয় করা হয়েছে।',
    replyEn:
      'Dear Eastern Bank Treasury Team, thank you for sharing your 42-seat expansion requirements. Principal Retention Strategist Nusrat Jahan has been assigned as your dedicated lead, and we have provisioned <15m webhook failover guarantees ahead of your 3-year renewal review.',
  },
  {
    id: 'esc-2',
    client: 'Chaldal Cold-Chain Fulfillment',
    subject: 'Python Webhook Payload & Real-Time Dispatch Sync',
    urgency: 'High · Technical Integration',
    inboundSnippet:
      'Our Dhaka warehouse ERP needs bi-directional JSON webhook verification and automated ticket routing whenever cold-storage telemetry crosses threshold.',
    selectedSpecialist: 'Sajidul Karim',
    specialistRole: 'Staff Solutions Engineer (Python)',
    matchScore: 95,
    candidates: [
      { name: 'Sajidul Karim', load: '3 / 7 Accounts', csat: '98.7%', score: 95 },
      { name: 'Nusrat Jahan', load: '4 / 8 Accounts', csat: '99.1%', score: 83 },
      { name: 'Tanvir Mahmud', load: '6 / 8 Accounts', csat: '96.4%', score: 79 },
    ],
    replyBn:
      'প্রিয় চালডাল ইঞ্জিনিয়ারিং টিম, আমাদের স্টাফ সলিউশনস ইঞ্জিনিয়ার সাজিদুল করিম আপনার Python ওয়েবহুক ভেরিফিকেশন এবং কোল্ড-চেইন অ্যালার্ট রাউটিং কনফিগারেশন সম্পন্ন করার জন্য যুক্ত হয়েছেন। নিচে API পেলোড স্কিমা সংযুক্ত করা হলো।',
    replyEn:
      'Hello Chaldal Engineering, Staff Solutions Engineer Sajidul Karim has picked up your warehouse ERP integration. Below is the signed JSON webhook verification schema to route cold-storage threshold alerts straight into priority dispatch.',
  },
  {
    id: 'esc-3',
    client: 'Square Healthcare Distribution',
    subject: 'Annual QBR Invoice & 120-Seat Upgrade',
    urgency: 'Moderate · Commercial Expansion',
    inboundSnippet:
      'Please issue an official BDT commercial tax invoice for 120 additional regional field representatives and schedule our executive QBR this Thursday.',
    selectedSpecialist: 'Tanvir Mahmud',
    specialistRole: 'Enterprise Commercial Lead',
    matchScore: 94,
    candidates: [
      { name: 'Tanvir Mahmud', load: '5 / 8 Accounts', csat: '97.2%', score: 94 },
      { name: 'Nusrat Jahan', load: '4 / 8 Accounts', csat: '99.1%', score: 89 },
      { name: 'Sajidul Karim', load: '3 / 7 Accounts', csat: '98.7%', score: 76 },
    ],
    replyBn:
      'প্রিয় স্কয়ার হেলথকেয়ার টিম, ১২০ জন নতুন ফিল্ড প্রতিনিধির আপগ্রেড ডিল এবং সরকারি ভ্যাট/ট্যাক্সসহ অফিসিয়াল BDT কমার্শিয়াল ইনভয়েস প্রস্তুত করা হয়েছে। বৃহস্পতিবার সকাল ১১টায় আমাদের এক্সিকিউটিভ QBR নির্ধারণ করা হলো।',
    replyEn:
      'Dear Square Healthcare Team, your 120-seat commercial expansion order and itemized BDT tax invoice have been generated. Enterprise Lead Tanvir Mahmud has confirmed Thursday at 11:00 AM for your Executive QBR.',
  },
];

const INTERVIEW_CANDIDATES = [
  {
    id: 'cand-preview-1',
    name: 'Farhana Rahman',
    role: 'Senior Customer Retention Architect',
    department: 'Customer Success · 6 Yrs Exp',
    proposedBdt: '৳1,75,000 / mo',
    proposedUsd: '$5,600 / mo',
    verdict: 'Strong Hire · Top 4% Rubric Match',
    axes: [
      { label: 'Technical CRM & SLA Mastery', score: 94 },
      { label: 'Bilingual Executive Clarity', score: 96 },
      { label: 'De-escalation & Client Empathy', score: 92 },
      { label: '24-Month Team Longevity Fit', score: 95 },
    ],
  },
  {
    id: 'cand-preview-2',
    name: 'Mahir Chowdhury',
    role: 'Python Automation & Webhook Engineer',
    department: 'Solutions Engineering · 5 Yrs Exp',
    proposedBdt: '৳1,95,000 / mo',
    proposedUsd: '$6,200 / mo',
    verdict: 'Recommended Hire · High Systems Depth',
    axes: [
      { label: 'Python 3 & SQLite WAL Architecture', score: 97 },
      { label: 'API Security & Documentation', score: 91 },
      { label: 'Cross-Team Collaboration', score: 89 },
      { label: '24-Month Team Longevity Fit', score: 93 },
    ],
  },
];

export function InteractivePlatformSandbox({
  language,
  companyName,
  onNavigateContact,
  onNavigateRegister,
}: InteractivePlatformSandboxProps) {
  const [activeTab, setActiveTab] = useState<SandboxTabId>('router');
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [replyLang, setReplyLang] = useState<'bn' | 'en'>(language === 'bn' ? 'bn' : 'en');

  // ROI Calculator State
  const [currency, setCurrency] = useState<'BDT' | 'USD'>('BDT');
  const [monthlyEmails, setMonthlyEmails] = useState(1400);
  const [clientAccounts, setClientAccounts] = useState(65);
  const [teamSize, setTeamSize] = useState(14);

  // Interview Candidate State
  const [candIdx, setCandIdx] = useState(0);

  const activeScenario = EMAIL_SCENARIOS[scenarioIdx];
  const activeCandidate = INTERVIEW_CANDIDATES[candIdx];

  // Deterministic ROI Math
  const hoursSavedPerMonth = Math.round(monthlyEmails * 0.14 + teamSize * 6.5);
  const protectedArrUsd = clientAccounts * 2850;
  const netAnnualSavingsUsd = Math.round(hoursSavedPerMonth * 12 * 28 + protectedArrUsd * 0.18);
  const formatVal = (usd: number) =>
    currency === 'BDT'
      ? `৳${Math.round(usd * 120).toLocaleString('en-IN')}`
      : `$${Math.round(usd).toLocaleString('en-US')}`;

  const tabs: { id: SandboxTabId; label: string; bnLabel: string; icon: typeof Mail }[] = [
    {
      id: 'router',
      label: '01. Live AI Email Router',
      bnLabel: '০১. ইমেইল অটো-রিপ্লাই সিমুলেটর',
      icon: Mail,
    },
    {
      id: 'roi',
      label: '02. Enterprise ROI Calculator',
      bnLabel: '০২. সাশ্রয় ও ROI ক্যালকুলেটর',
      icon: Calculator,
    },
    {
      id: 'interview',
      label: '03. AI Interview Rubric',
      bnLabel: '০৩. AI ইন্টারভিউ স্কোরকার্ড',
      icon: UserCheck,
    },
    {
      id: 'voucher',
      label: '04. Official Payslip Voucher',
      bnLabel: '০৪. অফিসিয়াল বেতন ভাউচার',
      icon: FileText,
    },
  ];

  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl space-y-2">
          <div className="text-xs font-semibold text-brand">
            {language === 'bn'
              ? 'ইন্টারঅ্যাক্টিভ প্রোডাক্ট প্রিভিউ — লগইন ছাড়াই পরীক্ষা করুন'
              : 'Interactive Product Tour — Test Drive Key Workflows'}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900">
            {language === 'bn'
              ? 'দেখুন কীভাবে একটি প্ল্যাটফর্মেই ইমেইল, ইন্টারভিউ ও বেতন পরিচালিত হয়'
              : 'Experience Live Triage, ROI Modeling, Hiring & Payroll in Real Time'}
          </h2>
        </div>

        <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg">
          <button
            type="button"
            onClick={() => setCurrency('BDT')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              currency === 'BDT' ? 'btn-brand' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            BDT (৳)
          </button>
          <button
            type="button"
            onClick={() => setCurrency('USD')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              currency === 'USD' ? 'btn-brand' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            USD ($)
          </button>
        </div>
      </div>

      {/* Architectural Dark-Framed Application Showcase Window */}
      <div className="rounded-2xl bg-slate-950 p-2 sm:p-3 shadow-xl border border-slate-800">
        {/* Window Top Chrome + Interactive Module Switcher */}
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono truncate">
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-700 shrink-0" />
            <span className="text-slate-200 font-semibold truncate">{companyName} OS</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline truncate">Python 3.10 + SQLite3 Interactive Preview</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'btn-brand text-white'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{language === 'bn' ? tab.bnLabel : tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Crisp Interior Interactive Canvas */}
        <div className="bg-white rounded-xl mt-2 p-4 sm:p-8 text-slate-900">
          <AnimatePresence mode="wait">
            {activeTab === 'router' && (
              <motion.div
                key="sandbox-router"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
              >
                {/* Left: Scenario Picker + Inbound Email */}
                <div className="lg:col-span-5 flex flex-col justify-between gap-4 border-b lg:border-b-0 lg:border-r border-slate-200 pb-6 lg:pb-0 lg:pr-6">
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-slate-500">
                      {language === 'bn'
                        ? '১. একটি রিয়েল-ওয়ার্ল্ড কাস্টমার ইমেইল সিলেক্ট করুন:'
                        : '1. Select an Inbound Client Email Scenario:'}
                    </div>
                    <div className="space-y-2">
                      {EMAIL_SCENARIOS.map((sc, idx) => (
                        <button
                          key={sc.id}
                          type="button"
                          onClick={() => setScenarioIdx(idx)}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                            scenarioIdx === idx
                              ? 'surface-brand-soft border-brand'
                              : 'bg-slate-50/70 border-slate-200 hover:bg-white'
                          }`}
                        >
                          <div className="text-[11px] font-mono text-slate-500">{sc.urgency}</div>
                          <div className="text-xs font-bold text-slate-900 mt-0.5">{sc.client}</div>
                          <div className="text-xs text-slate-600 truncate mt-0.5">{sc.subject}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-500">Inbound Client Message</div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      “{activeScenario.inboundSnippet}”
                    </p>
                  </div>
                </div>

                {/* Right: Python Specialist Scoring + Drafted Reply */}
                <div className="lg:col-span-7 flex flex-col justify-between gap-5">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-slate-900">
                        {language === 'bn'
                          ? '২. Python ওয়ার্কলোড ও দক্ষতা স্কোরিং (স্বয়ংক্রিয় কর্মী নির্বাচন)'
                          : '2. Python Workload & Skill Matching Breakdown'}
                      </div>
                      <span className="text-xs font-mono font-semibold text-emerald-700">
                        Assigned: {activeScenario.selectedSpecialist} ({activeScenario.matchScore}% Fit)
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {activeScenario.candidates.map((c, i) => (
                        <div key={c.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className={i === 0 ? 'font-bold text-slate-900' : 'text-slate-600'}>
                              {c.name} {i === 0 ? ' (Selected Lead)' : ''}
                            </span>
                            <span className="font-mono tabular-nums text-slate-500">
                              {c.load} · CSAT {c.csat} · <strong className="text-slate-900">{c.score}/100</strong>
                            </span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded overflow-hidden">
                            <motion.div
                              key={`${activeScenario.id}-${c.name}`}
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: c.score / 100 }}
                              transition={{ duration: 0.2, ease: 'easeOut' }}
                              style={{ transformOrigin: 'left' }}
                              className={`h-full rounded ${
                                i === 0 ? 'bg-brand-banner' : 'bg-slate-300'
                              }`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 surface-brand-soft border rounded-xl space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold">
                        {language === 'bn'
                          ? '৩. ড্রাফটকৃত অটো-রিপ্লাই প্রিভিউ'
                          : '3. Context-Aware Auto-Reply Draft'}
                      </span>
                      <div className="flex items-center gap-1 bg-white/80 p-0.5 rounded-md border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setReplyLang('bn')}
                          className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                            replyLang === 'bn' ? 'btn-brand' : 'text-slate-600'
                          }`}
                        >
                          বাংলা
                        </button>
                        <button
                          type="button"
                          onClick={() => setReplyLang('en')}
                          className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                            replyLang === 'en' ? 'btn-brand' : 'text-slate-600'
                          }`}
                        >
                          English
                        </button>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm leading-relaxed text-slate-800">
                      {replyLang === 'bn' ? activeScenario.replyBn : activeScenario.replyEn}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'roi' && (
              <motion.div
                key="sandbox-roi"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                <div className="lg:col-span-6 space-y-5">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold font-display text-slate-900">
                      {language === 'bn'
                        ? 'আপনার প্রতিষ্ঠানের বার্ষিক সময় ও রেভিনিউ সাশ্রয় হিসাব করুন'
                        : 'Model Your Annual Retention & Automation Savings'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Adjust sliders below to estimate operational impact across support, renewals, and HR payroll.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1.5">
                        <span className="text-slate-700">Monthly Inbound Support & Sales Emails</span>
                        <span className="font-mono tabular-nums font-bold text-brand">
                          {monthlyEmails.toLocaleString()} emails/mo
                        </span>
                      </div>
                      <input
                        type="range"
                        min={200}
                        max={5000}
                        step={100}
                        value={monthlyEmails}
                        onChange={(e) => setMonthlyEmails(Number(e.target.value))}
                        className="w-full accent-indigo-700 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1.5">
                        <span className="text-slate-700">Active B2B Client Accounts Managed</span>
                        <span className="font-mono tabular-nums font-bold text-brand">
                          {clientAccounts} accounts
                        </span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={250}
                        step={5}
                        value={clientAccounts}
                        onChange={(e) => setClientAccounts(Number(e.target.value))}
                        className="w-full accent-indigo-700 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1.5">
                        <span className="text-slate-700">CRM, Sales & HR Staff Headcount</span>
                        <span className="font-mono tabular-nums font-bold text-brand">
                          {teamSize} specialists
                        </span>
                      </div>
                      <input
                        type="range"
                        min={4}
                        max={80}
                        step={2}
                        value={teamSize}
                        onChange={(e) => setTeamSize(Number(e.target.value))}
                        className="w-full accent-indigo-700 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6 bg-brand-banner rounded-2xl p-6 sm:p-8 text-white space-y-6">
                  <div>
                    <div className="text-xs font-medium text-white/80">
                      Estimated 12-Month Net Value Generated
                    </div>
                    <div className="text-3xl sm:text-4xl font-bold font-mono tabular-nums mt-1">
                      {formatVal(netAnnualSavingsUsd)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                    <div>
                      <div className="text-xl font-bold font-mono tabular-nums">
                        {hoursSavedPerMonth} hrs/mo
                      </div>
                      <div className="text-xs text-white/80 mt-0.5">
                        Saved in manual email triage & payroll prep
                      </div>
                    </div>
                    <div>
                      <div className="text-xl font-bold font-mono tabular-nums">
                        {formatVal(protectedArrUsd)}
                      </div>
                      <div className="text-xs text-white/80 mt-0.5">
                        Protected client portfolio ARR under SLA guard
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onNavigateContact}
                      className="px-5 py-2.5 text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100 rounded-lg inline-flex items-center gap-1.5 transition-colors"
                    >
                      <span>
                        {language === 'bn'
                          ? 'কাস্টম প্রপোজাল রিকোয়েস্ট পাঠান'
                          : 'Request Tailored Deployment Plan'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'interview' && (
              <motion.div
                key="sandbox-interview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
              >
                <div className="lg:col-span-5 space-y-3">
                  <div className="text-xs font-semibold text-slate-500">
                    Select Candidate from AI Interview Studio:
                  </div>
                  {INTERVIEW_CANDIDATES.map((cand, idx) => (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() => setCandIdx(idx)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        candIdx === idx
                          ? 'surface-brand-soft border-brand'
                          : 'bg-slate-50 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="text-sm font-bold text-slate-900">{cand.name}</div>
                      <div className="text-xs text-slate-600 mt-0.5">{cand.role}</div>
                      <div className="text-[11px] font-mono text-brand font-semibold mt-1.5">
                        {cand.department} · {currency === 'BDT' ? cand.proposedBdt : cand.proposedUsd}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{activeCandidate.name}</div>
                      <div className="text-xs text-slate-500">{activeCandidate.role}</div>
                    </div>
                    <span className="text-xs font-mono font-semibold text-emerald-700">
                      {activeCandidate.verdict}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {activeCandidate.axes.map((ax) => (
                      <div key={ax.label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-700">{ax.label}</span>
                          <span className="font-mono tabular-nums font-bold text-slate-900">
                            {ax.score} / 100
                          </span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded overflow-hidden">
                          <motion.div
                            key={`${activeCandidate.id}-${ax.label}`}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: ax.score / 100 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            style={{ transformOrigin: 'left' }}
                            className="h-full bg-brand-banner rounded"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>1-Click Hire automatically creates Active Payroll Ledger</span>
                    </span>
                    <button
                      type="button"
                      onClick={onNavigateRegister}
                      className="font-semibold text-brand hover:underline"
                    >
                      Open Live Studio →
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'voucher' && (
              <motion.div
                key="sandbox-voucher"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="max-w-3xl mx-auto border border-slate-200 rounded-xl overflow-hidden bg-white"
              >
                <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-mono text-slate-400">
                      OFFICIAL MONTHLY SALARY DISBURSEMENT VOUCHER
                    </div>
                    <div className="text-base font-bold font-display mt-0.5">
                      {companyName} Enterprise Payroll Ledger
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <div className="text-emerald-400">STATUS: SETTLED</div>
                    <div className="text-slate-400">REF: PAY-2026-1108</div>
                  </div>
                </div>

                <div className="p-6 space-y-4 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-slate-200">
                    <div>
                      <div className="text-slate-500">Employee</div>
                      <div className="font-bold text-slate-900 mt-0.5">Nusrat Jahan</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Designation</div>
                      <div className="font-semibold text-slate-800 mt-0.5">Principal Retention Lead</div>
                    </div>
                    <div>
                      <div className="text-slate-500">CSAT / SLA Score</div>
                      <div className="font-mono font-semibold text-emerald-700 mt-0.5">99.1% Verified</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Currency</div>
                      <div className="font-mono font-semibold text-slate-900 mt-0.5">{currency}</div>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 font-mono tabular-nums">
                    <div className="py-2 flex justify-between">
                      <span className="font-sans text-slate-700">Base Monthly Compensation</span>
                      <span className="font-semibold text-slate-900">{formatVal(5200)}</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="font-sans text-slate-700">Closed-Won Expansion Commission (5%)</span>
                      <span className="font-semibold text-emerald-700">+ {formatVal(1150)}</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="font-sans text-slate-700">Retention KPI Performance Bonus</span>
                      <span className="font-semibold text-emerald-700">+ {formatVal(450)}</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="font-sans text-slate-600">Statutory Withholding Tax (10%)</span>
                      <span className="text-red-700">- {formatVal(680)}</span>
                    </div>
                    <div className="pt-3 flex justify-between text-sm font-bold text-slate-900">
                      <span className="font-sans">Net Disbursed Take-Home Pay</span>
                      <span className="text-brand">{formatVal(6120)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
