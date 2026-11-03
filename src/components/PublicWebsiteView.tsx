import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Award,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  Eye,
  EyeOff,
  LayoutDashboard,
  Loader2,
  Lock,
  Mail,
  MapPin,
  PhoneCall,
  Send,
  ShieldCheck,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import type { AuthUser, DashboardSnapshot, LanguageCode } from '../shared/types';
import { crmApi, setStoredToken } from '../services/crmApi';
import type { BrandThemeId, CanvasTintId } from '../utils/themePalette';
import { ThemeCustomizerBar } from './ThemeCustomizerBar';
import { InteractivePlatformSandbox } from './InteractivePlatformSandbox';

import heroWorkspaceImg from '../assets/images/hero_enterprise_workspace_1793602942096.jpg';
import solutionsOpsImg from '../assets/images/solutions_ai_operations_1793602943759.jpg';
import careersCultureImg from '../assets/images/careers_team_culture_1793602944777.jpg';
import globalSummitImg from '../assets/images/global_client_summit_1793602945224.jpg';
import boardroomStrategyImg from '../assets/images/executive_strategy_boardroom_1793604795088.jpg';
import fintechStudioImg from '../assets/images/fintech_operations_studio_1793604794506.jpg';
import logisticsHubImg from '../assets/images/logistics_enterprise_hub_1793604794430.jpg';

export type PublicPageId =
  | 'home'
  | 'solutions'
  | 'careers'
  | 'pricing'
  | 'contact'
  | 'login'
  | 'register';

interface PublicWebsiteViewProps {
  initialPage?: PublicPageId;
  language: LanguageCode;
  theme: BrandThemeId;
  canvasTint: CanvasTintId;
  currentUser: AuthUser | null;
  companyName?: string;
  onLanguageChange: (lang: LanguageCode) => void;
  onThemeChange: (next: BrandThemeId) => void;
  onCanvasChange: (next: CanvasTintId) => void;
  onAuthenticated: (user: AuthUser, snapshot: DashboardSnapshot) => void;
  onEnterWorkspace?: () => void;
}

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle: string;
}

