/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Briefcase,
  Building2,
  DollarSign,
  GitBranch,
  Globe,
  LayoutDashboard,
  LogOut,
  Mail,
  RefreshCw,
  Search,
  Settings,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import type { AuthUser, DashboardSnapshot, LanguageCode } from './shared/types';
import { crmApi, getStoredToken, setStoredToken } from './services/crmApi';
import { formatMoney } from './utils/formatters';
import {
  applyThemeToDocument,
  getSavedCanvasTint,
  getSavedTheme,
  type BrandThemeId,
  type CanvasTintId,
} from './utils/themePalette';
import { PublicWebsiteView } from './components/PublicWebsiteView';
import { ThemeCustomizerBar } from './components/ThemeCustomizerBar';
import { OverviewView } from './components/OverviewView';
import { RevenuePipelineView } from './components/RevenuePipelineView';
import { EmailAutomationView } from './components/EmailAutomationView';
import { TalentInterviewView } from './components/TalentInterviewView';
import { HRPayrollView } from './components/HRPayrollView';
import { CustomerRetentionView } from './components/CustomerRetentionView';
import { PlatformLongevityView } from './components/PlatformLongevityView';
import { ArchitectureView } from './components/ArchitectureView';
import { SettingsAndDataView } from './components/SettingsAndDataView';
import { ActionModals } from './components/ActionModals';
import { DocumentVoucherModal, type VoucherPayload } from './components/DocumentVoucherModal';
import { AvatarView } from './components/AvatarView';

type WorkspaceTab =
  | 'overview'
  | 'pipeline'
  | 'emails'
  | 'interviews'
  | 'hrpayroll'
  | 'customers'
  | 'longevity'
  | 'settings'
  | 'architecture';

