import React, { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Copy,
  Database,
  Download,
  FileSpreadsheet,
  KeyRound,
  Loader2,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
  Webhook,
  Palette,
  Check,
} from 'lucide-react';
import type {
  AuthUser,
  DashboardSnapshot,
  LanguageCode,
  WorkspaceUserSummary,
} from '../shared/types';
import { API_BASE_URL, crmApi } from '../services/crmApi';
import {
  BRAND_THEMES,
  CANVAS_TINTS,
  type BrandThemeId,
  type CanvasTintId,
} from '../utils/themePalette';

interface SettingsAndDataViewProps {
  snapshot: DashboardSnapshot;
  currentUser: AuthUser;
  language: LanguageCode;
  theme?: BrandThemeId;
  canvasTint?: CanvasTintId;
  onThemeChange?: (next: BrandThemeId) => void;
  onCanvasChange?: (next: CanvasTintId) => void;
  onLanguageChange?: (lang: LanguageCode) => void;
  onSnapshotChange: (next: DashboardSnapshot) => void;
}

const CUSTOMER_CSV_TEMPLATE = `company_name,industry,contact_name,contact_email,arr_usd,renewal_date,notes
Square Pharmaceuticals PLC,Healthcare & Pharma,Tanvir Ahmed,t.ahmed@squarepharma.com.bd,165000,2027-06-30,Enterprise distribution CRM & bilingual SLA support
Chaldal Grocery Logistics,E-Commerce & Cold Chain,Nadia Islam,nadia@chaldal.com,92000,2027-04-15,Warehouse dispatch escalation & retention tracking`;

const EMPLOYEE_CSV_TEMPLATE = `name,email,role,department,base_salary_usd,skills
Farzana Yasmin,farzana@company.io,Senior Account Manager,Customer Success,5400,Enterprise Renewal; Bengali & English Support; Executive QBR
Sajidul Karim,sajid@company.io,Python Integration Engineer,Solutions Engineering,5800,Python SDK; Webhook Architecture; API Escalation`;