function ResilientImage({ src, alt, className = '', fallbackTitle }: ResilientImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className={`bg-brand-banner flex flex-col items-center justify-center p-8 text-white text-center ${className}`}
      >
        <Building2 className="w-8 h-8 opacity-90 mb-2" />
        <span className="text-sm font-semibold">{fallbackTitle}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

const OPEN_POSITIONS = [
  {
    id: 'job-1',
    role: 'Senior Customer Success Architect',
    department: 'Customer Success',
    location: 'Dhaka (Hybrid) / Remote',
    compBdt: '৳1,45,000 – ৳1,90,000 / mo',
    compUsd: '$4,800 – $6,200 / mo',
    skills: 'Enterprise Retention, Executive QBR, Bengali & English SLA',
    summary:
      'Lead multi-year renewal strategy, executive health reviews, and AI-assisted client escalation across banking and logistics portfolios.',
  },
  {
    id: 'job-2',
    role: 'Python & AI Workflow Systems Engineer',
    department: 'Solutions Engineering',
    location: 'Dhaka HQ / Singapore',
    compBdt: '৳1,65,000 – ৳2,30,000 / mo',
    compUsd: '$5,400 – $7,000 / mo',
    skills: 'Python 3.10, SQLite WAL, Webhook Integrations, Structured LLM Triage',
    summary:
      'Architect transactional CRM backends, high-throughput inbound email webhooks, and deterministic KPI payroll engines.',
  },
  {
    id: 'job-3',
    role: 'Enterprise Commercial Account Director',
    department: 'Enterprise Sales',
    location: 'Gulshan-2, Dhaka',
    compBdt: '৳1,35,000 + Deal Commission',
    compUsd: '$4,600 + Deal Commission',
    skills: 'B2B SaaS Closing, Multi-Year Contracts, C-Suite Negotiation',
    summary:
      'Drive new enterprise logo acquisition and seat expansion deals with automated commission settlement into monthly payroll.',
  },
];

export function PublicWebsiteView({
  initialPage = 'home',
  language,
  theme,
  canvasTint,
  currentUser,
  companyName = 'Aetheris',
  onLanguageChange,
  onThemeChange,
  onCanvasChange,
  onAuthenticated,
  onEnterWorkspace,
}: PublicWebsiteViewProps) {
  const [page, setPage] = useState<PublicPageId>(initialPage);
  const [showcaseIdx, setShowcaseIdx] = useState<number>(0);
  const [caseSectorFilter, setCaseSectorFilter] = useState<'all' | 'fintech' | 'logistics'>('all');

  // Pricing Interactive Controls
  const [pricingCurrency, setPricingCurrency] = useState<'BDT' | 'USD'>('BDT');
  const [annualBilling, setAnnualBilling] = useState<boolean>(true);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  // Careers Live Application State
  const [selectedJobId, setSelectedJobId] = useState<string>(OPEN_POSITIONS[0].id);
  const [appName, setAppName] = useState('');
  const [appEmail, setAppEmail] = useState('');
  const [appExp, setAppExp] = useState(4);
  const [appSummary, setAppSummary] = useState('');
  const [careerBusy, setCareerBusy] = useState(false);
  const [careerSuccess, setCareerSuccess] = useState<string | null>(null);
  const [careerErr, setCareerErr] = useState<string | null>(null);

  // Contact Live Webhook Form State
  const [contactName, setContactName] = useState('');
  const [contactCompany, setContactCompany] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactBusy, setContactBusy] = useState(false);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const [contactErr, setContactErr] = useState<string | null>(null);

  // Auth State (Strictly zero pre-filled Admin credentials!)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regTitle, setRegTitle] = useState('CRM Account Specialist');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPw, setShowRegPw] = useState(false);

  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  function goToPage(next: PublicPageId) {
    setPage(next);
    setAuthError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthBusy(true);
    try {
      const res = await crmApi.loginUser(loginEmail.trim(), loginPassword);
      setStoredToken(res.token);
      onAuthenticated(res.user, res.snapshot);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthBusy(true);
    try {
      const res = await crmApi.registerSpecialist({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        title: regTitle.trim() || 'CRM Account Specialist',
      });
      setStoredToken(res.token);
      onAuthenticated(res.user, res.snapshot);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Unable to register account.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleCareerApply(e: React.FormEvent) {
    e.preventDefault();
    setCareerErr(null);
    setCareerSuccess(null);
    setCareerBusy(true);
    try {
      const job = OPEN_POSITIONS.find((j) => j.id === selectedJobId) || OPEN_POSITIONS[0];
      const res = await crmApi.submitPublicCareerApplication({
        name: appName.trim(),
        email: appEmail.trim(),
        role: job.role,
        department: job.department,
        experienceYears: appExp,
        skills: job.skills,
        resumeSummary:
          appSummary.trim() ||
          `Applied for ${job.role} via Careers Portal with ${appExp} years of domain experience.`,
      });
      setAppName('');
      setAppEmail('');
      setAppSummary('');
      setCareerSuccess(
        language === 'bn'
          ? `আপনার আবেদন গৃহীত হয়েছে (ID: ${res.candidateId})! আমাদের এইচআর ও AI ইন্টারভিউ প্যানেলে আপনার প্রোফাইল যুক্ত হয়েছে।`
          : `Application submitted (Ref: ${res.candidateId})! Your profile is now queued in our AI Competency Interview studio.`
      );
    } catch (err) {
      setCareerErr(err instanceof Error ? err.message : 'Could not submit application.');
    } finally {
      setCareerBusy(false);
    }
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    setContactErr(null);
    setContactSuccess(null);
    setContactBusy(true);
    try {
      const res = await crmApi.triggerInboundWebhook({
        customerEmail: contactEmail.trim(),
        customerName: contactName.trim(),
        companyName: contactCompany.trim(),
        subject: contactSubject.trim() || 'Website Enterprise Consultation Request',
        inboundBody: contactMessage.trim(),
        autoReply: true,
        language,
      });
      setContactName('');
      setContactCompany('');
      setContactEmail('');
      setContactSubject('');
      setContactMessage('');
      setContactSuccess(
        language === 'bn'
          ? `ধন্যবাদ! আপনার বার্তাটি সরাসরি আমাদের লাইভ সিআরএম ইনবক্সে পৌঁছেছে (Ticket: ${res.emailId}) এবং একজন স্পেশালিস্ট অ্যাসাইন করা হয়েছে।`
          : `Thank you! Your message has been routed into our live CRM Inbox (Ref: ${res.emailId}) and matched with a specialist.`
      );
    } catch (err) {
      setContactErr(err instanceof Error ? err.message : 'Failed to send inquiry.');
    } finally {
      setContactBusy(false);
    }
  }

  const navLinks: { id: PublicPageId; label: string; bnLabel: string }[] = [
    { id: 'home', label: 'Home', bnLabel: 'হোম' },
    { id: 'solutions', label: 'Solutions', bnLabel: 'সলিউশনস' },
    { id: 'careers', label: 'Careers', bnLabel: 'ক্যারিয়ার' },
    { id: 'pricing', label: 'Pricing', bnLabel: 'প্রাইসিং' },
    { id: 'contact', label: 'Contact', bnLabel: 'যোগাযোগ' },
  ];

  const interactiveModules = [
    {
      num: '01',
      title:
        language === 'bn'
          ? 'AI ইমেইল অটো-রিপ্লাই ও সেরা স্পেশালিস্ট নির্বাচন'
          : 'AI Email Auto-Reply & Specialist Routing',
      metric: '< 4 Min SLA Response',
      summary:
        language === 'bn'
          ? 'কাস্টমারের প্রতিটি ইমেইলের সেন্টিমেন্ট ও আর্জেন্সি বিশ্লেষণ করে আমাদের Python ইঞ্জিন দক্ষ ও কম কাজের চাপ থাকা কর্মীকে বেছে নেয় এবং বাংলা/ইংরেজিতে রিপ্লাই তৈরি করে।'
          : 'Scores active team capacity, domain skill overlap, and historical CSAT in Python before drafting accurate bilingual client responses.',
      highlights: [
        'Deterministic workload-balanced specialist matching',
        'Live inbound webhook (/api/webhooks/inbound-email) + SMTP relay',
        'Native Bengali & English executive email drafting',
      ],
    },
    {
      num: '02',
      title:
        language === 'bn'
          ? 'দীর্ঘমেয়াদী কাস্টমার রিটেনশন ও কমার্শিয়াল ডিল পাইপলাইন'
          : 'Multi-Year Client Retention & Deal Pipeline',
      metric: '98.4% Net Revenue Retention',
      summary:
        language === 'bn'
          ? 'হেলথ স্কোর কমে গেলে স্বয়ংক্রিয়ভাবে ৩০-৬০-৯০ দিনের রিটেনশন প্লেবুক তৈরি হয় এবং ডিল ক্লোজ হলে স্বয়ংক্রিয়ভাবে কাস্টমারের ARR ও কর্মীর কমিশন পে-রোলে যুক্ত হয়।'
          : 'Flags silent seat-adoption drops early, builds 30-60-90 day executive save plans, and settles Closed-Won commissions directly into payroll.',
      highlights: [
        'Proactive churn risk radar with 1-click outreach execution',
        '5-stage commercial deal board with AI Deal Coach',
        'Printable commercial client invoices with tax calculation',
      ],
    },
    {
      num: '03',
      title:
        language === 'bn'
          ? 'AI এমপ্লয়ি ইন্টারভিউ, রুব্রিক মূল্যায়ন ও নিয়োগ'
          : 'Structured AI Candidate Interviews & Hiring',
      metric: '4-Axis Hiring Rubric',
      summary:
        language === 'bn'
          ? 'প্রার্থীদের রোল অনুযায়ী অ্যাডাপ্টিভ প্রশ্ন করা, লাইভ উত্তর রেকর্ড করা এবং টেকনিক্যাল দক্ষতা ও দীর্ঘমেয়াদী ফিট যাচাই করে এক ক্লিকে নিয়োগ ও পে-রোলে যুক্ত করা।'
          : 'Conducts structured role-specific interviews, evaluates candidates across 4 objective axes, and enrolls hires directly into payroll.',
      highlights: [
        'Public Careers portal feeds directly into Screening queue',
        'Objective Technical, Clarity, Empathy & Longevity scoring',
        '1-click promotion from Selected Candidate to Active Employee',
      ],
    },
    {
      num: '04',
      title:
        language === 'bn'
          ? 'মাসিক বেতন ভাউচার, ছুটি ব্যাকআপ ও নিরাপদ ছাঁটাই'
          : 'Payroll Vouchers, Leave Backup & Safe Offboarding',
      metric: 'Zero Dropped Accounts',
      summary:
        language === 'bn'
          ? 'বেতন, KPI বোনাস ও ট্যাক্স হিসাব করে অফিসিয়াল পে-স্লিপ প্রিন্ট করুন। কোনো কর্মী ছুটিতে গেলে বা অব্যাহতি পেলে তার সকল কাস্টমার স্বয়ংক্রিয়ভাবে অন্য স্পেশালিস্টের কাছে স্থানান্তরিত হয়।'
          : 'Calculates monthly salaries, deal commissions, and pro-rata unpaid leave while ensuring automatic client handover during offboarding.',
      highlights: [
        'Printable & downloadable official Salary Payslip Vouchers',
        'Automatic SLA backup cover during approved employee leave',
        'Zero-orphan account transfer during employee offboarding',
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col text-slate-900">
      {/* Strict 3-Zone Top Bar Contract (Mobile + Tablet + Desktop Responsive) */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 sm:gap-8 sticky top-0 z-40">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            goToPage('home');
          }}
          className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-display whitespace-nowrap shrink-0 truncate max-w-[140px] sm:max-w-none"
        >
          {companyName}
        </a>

        {/* Zone 2: 5 Clean Single-Line Navigation Links */}
        <nav
          aria-label="Website Navigation"
          className="hidden md:flex items-center gap-6 lg:gap-7 text-sm font-medium text-slate-600"
        >
          {navLinks.map((item) => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => goToPage(item.id)}
                className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 ${
                  active ? 'text-brand font-semibold underline underline-offset-8 decoration-2' : ''
                }`}
              >
                {language === 'bn' ? item.bnLabel : item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Header Auth / Workspace Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {currentUser && onEnterWorkspace ? (
            <button
              type="button"
              onClick={onEnterWorkspace}
              className="min-h-[38px] px-3 sm:px-4 py-2 text-xs font-semibold rounded-lg btn-brand inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
              <span>{language === 'bn' ? 'ড্যাশবোর্ড' : 'Open Dashboard'}</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => goToPage('login')}
                className={`min-h-[38px] px-3 sm:px-4 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  page === 'login'
                    ? 'surface-brand-soft'
                    : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span className="sm:hidden">{language === 'bn' ? 'লগইন' : 'Login'}</span>
                <span className="hidden sm:inline">
                  {language === 'bn' ? 'লগইন (Login)' : 'Login'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => goToPage('register')}
                className="min-h-[38px] px-3 sm:px-4 py-2 text-xs font-semibold rounded-lg btn-brand whitespace-nowrap shrink-0"
              >
                <span className="sm:hidden">{language === 'bn' ? 'রেজিস্টার' : 'Register'}</span>
                <span className="hidden sm:inline">
                  {language === 'bn' ? 'রেজিস্টার (Register)' : 'Register'}
                </span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Live Theme Palette, Surface & Language Customizer Bar */}
      <ThemeCustomizerBar
        theme={theme}
        canvasTint={canvasTint}
        language={language}
        onThemeChange={onThemeChange}
        onCanvasChange={onCanvasChange}
        onLanguageChange={onLanguageChange}
      />

      {/* Mobile Navigation Strip (Scrollable with page — preserves 15% mobile sticky cap) */}
      <div className="flex md:hidden items-center gap-1.5 px-4 py-2 bg-white border-b border-slate-200 overflow-x-auto no-scrollbar">
        {navLinks.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => goToPage(item.id)}
            className={`min-h-[36px] px-3.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              page === item.id ? 'btn-brand' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {language === 'bn' ? item.bnLabel : item.label}
          </button>
        ))}
      </div>

      {/* Animated Multi-Page Main Content */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          {page === 'home' && (
            <motion.div
              key="page-home"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-14 sm:space-y-20 pb-16 sm:pb-20"
            >
              {/* 1. Editorial Hero Section */}
              <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-6 sm:pt-10 lg:pt-16">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                  <div className="lg:col-span-6 space-y-5 sm:space-y-6">
                    <div className="text-xs font-semibold text-brand">
                      {language === 'bn'
                        ? 'এন্টারপ্রাইজ সিআরএম · ইমেইল অটো-রিপ্লাই · AI নিয়োগ ও পে-রোল'
                        : 'Unified Customer Retention, AI Auto-Reply & Workforce OS'}
                    </div>

                    <h1
                      className="font-display font-bold text-slate-900 tracking-tight leading-[1.12]"
                      style={{ fontSize: 'clamp(2.2rem, 3.8vw, 3.5rem)', textWrap: 'balance' }}
                    >
                      {language === 'bn'
                        ? 'কাস্টমার ধরে রাখা, ইমেইল অটো-রিপ্লাই, কর্মী নিয়োগ ও বেতন — সব এক প্ল্যাটফর্মে'
                        : 'Retain Every Client, Automate Support & Run Payroll in One OS'}
                    </h1>

                    <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                      {language === 'bn'
                        ? 'বাস্তব ব্যবসার জন্য তৈরি Python 3 + SQLite3 নির্ভর আধুনিক প্ল্যাটফর্ম। ইনবাউন্ড ইমেইলে সেরা কর্মী বাছাই, কাস্টমার চার্ন প্রতিরোধ, AI ইন্টারভিউ এবং প্রিন্টেবল বেতন ভাউচার পরিচালনা করুন।'
                        : 'Built on a transactional Python 3 + SQLite3 engine. Route client emails to the best specialist, stop account churn early, interview candidates with objective rubrics, and issue official payslips.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => (currentUser && onEnterWorkspace ? onEnterWorkspace() : goToPage('register'))}
                        className="px-6 py-3 text-sm font-semibold rounded-lg btn-brand inline-flex items-center gap-2 whitespace-nowrap"
                      >
                        <span>
                          {currentUser
                            ? language === 'bn'
                              ? 'সিআরএম ওয়ার্কস্পেসে প্রবেশ করুন'
                              : 'Enter Live Workspace'
                            : language === 'bn'
                              ? 'টিম অ্যাকাউন্ট খুলুন'
                              : 'Create Specialist Account'}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => goToPage('solutions')}
                        className="px-5 py-3 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
                      >
                        {language === 'bn' ? 'সকল মডিউল দেখুন' : 'Explore Platform Modules'}
                      </button>
                    </div>

                    <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Python 3.10 + SQLite WAL</span>
                      <span aria-hidden="true">·</span>
                      <span>BDT (৳) & USD ($) Ready</span>
                      <span aria-hidden="true">·</span>
                      <span>Printable Payslips & Invoices</span>
                    </div>
                  </div>

                  <div className="lg:col-span-6">
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video">
                      <ResilientImage
                        src={heroWorkspaceImg}
                        alt="Sunlit modern enterprise software headquarters with collaborative teams"
                        fallbackTitle="Aetheris Enterprise Operations HQ"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent flex flex-col justify-end p-4 sm:p-6 text-white">
                        <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-3 sm:pt-4 border-t border-white/20">
                          <div>
                            <div className="text-base sm:text-xl font-bold font-mono tabular-nums">98.4%</div>
                            <div className="text-[10px] sm:text-[11px] text-slate-200 truncate">Client Retention</div>
                          </div>
                          <div>
                            <div className="text-base sm:text-xl font-bold font-mono tabular-nums">&lt; 4m</div>
                            <div className="text-[10px] sm:text-[11px] text-slate-200 truncate">AI Triage SLA</div>
                          </div>
                          <div>
                            <div className="text-base sm:text-xl font-bold font-mono tabular-nums">100%</div>
                            <div className="text-[10px] sm:text-[11px] text-slate-200 truncate">Handover Safety</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 2. Colorful Quantitative Proof Banner */}
              <section className="max-w-[1280px] mx-auto px-4 sm:px-6">
                <div className="bg-brand-banner rounded-2xl p-6 sm:p-8 lg:p-10 text-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                  <div>
                    <div className="text-3xl font-bold font-mono tabular-nums">+42%</div>
                    <div className="text-sm font-semibold mt-1">Faster First-Reply Resolution</div>
                    <p className="text-xs text-white/80 mt-1">
                      Measured across bilingual enterprise support queues in 90 days
                    </p>
                  </div>
                  <div>
                    <div className="text-3xl font-bold font-mono tabular-nums">Zero</div>
                    <div className="text-sm font-semibold mt-1">Orphaned Client Accounts</div>
                    <p className="text-xs text-white/80 mt-1">
                      Automatic portfolio transfer during employee leave or offboarding
                    </p>
                  </div>
                  <div>
                    <div className="text-3xl font-bold font-mono tabular-nums">4-Axis</div>
                    <div className="text-sm font-semibold mt-1">AI Hiring Competency Rubric</div>
                    <p className="text-xs text-white/80 mt-1">
                      Scores Technical Mastery, Clarity, Empathy & 24-Month Retention Fit
                    </p>
                  </div>
                  <div>
                    <div className="text-3xl font-bold font-mono tabular-nums">৳ &amp; $</div>
                    <div className="text-sm font-semibold mt-1">Dual-Currency Ledger</div>
                    <p className="text-xs text-white/80 mt-1">
                      Instant BDT and USD formatting across ARR, deals, and payslips
                    </p>
                  </div>
                </div>
              </section>

              {/* 2.5 Interactive Live Platform Sandbox & ROI Calculator */}
              <InteractivePlatformSandbox
                language={language}
                companyName={companyName}
                onNavigateContact={() => goToPage('contact')}
                onNavigateRegister={() => goToPage('register')}
              />

              {/* 3. Interactive Numbered Capabilities Explorer */}
              <section className="max-w-[1280px] mx-auto px-6 space-y-8">
                <div className="max-w-2xl space-y-2">
                  <div className="text-xs font-semibold text-brand">Core Operating Modules</div>
                  <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900">
                    {language === 'bn'
                      ? 'একটি পূর্ণাঙ্গ কোম্পানির ৪টি প্রধান ইঞ্জিন'
                      : 'Four Tightly Coupled Engines Built for Long-Term Retention'}
                  </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  <div className="lg:col-span-5 flex flex-col gap-2.5">
                    {interactiveModules.map((mod, idx) => {
                      const active = showcaseIdx === idx;
                      return (
                        <button
                          key={mod.num}
                          type="button"
                          onClick={() => setShowcaseIdx(idx)}
                          className={`text-left p-4 rounded-xl border transition-all ${
                            active
                              ? 'surface-brand-soft border-brand'
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-mono tabular-nums opacity-75">
                            <span>{mod.num}. Capability</span>
                            <span>{mod.metric}</span>
                          </div>
                          <div className="text-sm font-bold mt-1">{mod.title}</div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={interactiveModules[showcaseIdx].num}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18 }}
                        className="space-y-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200">
                          <span className="text-xs font-mono font-semibold text-brand">
                            {interactiveModules[showcaseIdx].num} · {interactiveModules[showcaseIdx].metric}
                          </span>
                          <span className="text-xs text-slate-500">Live in Workspace</span>
                        </div>

                        <h3 className="text-xl sm:text-2xl font-bold font-display text-slate-900">
                          {interactiveModules[showcaseIdx].title}
                        </h3>

                        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                          {interactiveModules[showcaseIdx].summary}
                        </p>

                        <div className="space-y-2.5 pt-2">
                          {interactiveModules[showcaseIdx].highlights.map((pt) => (
                            <div key={pt} className="flex items-start gap-2.5 text-sm text-slate-800">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{pt}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    <div className="pt-6 mt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => goToPage('solutions')}
                        className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1"
                      >
                        <span>{language === 'bn' ? 'বিস্তারিত আর্কিটেকচার দেখুন' : 'Inspect Full Architecture'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => goToPage('login')}
                        className="px-4 py-2 text-xs font-semibold rounded-lg btn-brand"
                      >
                        {language === 'bn' ? 'অ্যাকাউন্টে সাইন ইন করুন' : 'Sign In to Operate'}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* 3.5 End-to-End Closed-Loop Workflow Ribbon */}
              <section className="max-w-[1280px] mx-auto px-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
                  <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-slate-200">
                    <div>
                      <div className="text-xs font-semibold text-brand">Closed-Loop Operating Flow</div>
                      <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900 mt-0.5">
                        {language === 'bn'
                          ? 'ইনবাউন্ড ইমেইল থেকে শুরু করে বেতন ভাউচার পর্যন্ত স্বয়ংক্রিয় প্রবাহ'
                          : 'How Every Client Signal Connects Directly to Revenue & Payroll'}
                      </h2>
                    </div>
                    <span className="text-xs font-mono text-slate-500">
                      Zero Siloed Spreadsheets · Single SQLite WAL Store
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      {
                        step: 'Step 01',
                        title: language === 'bn' ? 'ওয়েবহুক ও ইমেইল গ্রহণ' : 'Inbound Webhook Capture',
                        desc:
                          language === 'bn'
                            ? 'ওয়েবসাইট বা ইমেইল থেকে আসা প্রতিটি মেসেজ আর্জেন্সি অনুযায়ী তাৎক্ষণিক শ্রেণীবিভাগ হয়।'
                            : 'Captures client inquiries via REST webhook and classifies urgency & sentiment.',
                      },
                      {
                        step: 'Step 02',
                        title: language === 'bn' ? 'দক্ষ স্পেশালিস্ট নির্বাচন' : 'Specialist Load Matching',
                        desc:
                          language === 'bn'
                            ? 'কর্মীর দক্ষতা, বর্তমান কাজের চাপ ও CSAT দেখে সেরা কর্মীকে অ্যাসাইন ও অটো-রিপ্লাই ড্রাফট।'
                            : 'Assigns the highest-fit specialist with open capacity and drafts bilingual replies.',
                      },
                      {
                        step: 'Step 03',
                        title: language === 'bn' ? 'রিনিউয়াল ও ডিল ক্লোজিং' : 'Renewal & Deal Expansion',
                        desc:
                          language === 'bn'
                            ? 'ঝুঁকিপূর্ণ অ্যাকাউন্টে রিটেনশন প্ল্যান এবং ডিল জিতলে স্বয়ংক্রিয়ভাবে কাস্টমারের ARR বৃদ্ধি।'
                            : 'Triggers 30-60-90 day save playbooks and updates portfolio ARR on Closed-Won deals.',
                      },
                      {
                        step: 'Step 04',
                        title: language === 'bn' ? 'কমিশন ও বেতন ভাউচার' : 'Commission & Payroll Slip',
                        desc:
                          language === 'bn'
                            ? 'ডিল কমিশন ও KPI বোনাস সরাসরি মাসিক বেতন ও প্রিন্টেবল পে-স্লিপে যুক্ত হয়।'
                            : 'Settles deal commissions and KPI bonuses straight into official monthly payslips.',
                      },
                    ].map((item) => (
                      <div key={item.step} className="space-y-2">
                        <div className="text-xs font-mono font-bold text-brand">{item.step}</div>
                        <h3 className="text-base font-bold font-display text-slate-900">{item.title}</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* 4. Editorial Case Study Photo Gallery with Interactive Sector Filter */}
              <section className="max-w-[1280px] mx-auto px-6 space-y-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="max-w-2xl space-y-2">
                    <div className="text-xs font-semibold text-brand">Verified Enterprise Impact</div>
                    <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900">
                      {language === 'bn'
                        ? 'বাস্তব প্রতিষ্ঠানগুলো যেভাবে রিটেনশন ও টিম পারফরম্যান্স বাড়িয়েছে'
                        : 'How Operations Teams Eliminate Churn & Hiring Guesswork'}
                    </h2>
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg">
                    {[
                      { id: 'all' as const, label: 'All Sectors', bn: 'সব সেক্টর' },
                      { id: 'fintech' as const, label: 'FinTech & Finance', bn: 'ফিনটেক ও ব্যাংকিং' },
                      { id: 'logistics' as const, label: 'Supply Chain', bn: 'লজিস্টিকস' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setCaseSectorFilter(tab.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                          caseSectorFilter === tab.id
                            ? 'btn-brand'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {language === 'bn' ? tab.bn : tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(caseSectorFilter === 'all' || caseSectorFilter === 'logistics') && (
                    <article className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between">
                      <div className="aspect-[16/10] bg-slate-900 overflow-hidden border-b border-slate-200">
                        <ResilientImage
                          src={logisticsHubImg}
                          alt="Modern enterprise supply chain and logistics coordination center"
                          fallbackTitle="Meghna Cloud Logistics Command Center"
                          className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
                        />
                      </div>
                      <div className="p-6 sm:p-8 space-y-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="text-xs font-mono text-emerald-700 font-semibold">
                            Supply Chain · +31% Renewal Velocity · Zero Unattended Escalations
                          </div>
                          <h3 className="text-lg font-bold font-display text-slate-900">
                            Meghna Cloud Logistics Protected ৳4.8 Cr in Annual Contracts During Peak Leave Season
                          </h3>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            “Before {companyName}, when an account manager took medical leave or resigned, enterprise renewal emails sat unanswered for days. Now the Python router reassigns every open client automatically and drafts context-aware Bengali & English replies in minutes.”
                          </p>
                        </div>
                        <div className="pt-4 border-t border-slate-100 text-xs text-slate-500">
                          <strong className="text-slate-900">Mahmudul Hasan</strong> · VP Customer Operations, Meghna Cloud Logistics
                        </div>
                      </div>
                    </article>
                  )}

                  {(caseSectorFilter === 'all' || caseSectorFilter === 'fintech') && (
                    <article className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between">
                      <div className="aspect-[16/10] bg-slate-900 overflow-hidden border-b border-slate-200">
                        <ResilientImage
                          src={fintechStudioImg}
                          alt="Modern financial technology operations studio in daylight"
                          fallbackTitle="FinGrid Dhaka Operations Floor"
                          className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
                        />
                      </div>
                      <div className="p-6 sm:p-8 space-y-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="text-xs font-mono text-brand font-semibold">
                            FinTech · 96% 18-Month Specialist Retention · Instant BDT Payslips
                          </div>
                          <h3 className="text-lg font-bold font-display text-slate-900">
                            FinGrid Dhaka Unified Candidate Rubric Scoring with Commission-Linked Payroll
                          </h3>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            “Linking closed-won expansion deals and CSAT scores directly to monthly payroll bonuses transformed our retention culture. Our HR lead runs structured AI interviews and prints official BDT salary vouchers from the exact same database.”
                          </p>
                        </div>
                        <div className="pt-4 border-t border-slate-100 text-xs text-slate-500">
                          <strong className="text-slate-900">Samira Chowdhury</strong> · Head of People & Finance, FinGrid Dhaka
                        </div>
                      </div>
                    </article>
                  )}
                </div>
              </section>

              {/* 5. Twilight Executive CTA Banner */}
              <section className="max-w-[1280px] mx-auto px-6">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 min-h-[280px] flex items-center">
                  <ResilientImage
                    src={globalSummitImg}
                    alt="Executive client lounge overlooking metropolitan skyline at twilight"
                    fallbackTitle="Global Enterprise Revenue & Talent Summit"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="relative z-10 w-full bg-gradient-to-r from-slate-950/90 via-slate-950/75 to-slate-950/40 p-8 sm:p-12 text-white flex flex-wrap items-center justify-between gap-6">
                    <div className="max-w-xl space-y-2">
                      <h2 className="text-2xl sm:text-3xl font-bold font-display">
                        {language === 'bn'
                          ? 'আজই আপনার প্রতিষ্ঠানের কাস্টমার ও এইচআর অপারেশন আধুনিক করুন'
                          : 'Ready to Unify Client Retention, Hiring & Payroll?'}
                      </h2>
                      <p className="text-sm text-slate-200">
                        {language === 'bn'
                          ? 'আমাদের লাইভ কন্টাক্ট ডেস্কে মেসেজ পাঠান অথবা অনুমোদিত অ্যাকাউন্টে লগইন করুন।'
                          : 'Send a live message straight into our AI-routed inbox or register a Specialist seat.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => goToPage('contact')}
                        className="px-5 py-2.5 text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
                      >
                        {language === 'bn' ? 'লাইভ ডেমো রিকোয়েস্ট পাঠান' : 'Send Live Inquiry'}
                      </button>
                      <button
                        type="button"
                        onClick={() => goToPage('pricing')}
                        className="px-5 py-2.5 text-xs font-semibold text-white border border-white/40 hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap"
                      >
                        {language === 'bn' ? 'প্রাইসিং প্ল্যান দেখুন' : 'Compare Plans'}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {page === 'solutions' && (
            <motion.div
              key="page-solutions"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-[1280px] mx-auto px-6 py-12 space-y-14"
            >
              <div className="max-w-3xl space-y-3">
                <div className="text-xs font-semibold text-brand">Platform Architecture & Solutions</div>
                <h1 className="text-3xl sm:text-4xl font-bold font-display text-slate-900">
                  {language === 'bn'
                    ? 'কাস্টমার সার্ভিস থেকে শুরু করে এমপ্লয়ি পে-রোল পর্যন্ত সম্পূর্ণ অটোমেশন'
                    : 'End-to-End Enterprise CRM, AI Triage & Workforce Lifecycle'}
                </h1>
                <p className="text-base text-slate-600 leading-relaxed">
                  Every action across email support, commercial deals, candidate interviews, and monthly payroll writes atomically to our relational Python 3 + SQLite WAL engine.
                </p>
              </div>

              {/* Asymmetric Bento Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between">
                  <div className="p-6 sm:p-8 space-y-3">
                    <div className="text-xs font-mono font-semibold text-brand">
                      01 · Intelligent Email Routing & Outbound SMTP
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900">
                      Auto-Reply Studio with Workload-Aware Specialist Selection
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Inbound client emails from your website or webhook are scored against every active employee’s skill tags, current portfolio load, and CSAT score—preventing specialist burnout while guaranteeing fast responses.
                    </p>
                  </div>
                  <div className="aspect-[16/9] border-t border-slate-200">
                    <ResilientImage
                      src={solutionsOpsImg}
                      alt="Customer success architects reviewing enterprise workflows"
                      fallbackTitle="AI Email Triage & Specialist Routing"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="lg:col-span-5 flex flex-col gap-6">
                  <div className="bg-brand-banner text-white rounded-2xl p-6 sm:p-8 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="text-xs font-mono opacity-85">02 · Revenue & Retention</div>
                      <h3 className="text-xl font-bold font-display">
                        30-60-90 Day Churn Playbooks & Deal Commissions
                      </h3>
                      <p className="text-sm text-white/85 leading-relaxed">
                        Generate executive renewal roadmaps for at-risk accounts and automatically credit closing commissions to deal owners when contracts hit Closed Won.
                      </p>
                    </div>
                    <div className="pt-4 border-t border-white/20 text-xs font-mono">
                      ARR Sync · Deal Win Coach · Printable Commercial Invoices
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-3 flex-1">
                    <div className="text-xs font-mono font-semibold text-emerald-700">
                      03 · AI Talent Bar-Raiser
                    </div>
                    <h3 className="text-xl font-bold font-display text-slate-900">
                      Structured Candidate Interviews & 1-Click Onboarding
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Generate adaptive technical and empathy questions, log live candidate responses, compute a 4-axis hiring verdict, and promote selected talent directly into active payroll.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Full-Width HR & Security Architecture Strip */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
                  <DollarSign className="w-5 h-5 text-emerald-700" />
                  <h3 className="text-base font-bold text-slate-900">Official Salary Payslip Vouchers</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Calculate base pay, KPI bonuses, pro-rata unpaid leave deductions, and tax withholdings with 1-click PDF/HTML voucher printing.
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
                  <UserCheck className="w-5 h-5 text-brand" />
                  <h3 className="text-base font-bold text-slate-900">Controlled Offboarding & Handover</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Offboarding or approving leave automatically reassigns all client accounts and open deals to a healthy backup specialist.
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  <h3 className="text-base font-bold text-slate-900">Database-Locked Admin Security</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Strict RBAC separates Specialist, HR Manager, and Database-Provisioned Admin privileges with PBKDF2-SHA256 password hashing.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {page === 'careers' && (
            <motion.div
              key="page-careers"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-[1280px] mx-auto px-6 py-12 space-y-12"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-4">
                  <div className="text-xs font-semibold text-brand">Careers & Talent Portal</div>
                  <h1 className="text-3xl sm:text-4xl font-bold font-display text-slate-900">
                    {language === 'bn'
                      ? 'আমাদের টিমে যোগ দিন — আপনার আবেদন সরাসরি AI ইন্টারভিউ পাইপলাইনে যুক্ত হবে'
                      : 'Build Long-Term Careers With Transparent Compensation'}
                  </h1>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    {language === 'bn'
                      ? 'নিচের ওপেন পজিশনগুলোতে আবেদন করলে আপনার প্রোফাইল সরাসরি আমাদের SQLite ডাটাবেসের AI Interview Studio-তে যুক্ত হবে।'
                      : 'Apply to any open role below. Submitting this form writes your candidate profile directly into our live SQLite Screening queue for structured evaluation.'}
                  </p>
                </div>
                <div className="lg:col-span-6 rounded-2xl overflow-hidden border border-slate-200 aspect-[4/3] max-h-[320px]">
                  <ResilientImage
                    src={careersCultureImg}
                    alt="Engineers and specialists collaborating in sunlit tech studio"
                    fallbackTitle="Aetheris Engineering & Customer Success Culture"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Open Roles List */}
                <div className="lg:col-span-7 space-y-4">
                  <h2 className="text-lg font-bold font-display text-slate-900">
                    {language === 'bn' ? 'বর্তমান ওপেন পজিশনসমূহ' : 'Open Positions'}
                  </h2>
                  {OPEN_POSITIONS.map((job) => {
                    const selected = selectedJobId === job.id;
                    return (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => setSelectedJobId(job.id)}
                        className={`w-full text-left p-5 rounded-xl border transition-all block ${
                          selected
                            ? 'surface-brand-soft border-brand'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="text-base font-bold text-slate-900">{job.role}</div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {job.department} · {job.location}
                            </div>
                          </div>
                          <div className="text-right font-mono tabular-nums text-xs">
                            <div className="font-bold text-slate-900">{job.compBdt}</div>
                            <div className="text-slate-500">{job.compUsd}</div>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 mt-3 leading-relaxed">{job.summary}</p>
                        <div className="text-[11px] text-slate-500 mt-2">
                          <strong className="text-slate-700">Skills:</strong> {job.skills}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Live Application Form -> SQLite candidates table */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                  <div className="pb-3 border-b border-slate-200">
                    <h3 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
                      <Award className="w-4 h-4 text-brand" />
                      <span>
                        {language === 'bn' ? 'সরাসরি চাকরির আবেদন করুন' : 'Apply for Selected Position'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Role: {OPEN_POSITIONS.find((j) => j.id === selectedJobId)?.role}
                    </p>
                  </div>

                  {careerSuccess && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                      {careerSuccess}
                    </div>
                  )}
                  {careerErr && (
                    <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                      {careerErr}
                    </div>
                  )}

                  <form onSubmit={handleCareerApply} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                      <input
                        required
                        type="text"
                        value={appName}
                        onChange={(e) => setAppName(e.target.value)}
                        placeholder="e.g. Rafiqul Islam"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                        <input
                          required
                          type="email"
                          value={appEmail}
                          onChange={(e) => setAppEmail(e.target.value)}
                          placeholder="rafiq@email.com"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Years Exp.</label>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={appExp}
                          onChange={(e) => setAppExp(Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Experience & Portfolio Summary
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={appSummary}
                        onChange={(e) => setAppSummary(e.target.value)}
                        placeholder="Briefly describe your relevant customer retention, engineering, or sales track record..."
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={careerBusy}
                      className="w-full py-2.5 px-4 text-xs font-semibold rounded-lg btn-brand inline-flex items-center justify-center gap-2"
                    >
                      {careerBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Briefcase className="w-4 h-4" />
                      )}
                      <span>
                        {language === 'bn' ? 'আবেদন জমা দিন (Submit Application)' : 'Submit Application'}
                      </span>
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

          {page === 'pricing' && (
            <motion.div
              key="page-pricing"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-[1280px] mx-auto px-6 py-12 space-y-12"
            >
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div className="max-w-2xl space-y-2">
                  <div className="text-xs font-semibold text-brand">Transparent BDT &amp; USD Plans</div>
                  <h1 className="text-3xl sm:text-4xl font-bold font-display text-slate-900">
                    {language === 'bn'
                      ? 'আপনার কোম্পানির আকার অনুযায়ী সাশ্রয়ী ও স্বচ্ছ প্রাইসিং'
                      : 'Predictable Pricing Built for Growing & Enterprise Teams'}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setPricingCurrency('BDT')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        pricingCurrency === 'BDT' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      BDT (৳)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPricingCurrency('USD')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        pricingCurrency === 'USD' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      USD ($)
                    </button>
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setAnnualBilling(true)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        annualBilling ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Annual (Save 20%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnnualBilling(false)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        !annualBilling ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Monthly
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                {/* Tier 1 */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="text-xs font-semibold text-slate-500">For Early-Stage Teams</div>
                    <h2 className="text-xl font-bold font-display text-slate-900">Growth CRM</h2>
                    <div className="font-mono tabular-nums">
                      <span className="text-3xl font-bold text-slate-900">
                        {pricingCurrency === 'BDT'
                          ? annualBilling
                            ? '৳9,500'
                            : '৳12,000'
                          : annualBilling
                            ? '$89'
                            : '$109'}
                      </span>
                      <span className="text-xs text-slate-500"> / month</span>
                    </div>
                    <ul className="space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-700">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Up to 10 Active Specialist Seats</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>AI Email Triage &amp; Auto-Reply Drafts</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>CSV Customer &amp; Staff Bulk Import</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Printable Salary Payslips &amp; Client Invoices</span>
                      </li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToPage('register')}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Start With Growth
                  </button>
                </div>

                {/* Tier 2 (Highlighted) */}
                <div className="bg-white border-2 border-brand rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="text-xs font-semibold text-brand">For Scaling Operations · Most Popular</div>
                    <h2 className="text-xl font-bold font-display text-slate-900">Business Retention &amp; HR</h2>
                    <div className="font-mono tabular-nums">
                      <span className="text-3xl font-bold text-slate-900">
                        {pricingCurrency === 'BDT'
                          ? annualBilling
                            ? '৳24,000'
                            : '৳29,500'
                          : annualBilling
                            ? '$229'
                            : '$279'}
                      </span>
                      <span className="text-xs text-slate-500"> / month</span>
                    </div>
                    <ul className="space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-700">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Up to 50 Specialist &amp; HR Manager Seats</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>30-60-90 Day AI Churn Prevention Playbooks</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>AI Candidate Interview &amp; 4-Axis Hiring Rubric</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Live Inbound Email Webhook + Python SMTP Relay</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Automated Deal Commission -&gt; Payroll Settlement</span>
                      </li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToPage('register')}
                    className="w-full py-2.5 px-4 text-xs font-semibold rounded-lg btn-brand"
                  >
                    Create Specialist Account
                  </button>
                </div>

                {/* Tier 3 */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="text-xs font-semibold text-slate-500">For Regulated Enterprises</div>
                    <h2 className="text-xl font-bold font-display text-slate-900">Dedicated Sovereign Cloud</h2>
                    <div className="font-mono tabular-nums">
                      <span className="text-3xl font-bold text-slate-900">
                        {pricingCurrency === 'BDT' ? '৳65,000+' : '$590+'}
                      </span>
                      <span className="text-xs text-slate-500"> / month</span>
                    </div>
                    <ul className="space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-700">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Unlimited Seats &amp; Dedicated SQLite/PostgreSQL Node</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>CLI Database-Locked Admin Provisioning</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Custom SLA Escalation Sweeps &amp; Audit Ledger</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Dedicated Dhaka &amp; Singapore Solutions Architect</span>
                      </li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToPage('contact')}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Contact Enterprise Sales
                  </button>
                </div>
              </div>

              {/* FAQ Accordion */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4">
                <h3 className="text-lg font-bold font-display text-slate-900">
                  Frequently Asked Operational Questions
                </h3>
                <div className="divide-y divide-slate-200">
                  {[
                    {
                      q: 'Can anyone register as an Admin from the public website?',
                      a: 'No. For enterprise security, public registration creates Specialist accounts only. Administrator accounts can exclusively be provisioned directly on the server SQLite database via backend_python/manage_admin.py.',
                    },
                    {
                      q: 'Can we switch between Bangladeshi Taka (৳) and US Dollars ($)?',
                      a: 'Yes. Workspace Admins and HR Managers can switch organization currency between BDT (৳) and USD ($) anytime in Settings & Data, updating all ARR, deal values, and printable payslips immediately.',
                    },
                    {
                      q: 'What happens to client accounts when an employee takes leave or is offboarded?',
                      a: 'Our Python workforce engine automatically transfers every assigned customer and open deal to an active backup specialist so zero client emails or renewals go unanswered.',
                    },
                  ].map((item, idx) => {
                    const isOpen = openFaqIdx === idx;
                    return (
                      <div key={item.q} className="py-3.5">
                        <button
                          type="button"
                          onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                          className="w-full flex items-center justify-between text-left text-sm font-semibold text-slate-900"
                        >
                          <span>{item.q}</span>
                          <ChevronDown
                            className={`w-4 h-4 text-slate-500 transition-transform ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">{item.a}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {page === 'contact' && (
            <motion.div
              key="page-contact"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-[1140px] mx-auto px-6 py-12"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                <div className="lg:col-span-5 space-y-6">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-brand">Live Inbound CRM Desk</div>
                    <h1 className="text-3xl font-bold font-display text-slate-900">
                      {language === 'bn'
                        ? 'আমাদের সাথে যোগাযোগ করুন — মেসেজ সরাসরি AI CRM ইনবক্সে যাবে'
                        : 'Talk to Our Solutions & Onboarding Team'}
                    </h1>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {language === 'bn'
                        ? 'এই ফর্মটি সরাসরি আমাদের লাইভ ওয়েবহুকের (/api/webhooks/inbound-email) সাথে যুক্ত। মেসেজ পাঠালেই AI স্বয়ংক্রিয়ভাবে সেরা স্পেশালিস্ট নির্বাচন করবে।'
                        : 'This form is wired directly to our live inbound email webhook. Submitting an inquiry routes your message into our SQLite inbox and assigns an active specialist.'}
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 text-xs text-slate-600">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900">Dhaka Engineering &amp; Sales Hub</div>
                        <div>Gulshan-2 Avenue, Dhaka 1212, Bangladesh</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900">Enterprise Support Desk</div>
                        <div className="font-mono">support@aetheris.io</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <PhoneCall className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900">SLA Response Target</div>
                        <div>Under 4 Hours (Critical Enterprise Escalations &lt; 15m)</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5">
                  <h2 className="text-lg font-bold font-display text-slate-900">
                    {language === 'bn' ? 'লাইভ ইনকোয়ারি পাঠান' : 'Send a Live Enterprise Inquiry'}
                  </h2>

                  {contactSuccess && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                      {contactSuccess}
                    </div>
                  )}
                  {contactErr && (
                    <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                      {contactErr}
                    </div>
                  )}

                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Your Name</label>
                        <input
                          required
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="e.g. Farহান আহমেদ / Farhan Ahmed"
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Company Name</label>
                        <input
                          required
                          type="text"
                          value={contactCompany}
                          onChange={(e) => setContactCompany(e.target.value)}
                          placeholder="e.g. Apex Digital Ltd."
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Work Email</label>
                        <input
                          required
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="farhan@company.com"
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Subject</label>
                        <input
                          required
                          type="text"
                          value={contactSubject}
                          onChange={(e) => setContactSubject(e.target.value)}
                          placeholder="100-Seat CRM & Payroll Deployment"
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        How can our team help? (বাংলা অথবা English)
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="Tell us about your customer support volume, team size, or payroll needs..."
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={contactBusy}
                      className="px-6 py-2.5 text-xs font-semibold rounded-lg btn-brand inline-flex items-center gap-2"
                    >
                      {contactBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {language === 'bn' ? 'মেসেজ পাঠান (AI ইনবক্সে যাবে)' : 'Dispatch to Live CRM Inbox'}
                      </span>
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

          {page === 'login' && (
            <motion.div
              key="page-login"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-[1140px] mx-auto px-6 py-12"
            >
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm grid grid-cols-1 lg:grid-cols-12 items-stretch">
                {/* Left Editorial Visual Column */}
                <div className="lg:col-span-6 relative min-h-[300px] bg-slate-950 flex flex-col justify-end">
                  <ResilientImage
                    src={boardroomStrategyImg}
                    alt="Executive strategy boardroom overlooking city skyline at golden hour"
                    fallbackTitle="Authorized Enterprise Command Portal"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="relative z-10 bg-gradient-to-t from-slate-950/95 via-slate-950/65 to-slate-950/20 p-8 text-white space-y-4">
                    <div className="text-xs font-mono text-white/80">
                      PBKDF2-SHA256 Session Guard · SQLite WAL Persistence
                    </div>
                    <h2 className="text-2xl font-bold font-display leading-snug">
                      {language === 'bn'
                        ? 'একই ওয়ার্কস্পেস থেকে ডিল পাইপলাইন, অটো-রিপ্লাই এবং পে-রোল পরিচালনা করুন'
                        : 'Operate Client Renewals, AI Triage & Monthly Payroll from One Console'}
                    </h2>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      Role-isolated sessions protect sensitive compensation, offboarding, and organization settings while giving specialists instant access to client queues.
                    </p>
                  </div>
                </div>

                {/* Right Clean Login Form (Strictly zero exposed Admin credentials) */}
                <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-center space-y-6">
                  <div>
                    <div className="text-xs font-semibold text-brand">Authorized Workspace Sign-In</div>
                    <h1 className="text-2xl font-bold font-display text-slate-900 mt-1">
                      {language === 'bn' ? 'আপনার অ্যাকাউন্টে লগইন করুন' : 'Sign In to Workspace'}
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                      {language === 'bn'
                        ? 'আপনার অনুমোদিত ওয়ার্ক ইমেইল এবং পাসওয়ার্ড প্রদান করুন।'
                        : 'Enter your assigned work email and password to launch your CRM session.'}
                    </p>
                  </div>

                  {authError && (
                    <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                      {authError}
                    </div>
                  )}

                  <form onSubmit={handleLoginSubmit} className="space-y-4" autoComplete="on">
                    <div>
                      <label htmlFor="portal-login-email" className="block text-xs font-medium text-slate-700 mb-1.5">
                        {language === 'bn' ? 'অফিসিয়াল ইমেইল (Work Email)' : 'Work Email'}
                      </label>
                      <input
                        id="portal-login-email"
                        required
                        type="email"
                        autoComplete="username"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="name@yourcompany.com"
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-600"
                      />
                    </div>

                    <div>
                      <label htmlFor="portal-login-pw" className="block text-xs font-medium text-slate-700 mb-1.5">
                        {language === 'bn' ? 'পাসওয়ার্ড (Password)' : 'Password'}
                      </label>
                      <div className="relative">
                        <input
                          id="portal-login-pw"
                          required
                          type={showLoginPw ? 'text' : 'password'}
                          autoComplete="current-password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPw((v) => !v)}
                          aria-label={showLoginPw ? 'Hide password' : 'Show password'}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                        >
                          {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={authBusy}
                      className="w-full py-3 px-4 text-xs font-semibold rounded-lg btn-brand inline-flex items-center justify-center gap-2"
                    >
                      {authBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                      <span>{language === 'bn' ? 'লগইন করুন' : 'Sign In'}</span>
                    </button>
                  </form>

                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                    <span>{language === 'bn' ? 'নতুন স্পেশালিস্ট সদস্য?' : 'New team specialist?'}</span>
                    <button
                      type="button"
                      onClick={() => goToPage('register')}
                      className="font-semibold text-brand hover:underline"
                    >
                      {language === 'bn' ? 'রেজিস্টার করুন' : 'Create Specialist Account'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {page === 'register' && (
            <motion.div
              key="page-register"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-[1140px] mx-auto px-6 py-12"
            >
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm grid grid-cols-1 lg:grid-cols-12 items-stretch">
                {/* Left Editorial Visual Column */}
                <div className="lg:col-span-5 relative min-h-[300px] bg-slate-950 flex flex-col justify-end">
                  <ResilientImage
                    src={careersCultureImg}
                    alt="Collaborative CRM specialists working together in modern studio"
                    fallbackTitle="Specialist Workspace Onboarding"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="relative z-10 bg-gradient-to-t from-slate-950/95 via-slate-950/65 to-slate-950/20 p-8 text-white space-y-4">
                    <div className="text-xs font-mono text-white/80">
                      Team Specialist Seat · Instant Queue Access
                    </div>
                    <h2 className="text-2xl font-bold font-display leading-snug">
                      {language === 'bn'
                        ? 'কাস্টমার সাকসেস ও সেলস স্পেশালিস্ট হিসেবে জয়েন করুন'
                        : 'Join Your Team’s Live Retention & Deal Pipeline'}
                    </h2>
                    <div className="space-y-2 text-xs text-slate-200">
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>AI-assisted Bengali &amp; English email drafting</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Real-time client health &amp; deal pipeline access</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Strict database-level Administrator isolation</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Specialist Registration Form (Strictly Specialist Role Only) */}
                <div className="lg:col-span-7 p-6 sm:p-10 space-y-5">
                  <div>
                    <div className="text-xs font-semibold text-brand">Team Specialist Onboarding</div>
                    <h1 className="text-2xl font-bold font-display text-slate-900 mt-1">
                      {language === 'bn'
                        ? 'স্পেশালিস্ট অ্যাকাউন্ট রেজিস্টার করুন'
                        : 'Register Specialist Account'}
                    </h1>
                  </div>

                  {authError && (
                    <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                      {authError}
                    </div>
                  )}

                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        {language === 'bn' ? 'পূর্ণ নাম (Full Name)' : 'Full Name'}
                      </label>
                      <input
                        required
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="e.g. Nadia Islam"
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Work Email</label>
                        <input
                          required
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="nadia@company.com"
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Designation</label>
                        <input
                          required
                          type="text"
                          value={regTitle}
                          onChange={(e) => setRegTitle(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Password (min 6 characters)
                      </label>
                      <div className="relative">
                        <input
                          required
                          minLength={6}
                          type={showRegPw ? 'text' : 'password'}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-white border border-slate-200 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPw((v) => !v)}
                          aria-label={showRegPw ? 'Hide password' : 'Show password'}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                        >
                          {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 surface-brand-soft border rounded-lg text-[11px] leading-relaxed">
                      {language === 'bn'
                        ? 'নোট: ওয়েবসাইট থেকে রেজিস্টার করলে শুধুমাত্র Specialist রোল তৈরি হয়। নিরাপত্তার স্বার্থে ওয়েবসাইট থেকে Admin অ্যাকাউন্ট তৈরি করা সম্পূর্ণ নিষিদ্ধ (Admin শুধুমাত্র ডাটাবেস থেকে তৈরি করা যায়)।'
                        : 'Security Policy: Website registration issues Specialist access only. Administrator accounts cannot be registered via the website and are provisioned exclusively in SQLite.'}
                    </div>

                    <button
                      type="submit"
                      disabled={authBusy}
                      className="w-full py-3 px-4 text-xs font-semibold rounded-lg btn-brand inline-flex items-center justify-center gap-2"
                    >
                      {authBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      <span>
                        {language === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন' : 'Complete Specialist Registration'}
                      </span>
                    </button>
                  </form>

                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                    <span>{language === 'bn' ? 'ইতিমধ্যে অ্যাকাউন্ট আছে?' : 'Already have an account?'}</span>
                    <button
                      type="button"
                      onClick={() => goToPage('login')}
                      className="font-semibold text-brand hover:underline"
                    >
                      {language === 'bn' ? 'লগইন করুন' : 'Sign In'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Structured 4-Column Enterprise Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-[1280px] mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 text-xs text-slate-600">
          <div className="lg:col-span-4 space-y-3">
            <div className="text-lg font-bold text-slate-900 font-display">{companyName}</div>
            <p className="leading-relaxed text-slate-500 max-w-xs">
              {language === 'bn'
                ? 'কাস্টমার রিটেনশন, AI ইমেইল অটো-রিপ্লাই, কর্মী ইন্টারভিউ এবং অফিসিয়াল পে-রোল পরিচালনার আধুনিক এন্টারপ্রাইজ প্ল্যাটফর্ম।'
                : 'Enterprise Customer Retention, AI Email Auto-Reply, Competency Hiring, and Payroll OS powered by Python 3 & SQLite WAL.'}
            </p>
            <div className="text-[11px] font-mono text-slate-400">
              BDT (৳) &amp; USD ($) Dual-Ledger Ready
            </div>
          </div>

          <div className="lg:col-span-3 space-y-2.5">
            <div className="font-semibold text-slate-900">Platform Modules</div>
            <ul className="space-y-2">
              <li>
                <button type="button" onClick={() => goToPage('solutions')} className="hover:text-slate-900">
                  AI Email Auto-Reply &amp; Routing
                </button>
              </li>
              <li>
                <button type="button" onClick={() => goToPage('solutions')} className="hover:text-slate-900">
                  Commercial Deal Pipeline
                </button>
              </li>
              <li>
                <button type="button" onClick={() => goToPage('careers')} className="hover:text-slate-900">
                  4-Axis Candidate Interviews
                </button>
              </li>
              <li>
                <button type="button" onClick={() => goToPage('solutions')} className="hover:text-slate-900">
                  Payroll Vouchers &amp; Safe Offboarding
                </button>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2 space-y-2.5">
            <div className="font-semibold text-slate-900">Portal Navigation</div>
            <ul className="space-y-2">
              {navLinks.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => goToPage(item.id)}
                    className="hover:text-slate-900 transition-colors"
                  >
                    {language === 'bn' ? item.bnLabel : item.label}
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={() => goToPage('login')} className="text-brand font-semibold hover:underline">
                  {language === 'bn' ? 'লগইন (Login)' : 'Workspace Login'}
                </button>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-3 space-y-2.5">
            <div className="font-semibold text-slate-900">Regional Hubs</div>
            <p className="text-slate-500 leading-relaxed">
              Level 12, Gulshan Avenue, Dhaka 1212, Bangladesh
            </p>
            <p className="text-slate-500 leading-relaxed">
              Marina Bay Financial Centre, Singapore
            </p>
            <button
              type="button"
              onClick={() => goToPage('contact')}
              className="text-brand font-semibold hover:underline inline-flex items-center gap-1 pt-1"
            >
              <span>{language === 'bn' ? 'সরাসরি মেসেজ পাঠান' : 'Dispatch Live Inquiry'}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100 py-4 px-6">
          <div className="max-w-[1280px] mx-auto flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
            <span>© {new Date().getFullYear()} {companyName}. All rights reserved.</span>
            <span>Role-Isolated Security · Database-Only Administrator Governance</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