interface SearchHit {
  id: string;
  targetId: string;
  title: string;
  subtitle: string;
  tab: WorkspaceTab;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [viewingWebsite, setViewingWebsite] = useState(false);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [focusedItemId, setFocusedItemId] = useState<string | undefined>(undefined);
  const [language, setLanguage] = useState<LanguageCode>('bn');
  const [theme, setTheme] = useState<BrandThemeId>(getSavedTheme);
  const [canvasTint, setCanvasTint] = useState<CanvasTintId>(getSavedCanvasTint);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModal, setActiveModal] = useState<
    'email' | 'candidate' | 'customer' | 'directHire' | 'deal' | null
  >(null);
  const [activeVoucher, setActiveVoucher] = useState<VoucherPayload | null>(null);

  useEffect(() => {
    applyThemeToDocument(theme, canvasTint);
  }, [theme, canvasTint]);

  async function fetchWorkspace() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await crmApi.getSnapshot();
      setSnapshot(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load workspace data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function restoreSession() {
      const token = getStoredToken();
      if (!token) {
        setAuthChecking(false);
        return;
      }
      try {
        const [{ user }, snap] = await Promise.all([
          crmApi.getCurrentUser(),
          crmApi.getSnapshot(),
        ]);
        setCurrentUser(user);
        setSnapshot(snap);
      } catch {
        setStoredToken(null);
        setCurrentUser(null);
      } finally {
        setAuthChecking(false);
      }
    }
    restoreSession();
  }, []);

  async function handleLogout() {
    try {
      await crmApi.logoutUser();
    } catch {
      // Ignore network errors on sign out
    } finally {
      setStoredToken(null);
      setCurrentUser(null);
      setViewingWebsite(false);
      setActiveVoucher(null);
      setActiveModal(null);
    }
  }

  function handleNavigate(tab: WorkspaceTab, itemId?: string) {
    setActiveTab(tab);
    setFocusedItemId(itemId);
    setSearchQuery('');
  }

  function handlePrimaryAction() {
    if (activeTab === 'pipeline') {
      setActiveModal('deal');
    } else if (activeTab === 'interviews') {
      setActiveModal('candidate');
    } else if (activeTab === 'hrpayroll') {
      setActiveModal('directHire');
    } else if (activeTab === 'customers') {
      setActiveModal('customer');
    } else {
      setActiveModal('email');
    }
  }

  const primaryActionLabel =
    activeTab === 'pipeline'
      ? 'New Deal'
      : activeTab === 'interviews'
        ? 'Add Candidate'
        : activeTab === 'hrpayroll'
          ? 'Direct Hire'
          : activeTab === 'customers'
            ? 'New Account'
            : 'Log Email';

  const navItems: { id: WorkspaceTab; label: string; bnLabel: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'Overview', bnLabel: 'ওভারভিউ ও অটোমেশন', icon: LayoutDashboard },
    { id: 'pipeline', label: 'Pipeline', bnLabel: 'সেলস ও রেভিনিউ পাইপলাইন', icon: Briefcase },
    { id: 'emails', label: 'Auto-Reply', bnLabel: 'ইমেইল অটো-রিপ্লাই', icon: Mail },
    { id: 'interviews', label: 'AI Interviews', bnLabel: 'এমপ্লয়ি ইন্টারভিউ', icon: UserCheck },
    { id: 'hrpayroll', label: 'HR & Payroll', bnLabel: 'নিয়োগ, ছুটি ও বেতন', icon: DollarSign },
    { id: 'customers', label: 'Client Retention', bnLabel: 'কাস্টমার ধরে রাখা', icon: Building2 },
    { id: 'longevity', label: 'Team Longevity', bnLabel: 'দীর্ঘমেয়াদী স্থায়িত্ব', icon: TrendingUp },
    { id: 'settings', label: 'Settings & Data', bnLabel: 'সেটিংস, থিম ও ডেটা', icon: Settings },
    { id: 'architecture', label: 'Architecture', bnLabel: 'সিস্টেম আর্কিটেকচার', icon: GitBranch },
  ];

  const searchHits = useMemo<SearchHit[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !snapshot) return [];
    const hits: SearchHit[] = [];
    const org = snapshot.orgSettings;

    for (const d of snapshot.deals ?? []) {
      if (d.title.toLowerCase().includes(q) || d.companyName.toLowerCase().includes(q)) {
        hits.push({
          id: `deal-${d.id}`,
          targetId: d.id,
          title: d.title,
          subtitle: `Deal · ${formatMoney(d.valueUsd, org)} · ${d.stage}`,
          tab: 'pipeline',
        });
      }
    }
    for (const c of snapshot.customers) {
      if (c.companyName.toLowerCase().includes(q) || c.contactName.toLowerCase().includes(q)) {
        hits.push({
          id: `cust-${c.id}`,
          targetId: c.id,
          title: c.companyName,
          subtitle: `Customer · ${formatMoney(c.arrUsd, org)} ARR · ${c.churnRisk} Risk`,
          tab: 'customers',
        });
      }
    }
    for (const e of snapshot.employees) {
      if (e.name.toLowerCase().includes(q) || e.role.toLowerCase().includes(q)) {
        hits.push({
          id: `emp-${e.id}`,
          targetId: e.id,
          title: e.name,
          subtitle: `HR & Payroll · ${e.role} · ${e.employmentStatus}`,
          tab: 'hrpayroll',
        });
      }
    }
    for (const em of snapshot.emails) {
      if (em.subject.toLowerCase().includes(q) || em.companyName.toLowerCase().includes(q)) {
        hits.push({
          id: `eml-${em.id}`,
          targetId: em.id,
          title: em.subject,
          subtitle: `Email · ${em.companyName} · ${em.status}`,
          tab: 'emails',
        });
      }
    }
    for (const cand of snapshot.candidates) {
      if (cand.name.toLowerCase().includes(q) || cand.role.toLowerCase().includes(q)) {
        hits.push({
          id: `cand-${cand.id}`,
          targetId: cand.id,
          title: cand.name,
          subtitle: `Candidate · ${cand.role} · ${cand.stage}`,
          tab: 'interviews',
        });
      }
    }

    return hits.slice(0, 7);
  }, [searchQuery, snapshot]);

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-xs font-medium text-slate-500">Loading workspace session...</div>
      </div>
    );
  }

  const brandName = snapshot?.orgSettings?.companyName || 'Aetheris CRM';

  if (!currentUser || viewingWebsite) {
    return (
      <PublicWebsiteView
        language={language}
        theme={theme}
        canvasTint={canvasTint}
        currentUser={currentUser}
        companyName={brandName}
        onLanguageChange={setLanguage}
        onThemeChange={setTheme}
        onCanvasChange={setCanvasTint}
        onEnterWorkspace={() => setViewingWebsite(false)}
        onAuthenticated={(user, snap) => {
          setCurrentUser(user);
          setSnapshot(snap);
          setViewingWebsite(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col text-slate-900 transition-colors duration-200">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="no-print bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-3 sm:gap-8 sticky top-0 z-30">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            handleNavigate('overview');
          }}
          className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 truncate max-w-[165px] sm:max-w-[240px] inline-flex items-center gap-2"
        >
          <span className="w-2.5 h-2.5 rounded-xs bg-brand-banner shrink-0" />
          <span className="truncate">{brandName}</span>
        </a>

        {/* Zone 2: Max 5 Clean Single-Line Navigation Links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-5 lg:gap-6 text-sm font-medium text-slate-600"
        >
          {navItems.slice(0, 5).map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 ${
                activeTab === item.id
                  ? 'text-brand font-semibold underline underline-offset-8 decoration-2'
                  : ''
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1 Primary Contextual Action */}
        <div className="flex items-center shrink-0">
          <button
            onClick={handlePrimaryAction}
            className="btn-brand min-h-[38px] px-3.5 sm:px-4 py-2 text-xs font-semibold rounded-lg shadow-xs whitespace-nowrap shrink-0"
          >
            {primaryActionLabel}
          </button>
        </div>
      </header>

      {/* Main Enterprise Sidebar + Content Viewport */}
      <div className="no-print flex-1 flex max-w-[1440px] w-full mx-auto">
        {/* Desktop Sidebar Navigation (256px) */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white/90 p-5">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'btn-brand shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5 truncate">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{language === 'bn' ? item.bnLabel : item.label}</span>
                  </span>
                  {snapshot && item.id === 'pipeline' && (
                    <span className="font-mono tabular-nums text-[11px] opacity-85">
                      {(snapshot.deals ?? []).filter(
                        (d) => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost'
                      ).length}
                    </span>
                  )}
                  {snapshot && item.id === 'emails' && (
                    <span className="font-mono tabular-nums text-[11px] opacity-85">
                      {snapshot.emails.filter((e) => e.status !== 'Auto-Replied').length}
                    </span>
                  )}
                  {snapshot && item.id === 'interviews' && (
                    <span className="font-mono tabular-nums text-[11px] opacity-85">
                      {snapshot.candidates.length}
                    </span>
                  )}
                  {snapshot && item.id === 'hrpayroll' && (
                    <span className="font-mono tabular-nums text-[11px] opacity-85">
                      {snapshot.employees.filter((e) => e.employmentStatus !== 'Offboarded').length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-2.5">
            <div className="flex items-center gap-3">
              <AvatarView name={currentUser.name} avatarKey={currentUser.avatarKey || 'admin'} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-900 truncate">{currentUser.name}</div>
                <div className="text-[11px] text-slate-500 truncate">
                  {currentUser.role} · {currentUser.title}
                </div>
              </div>
            </div>
            <button
              onClick={() => setViewingWebsite(true)}
              className="w-full px-3 py-1.5 text-xs font-medium text-brand surface-brand-soft border rounded-lg transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'পাবলিক ওয়েবসাইট দেখুন' : 'Public Website Portal'}</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span>{language === 'bn' ? 'সাইন আউট' : 'Sign Out'}</span>
            </button>
          </div>
        </aside>

        {/* Main Workspace Canvas */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Mobile & Tablet Quick Section Switcher */}
          <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 ${
                  activeTab === item.id
                    ? 'btn-brand'
                    : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                {language === 'bn' ? item.bnLabel : item.label}
              </button>
            ))}
            <button
              onClick={() => setViewingWebsite(true)}
              className="min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 bg-white border border-slate-200 text-brand"
            >
              Website
            </button>
            <button
              onClick={handleLogout}
              className="min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 bg-white border border-slate-200 text-slate-700"
            >
              Sign Out
            </button>
          </div>

          {/* Contextual Workspace Toolbar + Instant Global Search + Live Theme Customizer */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="text-xs text-slate-500">
                <span>{brandName}</span>
                <span className="mx-1.5">/</span>
                <span className="text-brand font-semibold">
                  {navItems.find((n) => n.id === activeTab)?.label}
                </span>
                {snapshot?.orgSettings && (
                  <>
                    <span className="mx-1.5">·</span>
                    <span className="font-mono tabular-nums">
                      {snapshot.orgSettings.currencyCode} ({snapshot.orgSettings.currencySymbol})
                    </span>
                  </>
                )}
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                {activeTab === 'overview' &&
                  (language === 'bn'
                    ? 'AI CRM, অটোনোমাস ওয়ার্কফ্লো ও এইচআর কমান্ড সেন্টার'
                    : 'Executive Retention, Pipeline & Workforce Command')}
                {activeTab === 'pipeline' &&
                  (language === 'bn'
                    ? 'সেলস পাইপলাইন, ডিল কমিশন ও AI উইন-স্ট্র্যাটেজি বোর্ড'
                    : 'Commercial Deal Pipeline, Forecast & AI Deal Coach')}
                {activeTab === 'emails' &&
                  (language === 'bn'
                    ? 'ইমেইল অটো-রিপ্লাই ও স্মার্ট এমপ্লয়ি সিলেকশন স্টুডিও'
                    : 'AI Email Auto-Reply & Specialist Routing Studio')}
                {activeTab === 'interviews' &&
                  (language === 'bn'
                    ? 'AI এমপ্লয়ি ইন্টারভিউ, রুব্রিক মূল্যায়ন ও নিয়োগ'
                    : 'AI Candidate Interview & Talent Selection Studio')}
                {activeTab === 'hrpayroll' &&
                  (language === 'bn'
                    ? 'নিয়োগ, বেতন-বোনাস, ছুটি অনুমোদন ও নিয়ন্ত্রিত ছাঁটাই ব্যবস্থাপনা'
                    : 'Workforce Hiring, Payroll, Leave Cover & Offboarding')}
                {activeTab === 'customers' &&
                  (language === 'bn'
                    ? 'দীর্ঘমেয়াদী কাস্টমার রিটেনশন ও চার্ন প্রতিরোধ হাব'
                    : 'Long-Term Customer Retention & Renewal Hub')}
                {activeTab === 'longevity' &&
                  (language === 'bn'
                    ? 'এমপ্লয়ি ও প্ল্যাটফর্ম দীর্ঘমেয়াদী স্থায়িত্ব ইঞ্জিন'
                    : 'Employee & Platform Multi-Year Longevity Hub')}
                {activeTab === 'settings' &&
                  (language === 'bn'
                    ? 'কোম্পানি সেটিংস, থিম স্টুডিও, CSV বাল্ক ইমপোর্ট ও ওয়েবহুক'
                    : 'Organization Profile, Theme Studio, CSV Import & Webhooks')}
                {activeTab === 'architecture' &&
                  (language === 'bn'
                    ? 'Python 3 + SQLite3 সিস্টেম ডিজাইন ও আর্কিটেকচার'
                    : 'Python 3 + SQLite3 Layered Architecture Blueprint')}
              </h1>
            </div>

            {/* Global Workspace Search + Website Switcher + Live UI Theme Customizer */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    language === 'bn'
                      ? 'ডিল, কাস্টমার বা কর্মী খুঁজুন...'
                      : 'Search deals, clients, staff...'
                  }
                  className="min-h-[38px] pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg w-full sm:w-60 focus:outline-none focus:border-slate-500"
                />
                {searchQuery.trim() && (
                  <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-full sm:w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-lg z-40 divide-y divide-slate-100 overflow-hidden">
                    {searchHits.length === 0 ? (
                      <div className="p-3 text-xs text-slate-500">No matching records found.</div>
                    ) : (
                      searchHits.map((hit) => (
                        <button
                          key={hit.id}
                          onClick={() => handleNavigate(hit.tab, hit.targetId)}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 block transition-colors"
                        >
                          <div className="text-xs font-semibold text-slate-900 truncate">{hit.title}</div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">{hit.subtitle}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setViewingWebsite(true)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Globe className="w-3.5 h-3.5 text-brand" />
                <span>{language === 'bn' ? 'ওয়েবসাইট' : 'Website'}</span>
              </button>

              <ThemeCustomizerBar
                compact
                theme={theme}
                canvasTint={canvasTint}
                language={language}
                onThemeChange={setTheme}
                onCanvasChange={setCanvasTint}
                onLanguageChange={setLanguage}
              />

              <button
                onClick={fetchWorkspace}
                title="Refresh Workspace State"
                className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Loading / Error / Animated Populated Views */}
          {loading && !snapshot ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />
                ))}
              </div>
              <div className="h-96 bg-white border border-slate-200 rounded-xl animate-pulse" />
            </div>
          ) : loadError ? (
            <div className="p-8 bg-white border border-red-200 rounded-xl text-center space-y-3">
              <p className="text-sm font-medium text-red-800">{loadError}</p>
              <button
                onClick={fetchWorkspace}
                className="btn-brand px-4 py-2 text-xs font-medium rounded-lg"
              >
                Retry Connection
              </button>
            </div>
          ) : (
            snapshot && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  {activeTab === 'overview' && (
                    <OverviewView
                      snapshot={snapshot}
                      language={language}
                      onSnapshotChange={setSnapshot}
                      onNavigate={(tab, id) => handleNavigate(tab, id)}
                    />
                  )}
                  {activeTab === 'pipeline' && (
                    <RevenuePipelineView
                      snapshot={snapshot}
                      language={language}
                      initialDealId={focusedItemId}
                      onSnapshotChange={setSnapshot}
                      onOpenNewDealModal={() => setActiveModal('deal')}
                      onOpenVoucher={setActiveVoucher}
                    />
                  )}
                  {activeTab === 'emails' && (
                    <EmailAutomationView
                      snapshot={snapshot}
                      language={language}
                      initialEmailId={focusedItemId}
                      onSnapshotChange={setSnapshot}
                      onOpenNewEmailModal={() => setActiveModal('email')}
                    />
                  )}
                  {activeTab === 'interviews' && (
                    <TalentInterviewView
                      snapshot={snapshot}
                      language={language}
                      initialCandidateId={focusedItemId}
                      onSnapshotChange={setSnapshot}
                      onOpenNewCandidateModal={() => setActiveModal('candidate')}
                    />
                  )}
                  {activeTab === 'hrpayroll' && (
                    <HRPayrollView
                      snapshot={snapshot}
                      language={language}
                      initialEmployeeId={focusedItemId}
                      onSnapshotChange={setSnapshot}
                      onOpenDirectHireModal={() => setActiveModal('directHire')}
                      onOpenVoucher={setActiveVoucher}
                    />
                  )}
                  {activeTab === 'customers' && (
                    <CustomerRetentionView
                      snapshot={snapshot}
                      language={language}
                      initialCustomerId={focusedItemId}
                      onSnapshotChange={setSnapshot}
                      onOpenNewCustomerModal={() => setActiveModal('customer')}
                      onOpenVoucher={setActiveVoucher}
                    />
                  )}
                  {activeTab === 'longevity' && (
                    <PlatformLongevityView
                      snapshot={snapshot}
                      language={language}
                      initialEmployeeId={focusedItemId}
                      onSnapshotChange={setSnapshot}
                    />
                  )}
                  {activeTab === 'settings' && (
                    <SettingsAndDataView
                      snapshot={snapshot}
                      currentUser={currentUser}
                      language={language}
                      theme={theme}
                      canvasTint={canvasTint}
                      onThemeChange={setTheme}
                      onCanvasChange={setCanvasTint}
                      onLanguageChange={setLanguage}
                      onSnapshotChange={setSnapshot}
                    />
                  )}
                  {activeTab === 'architecture' && (
                    <ArchitectureView snapshot={snapshot} language={language} />
                  )}
                </motion.div>
              </AnimatePresence>
            )
          )}
        </main>
      </div>

      {snapshot && (
        <>
          <ActionModals
            modalType={activeModal}
            snapshot={snapshot}
            onClose={() => setActiveModal(null)}
            onSnapshotChange={(nextSnap, newId) => {
              setSnapshot(nextSnap);
              if (newId) {
                if (activeModal === 'deal') handleNavigate('pipeline', newId);
                if (activeModal === 'email') handleNavigate('emails', newId);
                if (activeModal === 'candidate') handleNavigate('interviews', newId);
                if (activeModal === 'directHire') handleNavigate('hrpayroll', newId);
                if (activeModal === 'customer') handleNavigate('customers', newId);
              }
            }}
          />

          <DocumentVoucherModal
            voucher={activeVoucher}
            orgSettings={snapshot.orgSettings}
            onClose={() => setActiveVoucher(null)}
          />
        </>
      )}
    </div>
  );
}