export function SettingsAndDataView({
  snapshot,
  currentUser,
  language,
  theme = 'indigo',
  canvasTint = 'pearl',
  onThemeChange,
  onCanvasChange,
  onLanguageChange,
  onSnapshotChange,
}: SettingsAndDataViewProps) {
  const org = snapshot.orgSettings;

  // Organization Profile State
  const [companyName, setCompanyName] = useState(org.companyName);
  const [companyDomain, setCompanyDomain] = useState(org.companyDomain);
  const [supportEmail, setSupportEmail] = useState(org.supportEmail);
  const [companyAddress, setCompanyAddress] = useState(org.companyAddress);
  const [currencyCode, setCurrencyCode] = useState<'USD' | 'BDT'>(org.currencyCode);
  const [taxRate, setTaxRate] = useState<number>(org.defaultTaxRatePct);
  const [slaHours, setSlaHours] = useState<number>(org.slaTargetHours);
  const [autoTriageWebhook, setAutoTriageWebhook] = useState<boolean>(org.autoTriageWebhook);

  // CSV Import State
  const [importTarget, setImportTarget] = useState<'customers' | 'employees'>('customers');
  const [csvText, setCsvText] = useState<string>(CUSTOMER_CSV_TEMPLATE);

  // Confirmation States (inline — zero window.confirm)
  const [confirmCleanSlate, setConfirmCleanSlate] = useState(false);

  // Status / Feedback
  const [busy, setBusy] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Admin-Only Staff Account Management State
  const isAdmin = currentUser.role === 'Admin';
  const [usersList, setUsersList] = useState<WorkspaceUserSummary[]>([]);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState<'HRManager' | 'Specialist'>('Specialist');
  const [staffTitle, setStaffTitle] = useState('CRM Account Specialist');
  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');

  useEffect(() => {
    setCompanyName(org.companyName);
    setCompanyDomain(org.companyDomain);
    setSupportEmail(org.supportEmail);
    setCompanyAddress(org.companyAddress);
    setCurrencyCode(org.currencyCode);
    setTaxRate(org.defaultTaxRatePct);
    setSlaHours(org.slaTargetHours);
    setAutoTriageWebhook(org.autoTriageWebhook);
  }, [org]);

  useEffect(() => {
    if (!isAdmin) return;
    crmApi
      .listWorkspaceUsers()
      .then((res) => setUsersList(res.users))
      .catch(() => {
        // Non-blocking if session refreshes
      });
  }, [isAdmin]);

  const webhookUrl = `${API_BASE_URL || window.location.origin}/api/webhooks/inbound-email`;

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setBanner(null);
    setBusy('save-org');
    try {
      const res = await crmApi.updateOrgSettings({
        companyName,
        companyDomain,
        supportEmail,
        companyAddress,
        currencyCode,
        defaultTaxRatePct: taxRate,
        slaTargetHours: slaHours,
        autoTriageWebhook,
      });
      onSnapshotChange(res.snapshot);
      setBanner(
        language === 'bn'
          ? 'কোম্পানির প্রোফাইল ও কারেন্সি সেটিংস সফলভাবে সংরক্ষিত হয়েছে!'
          : 'Company profile, currency, and webhook settings saved.'
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update settings.');
    } finally {
      setBusy(null);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCsvText(reader.result);
      }
    };
    reader.readAsText(file);
  }

  function handleDownloadTemplate(kind: 'customers' | 'employees') {
    const content = kind === 'customers' ? CUSTOMER_CSV_TEMPLATE : EMPLOYEE_CSV_TEMPLATE;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aetheris-${kind}-template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleRunCsvImport() {
    setErrorMsg(null);
    setBanner(null);
    setBusy('csv-import');
    try {
      const res =
        importTarget === 'customers'
          ? await crmApi.importCustomersCsv(csvText)
          : await crmApi.importEmployeesCsv(csvText);
      onSnapshotChange(res.snapshot);
      setBanner(
        language === 'bn'
          ? `CSV থেকে সফলভাবে ${res.importedCount} টি রেকর্ড ডাটাবেসে যুক্ত হয়েছে!`
          : `Successfully imported ${res.importedCount} ${importTarget} record(s) into SQLite.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'CSV import failed.');
    } finally {
      setBusy(null);
    }
  }

  function handleExportFullBackupJson() {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${org.companyName.toLowerCase().replace(/\s+/g, '-')}-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleWorkspaceReset(mode: 'clean_slate' | 'restore_demo') {
    setErrorMsg(null);
    setBanner(null);
    setBusy(mode);
    try {
      const res = await crmApi.resetWorkspace(mode);
      onSnapshotChange(res.snapshot);
      setConfirmCleanSlate(false);
      setBanner(
        mode === 'clean_slate'
          ? language === 'bn'
            ? 'সকল ডেমো ডাটা মুছে ফেলা হয়েছে। এখন আপনার আসল কাস্টমার, ডিল ও এমপ্লয়ি যুক্ত করুন!'
            : 'Demo records cleared. Your clean production workspace is ready.'
          : language === 'bn'
            ? 'রেফারেন্স ডেমো ডাটা পুনরায় লোড করা হয়েছে।'
            : 'Reference enterprise demo dataset restored.'
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Workspace reset failed.');
    } finally {
      setBusy(null);
    }
  }

  async function handleTestLiveWebhook() {
    setErrorMsg(null);
    setBanner(null);
    setBusy('test-webhook');
    try {
      const res = await crmApi.triggerInboundWebhook({
        customerEmail: 'procurement@bracbank-corp.bd',
        customerName: 'Kamrul Hasan',
        companyName: 'Delta Corporate Banking',
        subject: 'Enterprise CRM 150-Seat Quotation & Bengali SLA Inquiry',
        inboundBody:
          'Hello, we are evaluating your platform for 150 relationship managers in Dhaka. Can you assign an enterprise specialist and share your SLA response guarantee?',
        autoReply: false,
        language,
      });
      if (res.snapshot) {
        onSnapshotChange(res.snapshot);
      }
      setBanner(
        res.triagedByAi
          ? 'Live Webhook received external email AND automatically drafted an AI specialist response in Inbox!'
          : 'Live Webhook logged external email into Inbox.'
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Webhook test failed.');
    } finally {
      setBusy(null);
    }
  }

  async function handleCreateStaffUser(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setBanner(null);
    setBusy('create-staff');
    try {
      const res = await crmApi.adminCreateStaffUser({
        name: staffName,
        email: staffEmail,
        password: staffPassword,
        role: staffRole,
        title: staffTitle,
      });
      setUsersList(res.users);
      onSnapshotChange(res.snapshot);
      setStaffName('');
      setStaffEmail('');
      setStaffPassword('');
      setBanner(
        language === 'bn'
          ? `নতুন স্টাফ অ্যাকাউন্ট (${staffRole}) সফলভাবে তৈরি হয়েছে!`
          : `Provisioned ${staffRole} login account successfully.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create staff account.');
    } finally {
      setBusy(null);
    }
  }

  async function handleResetUserPassword(targetId: string) {
    if (resetPasswordVal.length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }
    setErrorMsg(null);
    setBanner(null);
    setBusy(`pw-${targetId}`);
    try {
      const res = await crmApi.adminResetUserPassword(targetId, resetPasswordVal);
      setUsersList(res.users);
      onSnapshotChange(res.snapshot);
      setResetTargetId(null);
      setResetPasswordVal('');
      setBanner(
        language === 'bn'
          ? 'পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে।'
          : 'Account password updated and old sessions invalidated.'
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Password reset failed.');
    } finally {
      setBusy(null);
    }
  }

  async function handleDeleteStaffUser(targetId: string) {
    setErrorMsg(null);
    setBanner(null);
    setBusy(`del-${targetId}`);
    try {
      const res = await crmApi.adminDeleteUser(targetId);
      setUsersList(res.users);
      onSnapshotChange(res.snapshot);
      setBanner(
        language === 'bn'
          ? 'স্টাফের লগইন অ্যাক্সেস বাতিল করা হয়েছে।'
          : 'Revoked staff login account.'
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to revoke staff account.');
    } finally {
      setBusy(null);
    }
  }

  function handleCopyWebhook() {
    navigator.clipboard?.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  }

  const curlSnippet = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customerEmail": "client@company.com",
    "companyName": "Apex Retail Ltd.",
    "subject": "Support & Contract Renewal Request",
    "inboundBody": "Please connect us with our account manager.",
    "autoReply": true
  }'`;

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div role="alert" className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          {errorMsg}
        </div>
      )}

      {banner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{banner}</span>
        </div>
      )}

      {/* Visual UI Theme, Brand Color & Surface Customizer Studio */}
      {onThemeChange && onCanvasChange && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Palette className="w-4 h-4 text-brand" />
                <span>
                  {language === 'bn'
                    ? 'লাইভ UI কালার থিম, সারফেস টিন্ট ও ভাষা কাস্টমাইজেশন স্টুডিও'
                    : 'Live UI Brand Color, Surface Canvas & Language Studio'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'bn'
                  ? 'আপনার ব্র্যান্ডের রঙ, ব্যাকগ্রাউন্ড টিন্ট এবং ইন্টারফেসের ভাষা তাৎক্ষণিকভাবে কাস্টমাইজ করুন (পাবলিক ওয়েবসাইট ও ড্যাশবোর্ড উভয় জায়গায় প্রযোজ্য)'
                  : 'Customize brand accent palette, surface canvas tint, and interface language across both the public website and CRM dashboard'}
              </p>
            </div>
            {onLanguageChange && (
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => onLanguageChange('bn')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    language === 'bn' ? 'btn-brand' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  বাংলা + EN
                </button>
                <button
                  type="button"
                  onClick={() => onLanguageChange('en')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    language === 'en' ? 'btn-brand' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  English
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-2.5">
              <div className="text-xs font-semibold text-slate-700">
                {language === 'bn' ? '১. ব্র্যান্ড অ্যাকসেন্ট কালার প্যালেট (৫টি থিম)' : '1. Brand Accent Color Palette'}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {BRAND_THEMES.map((item) => {
                  const active = theme === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onThemeChange(item.id)}
                      className={`p-3 rounded-xl border text-left transition-all space-y-2 ${
                        active
                          ? 'surface-brand-soft border-brand shadow-xs'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`w-5 h-5 rounded-md inline-flex items-center justify-center text-white ${item.swatchClass}`}
                        >
                          {active && <Check className="w-3 h-3" />}
                        </span>
                        {active && (
                          <span className="text-[10px] font-semibold text-brand">Active</span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {language === 'bn' ? item.bnLabel : item.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-4 space-y-2.5">
              <div className="text-xs font-semibold text-slate-700">
                {language === 'bn' ? '২. ব্যাকগ্রাউন্ড সারফেস টিন্ট' : '2. Workspace Surface Tint'}
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {CANVAS_TINTS.map((c) => {
                  const active = canvasTint === c.id;
                  const swatchBg =
                    c.id === 'sky'
                      ? 'bg-sky-100'
                      : c.id === 'warm'
                        ? 'bg-amber-100'
                        : 'bg-slate-100';
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onCanvasChange(c.id)}
                      className={`p-3 rounded-xl border text-left transition-all space-y-2 ${
                        active
                          ? 'surface-brand-soft border-brand shadow-xs'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <span
                        className={`block w-5 h-5 rounded-md border border-slate-300 ${swatchBg}`}
                      />
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {language === 'bn' ? c.bnLabel : c.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 1. Organization Profile, Currency (BDT/USD) & Tax */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="pb-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-700" />
              <span>
                {language === 'bn'
                  ? 'কোম্পানির তথ্য, কারেন্সি (৳ / $) ও ট্যাক্স সেটিংস'
                  : 'Organization Profile, Currency (৳ BDT / $ USD) & Tax'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Updates brand header, currency formatting across all modules, payslips, and client invoices.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Company Name</label>
                <input
                  required
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Primary Currency
                </label>
                <select
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value as 'USD' | 'BDT')}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-medium"
                >
                  <option value="BDT">BDT (৳) — Bangladeshi Taka</option>
                  <option value="USD">USD ($) — US Dollar</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Company Domain</label>
                <input
                  type="text"
                  value={companyDomain}
                  onChange={(e) => setCompanyDomain(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Official Support / Billing Email
                </label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Registered Office Address (Printed on Invoices & Payslips)
              </label>
              <input
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Default VAT / Tax Rate (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={40}
                  step={0.5}
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  SLA Response Target (Hours)
                </label>
                <input
                  type="number"
                  min={1}
                  max={72}
                  value={slaHours}
                  onChange={(e) => setSlaHours(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={autoTriageWebhook}
                onChange={(e) => setAutoTriageWebhook(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>
                Automatically run AI Specialist Matching & Reply Draft on incoming webhook emails
              </span>
            </label>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={busy !== null || currentUser.role === 'Specialist'}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {busy === 'save-org' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>
                  {language === 'bn' ? 'সেটিংস সেভ করুন' : 'Save Organization Settings'}
                </span>
              </button>
            </div>
          </form>
        </section>

        {/* 2. CSV Bulk Data Importer & Clean-Slate Data Management */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="pb-4 border-b border-slate-200 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>
                  {language === 'bn'
                    ? 'CSV বাল্ক ইমপোর্ট, ব্যাকআপ ও ক্লিন ওয়ার্কস্পেস'
                    : 'CSV Bulk Data Import, Backup & Clean Reset'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Onboard real client spreadsheets or employee rosters in seconds.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportFullBackupJson}
              className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Database className="w-3.5 h-3.5 text-blue-700" />
              <span>Export Full JSON Backup</span>
            </button>
          </div>

          {/* CSV Target Selector + Template Download */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setImportTarget('customers');
                    setCsvText(CUSTOMER_CSV_TEMPLATE);
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md ${
                    importTarget === 'customers' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Import Customers CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportTarget('employees');
                    setCsvText(EMPLOYEE_CSV_TEMPLATE);
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md ${
                    importTarget === 'employees' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Import Employees CSV
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate(importTarget)}
                  className="px-2.5 py-1 text-xs font-medium text-blue-700 hover:underline inline-flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Sample CSV</span>
                </button>
                <label className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer inline-flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose .CSV File</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleRunCsvImport}
                disabled={busy !== null}
                className="px-4 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {busy === 'csv-import' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>
                  {language === 'bn'
                    ? `CSV ডাটা ইমপোর্ট করুন (${importTarget})`
                    : `Import ${importTarget === 'customers' ? 'Customer' : 'Employee'} CSV Rows`}
                </span>
              </button>
            </div>
          </div>

          {/* Clean Slate / Demo Restore Controls */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="text-xs font-semibold text-slate-900">
              {language === 'bn'
                ? 'প্রোডাকশন ডাটা রিসেট কন্ট্রোল (Admin Only)'
                : 'Production Workspace Reset Controls (Admin Only)'}
            </div>

            {!confirmCleanSlate ? (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={busy !== null || currentUser.role !== 'Admin'}
                  onClick={() => setConfirmCleanSlate(true)}
                  className="px-3.5 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    {language === 'bn'
                      ? 'ডেমো ডাটা মুছে নতুনভাবে শুরু করুন'
                      : 'Clear Demo Data & Start Fresh'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={busy !== null || currentUser.role !== 'Admin'}
                  onClick={() => handleWorkspaceReset('restore_demo')}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {busy === 'restore_demo' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" />
                  )}
                  <span>Restore Demo Dataset</span>
                </button>
              </div>
            ) : (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg space-y-2.5 text-xs">
                <p className="text-red-900 font-medium">
                  Confirm wiping all current sample customers, deals, emails, and payroll records to initialize a clean production workspace?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => handleWorkspaceReset('clean_slate')}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg inline-flex items-center gap-1.5"
                  >
                    {busy === 'clean_slate' && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>Yes, Wipe & Start Clean</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmCleanSlate(false)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 3. Live Inbound Email Webhook & Outbound SMTP Relay Status */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Webhook className="w-4 h-4 text-blue-700" />
              <span>
                {language === 'bn'
                  ? 'লাইভ ইনবাউন্ড ইমেইল ওয়েবহুক ও SMTP কানেক্টিভিটি'
                  : 'Live Inbound Email Webhook & Outbound SMTP Delivery'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Connect your company website contact form, Zapier, Make, SendGrid Inbound Parse, or Mailgun directly to this URL.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-600">
              Outbound SMTP:{' '}
              <strong className={org.smtpConfigured ? 'text-emerald-700' : 'text-slate-800'}>
                {org.smtpConfigured
                  ? 'Live SMTP Relay Active'
                  : 'Outbox + Mail Client Ready (Configure SMTP_HOST in Secrets for automatic relay)'}
              </strong>
            </span>
            <button
              type="button"
              onClick={handleTestLiveWebhook}
              disabled={busy !== null}
              className="px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              {busy === 'test-webhook' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Send Live Webhook Test</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-5 space-y-2">
            <label className="block text-xs font-medium text-slate-700">
              Public Webhook Endpoint (POST JSON)
            </label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={webhookUrl}
                className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              />
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedWebhook ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Set <code>"autoReply": true</code> in the webhook payload to trigger instant AI employee selection and outbound reply dispatch automatically.
            </p>
          </div>

          <div className="lg:col-span-7">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Example Website / Zapier / cURL Integration Payload
            </label>
            <pre className="p-3.5 bg-slate-900 text-slate-100 text-[11px] font-mono rounded-lg overflow-x-auto leading-relaxed">
              {curlSnippet}
            </pre>
          </div>
        </div>
      </section>

      {/* 4. Admin-Only Staff Access Provisioning & Database Admin Policy */}
      {isAdmin && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                <span>
                  {language === 'bn'
                    ? 'টিম লগইন ও স্টাফ অ্যাকাউন্ট ম্যানেজমেন্ট (শুধুমাত্র অ্যাডমিন)'
                    : 'Team Access & Staff Account Provisioning (Admin Only)'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'bn'
                  ? 'অ্যাডমিন এখান থেকে HR Manager ও Specialist অ্যাকাউন্ট তৈরি বা বাতিল করতে পারবেন। নতুন Admin শুধুমাত্র ডাটাবেস সিএলআই (manage_admin.py) থেকে তৈরি করা যাবে।'
                  : 'Create or revoke HR Manager and Specialist logins. Administrator accounts are strictly database-locked and can only be created via SQLite CLI.'}
              </p>
            </div>
            <div className="text-xs font-mono bg-slate-900 text-slate-100 px-3 py-2 rounded-lg">
              python3 backend_python/manage_admin.py create-admin --email ... --password ... --name ...
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Create HRManager / Specialist Form */}
            <form onSubmit={handleCreateStaffUser} className="lg:col-span-5 space-y-3.5 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-blue-700" />
                <span>
                  {language === 'bn' ? 'নতুন স্টাফ লগইন তৈরি করুন' : 'Issue New Staff Login'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  required
                  type="text"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="e.g. Sabrina Chowdhury"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Work Email</label>
                  <input
                    required
                    type="email"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    placeholder="sabrina@company.com"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Initial Password</label>
                  <input
                    required
                    minLength={6}
                    type="password"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Access Role (Web Allowed)
                  </label>
                  <select
                    value={staffRole}
                    onChange={(e) => {
                      const nextRole = e.target.value as 'HRManager' | 'Specialist';
                      setStaffRole(nextRole);
                      setStaffTitle(
                        nextRole === 'HRManager' ? 'HR & Payroll Manager' : 'CRM Account Specialist'
                      );
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="Specialist">Specialist (CRM, Deals & Inbox)</option>
                    <option value="HRManager">HRManager (Hiring, Payroll & Leave)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Designation</label>
                  <input
                    required
                    type="text"
                    value={staffTitle}
                    onChange={(e) => setStaffTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy !== null}
                className="w-full py-2 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {busy === 'create-staff' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserPlus className="w-3.5 h-3.5" />
                )}
                <span>{language === 'bn' ? 'স্টাফ অ্যাকাউন্ট তৈরি করুন' : 'Create Staff Account'}</span>
              </button>
            </form>

            {/* Provisioned Accounts Table */}
            <div className="lg:col-span-7 border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                    <th className="py-2.5 px-4">User</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-4 text-right">Security Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {usersList.map((u) => {
                    const isSelf = u.id === currentUser.id;
                    const isOtherAdmin = u.role === 'Admin' && !isSelf;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{u.name}</div>
                          <div className="font-mono text-[11px] text-slate-500">{u.email}</div>
                          <div className="text-[11px] text-slate-500">{u.title}</div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={
                              u.role === 'Admin'
                                ? 'font-semibold text-blue-700'
                                : u.role === 'HRManager'
                                  ? 'font-semibold text-emerald-700'
                                  : 'font-medium text-slate-700'
                            }
                          >
                            {u.role}
                          </span>
                          {u.role === 'Admin' && (
                            <div className="text-[10px] text-slate-400">DB-Locked</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {resetTargetId === u.id ? (
                            <div className="inline-flex items-center gap-1.5">
                              <input
                                type="password"
                                minLength={6}
                                value={resetPasswordVal}
                                onChange={(e) => setResetPasswordVal(e.target.value)}
                                placeholder="New password"
                                className="w-28 px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                              />
                              <button
                                type="button"
                                disabled={busy !== null}
                                onClick={() => handleResetUserPassword(u.id)}
                                className="px-2.5 py-1 text-xs font-medium text-white bg-blue-700 rounded hover:bg-blue-800"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setResetTargetId(null);
                                  setResetPasswordVal('');
                                }}
                                className="px-2 py-1 text-xs text-slate-600 border border-slate-200 rounded"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : isOtherAdmin ? (
                            <span className="text-[11px] text-slate-400">Managed via SQLite CLI</span>
                          ) : (
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setResetTargetId(u.id);
                                  setResetPasswordVal('');
                                }}
                                className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1"
                              >
                                <KeyRound className="w-3 h-3" />
                                <span>{isSelf ? 'Change My Password' : 'Reset Password'}</span>
                              </button>
                              {u.role !== 'Admin' && (
                                <button
                                  type="button"
                                  disabled={busy !== null}
                                  onClick={() => handleDeleteStaffUser(u.id)}
                                  title="Revoke staff login"
                                  className="p-1.5 text-slate-400 hover:text-red-700 bg-white border border-slate-200 hover:border-red-200 rounded-lg"
                                >
                                  {busy === `del-${u.id}` ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
