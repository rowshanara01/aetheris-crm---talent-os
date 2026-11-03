import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import type { DashboardSnapshot, DealStage, LanguageCode } from '../shared/types';
import { crmApi } from '../services/crmApi';
import { formatMoney } from '../utils/formatters';
import { AvatarView } from './AvatarView';
import type { VoucherPayload } from './DocumentVoucherModal';

interface RevenuePipelineViewProps {
  snapshot: DashboardSnapshot;
  language: LanguageCode;
  initialDealId?: string;
  onSnapshotChange: (next: DashboardSnapshot) => void;
  onOpenNewDealModal: () => void;
  onOpenVoucher: (v: VoucherPayload) => void;
}

const PIPELINE_STAGES: DealStage[] = [
  'Discovery',
  'Technical Validation',
  'Executive Proposal',
  'Contract Negotiation',
  'Closed Won',
];

export function RevenuePipelineView({
  snapshot,
  language,
  initialDealId,
  onSnapshotChange,
  onOpenNewDealModal,
  onOpenVoucher,
}: RevenuePipelineViewProps) {
  const [selectedDealId, setSelectedDealId] = useState<string>(
    initialDealId || snapshot.deals[0]?.id || ''
  );
  const [updatingStage, setUpdatingStage] = useState(false);
  const [loadingCoaching, setLoadingCoaching] = useState(false);
  const [deletingDeal, setDeletingDeal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const org = snapshot.orgSettings;

  useEffect(() => {
    if (initialDealId) {
      setSelectedDealId(initialDealId);
    }
  }, [initialDealId]);

  const activeDeal = snapshot.deals.find((d) => d.id === selectedDealId) ?? snapshot.deals[0] ?? null;

  const openDeals = snapshot.deals.filter((d) => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost');
  const openPipelineUsd = openDeals.reduce((sum, d) => sum + d.valueUsd, 0);
  const weightedForecastUsd = Math.round(
    openDeals.reduce((sum, d) => sum + d.valueUsd * (d.winProbability / 100), 0)
  );
  const closedWonUsd = snapshot.deals
    .filter((d) => d.stage === 'Closed Won')
    .reduce((sum, d) => sum + d.valueUsd, 0);

  const dealOwner = activeDeal
    ? snapshot.employees.find((e) => e.id === activeDeal.ownerEmployeeId)
    : undefined;

  async function handleStageChange(dealId: string, nextStage: DealStage) {
    setErrorMsg(null);
    setBannerMsg(null);
    setUpdatingStage(true);
    try {
      const { deal, snapshot: nextSnap } = await crmApi.updateDealStage(dealId, nextStage);
      onSnapshotChange(nextSnap);
      setSelectedDealId(deal.id);
      if (nextStage === 'Closed Won') {
        setBannerMsg(
          language === 'bn'
            ? `"${deal.title}" সফলভাবে Closed Won হয়েছে! কাস্টমার ARR আপডেট হয়েছে এবং স্পেশালিস্টের পে-রোলে সেলস কমিশন বোনাস যোগ হয়েছে।`
            : `"${deal.title}" marked Closed Won — Customer ARR expanded and specialist payroll commission credited automatically.`
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update deal stage.');
    } finally {
      setUpdatingStage(false);
    }
  }

  async function handleGenerateCoaching() {
    if (!activeDeal) return;
    setErrorMsg(null);
    setLoadingCoaching(true);
    try {
      const { snapshot: nextSnap } = await crmApi.generateDealCoaching(activeDeal.id, language);
      onSnapshotChange(nextSnap);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate AI deal strategy.');
    } finally {
      setLoadingCoaching(false);
    }
  }

  async function handleDeleteDeal() {
    if (!activeDeal) return;
    setErrorMsg(null);
    setDeletingDeal(true);
    try {
      const { snapshot: nextSnap } = await crmApi.deleteRecord('deal', activeDeal.id);
      onSnapshotChange(nextSnap);
      setSelectedDealId(nextSnap.deals[0]?.id || '');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete deal.');
    } finally {
      setDeletingDeal(false);
    }
  }

  const estimatedCommission = activeDeal
    ? Math.max(
        150,
        Math.round(
          activeDeal.valueUsd * (activeDeal.dealType === 'New Enterprise Logo' ? 0.015 : 0.008)
        )
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* Top 4-Column Commercial Forecast Strip */}
      <section className="bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-5 flex flex-col justify-between gap-1.5">
          <span className="text-xs font-medium text-slate-500">
            {language === 'bn' ? 'সক্রিয় সেলস ও রিনিউয়াল পাইপলাইন' : 'Open Commercial Pipeline'}
          </span>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {formatMoney(openPipelineUsd, org)}
          </div>
          <span className="text-xs text-slate-500">{openDeals.length} active deals</span>
        </div>

        <div className="p-5 flex flex-col justify-between gap-1.5">
          <span className="text-xs font-medium text-slate-500">
            {language === 'bn' ? 'সম্ভাবনা-ভিত্তিক রেভিনিউ পূর্বাভাস' : 'Weighted Revenue Forecast'}
          </span>
          <div className="text-2xl font-bold text-blue-700 font-mono tabular-nums">
            {formatMoney(weightedForecastUsd, org)}
          </div>
          <span className="text-xs text-slate-500">Probability-adjusted expected bookings</span>
        </div>

        <div className="p-5 flex flex-col justify-between gap-1.5">
          <span className="text-xs font-medium text-slate-500">
            {language === 'bn' ? 'চূড়ান্ত অর্জিত ডিল (Closed Won)' : 'Closed-Won Bookings'}
          </span>
          <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums">
            {formatMoney(closedWonUsd, org)}
          </div>
          <span className="text-xs text-slate-500">Synced directly to ARR & Payroll Bonus</span>
        </div>

        <div className="p-5 flex flex-col justify-between gap-1.5">
          <span className="text-xs font-medium text-slate-500">
            {language === 'bn' ? 'নতুন ডিল ও এক্সপ্যানশন সুযোগ' : 'Pipeline Action'}
          </span>
          <button
            onClick={onOpenNewDealModal}
            className="mt-1 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors w-fit whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'নতুন ডিল যোগ করুন' : 'Create New Deal'}</span>
          </button>
          <span className="text-xs text-slate-500">Auto-links to specialist commission</span>
        </div>
      </section>

      {errorMsg && (
        <div role="alert" className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          {errorMsg}
        </div>
      )}

      {bannerMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{bannerMsg}</span>
        </div>
      )}

      {/* Horizontal 5-Stage Kanban Board */}
      <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 items-start">
        {PIPELINE_STAGES.map((stage) => {
          const stageDeals = snapshot.deals.filter((d) => d.stage === stage);
          const stageSum = stageDeals.reduce((s, d) => s + d.valueUsd, 0);
          return (
            <div key={stage} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-3.5 py-3 border-b border-slate-200 bg-slate-50/70">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                  <span className="truncate">{stage}</span>
                  <span className="font-mono tabular-nums text-slate-500">{stageDeals.length}</span>
                </div>
                <div className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                  {formatMoney(stageSum, org)}
                </div>
              </div>

              <div className="divide-y divide-slate-200">
                {stageDeals.length === 0 ? (
                  <div className="p-4 text-xs text-slate-400 text-center">No deals in stage</div>
                ) : (
                  stageDeals.map((dl) => {
                    const isSelected = activeDeal?.id === dl.id;
                    return (
                      <button
                        key={dl.id}
                        onClick={() => setSelectedDealId(dl.id)}
                        className={`w-full text-left p-3.5 transition-colors block ${
                          isSelected ? 'bg-slate-100/90' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xs font-semibold text-slate-900 line-clamp-2">{dl.title}</div>
                        <div className="mt-1.5 flex items-center justify-between text-xs font-mono tabular-nums">
                          <span className="font-bold text-slate-800">{formatMoney(dl.valueUsd, org)}</span>
                          <span
                            className={
                              dl.winProbability >= 75
                                ? 'text-emerald-700 font-medium'
                                : dl.winProbability >= 50
                                  ? 'text-blue-700 font-medium'
                                  : 'text-slate-500'
                            }
                          >
                            {dl.winProbability}% prob
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500 truncate">
                          {dl.dealType} · Close {dl.expectedCloseDate}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Selected Deal War-Room & AI Win-Strategy Coach */}
      {activeDeal && (
        <section className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
          <div className="p-6 flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                <span className="font-medium text-slate-800">{activeDeal.companyName}</span>
                <span aria-hidden="true">·</span>
                <span>{activeDeal.dealType}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">Target Close: {activeDeal.expectedCloseDate}</span>
              </div>
              <h2 className="text-lg font-semibold text-slate-900">{activeDeal.title}</h2>
              <p className="text-xs text-slate-600 leading-relaxed">{activeDeal.notes}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  onOpenVoucher({
                    kind: 'invoice',
                    deal: activeDeal,
                    customer: activeDeal.customerId
                      ? snapshot.customers.find((c) => c.id === activeDeal.customerId)
                      : undefined,
                  })
                }
                className="px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <FileText className="w-3.5 h-3.5 text-blue-700" />
                <span>{language === 'bn' ? 'কোটেশন / ইনভয়েস' : 'Quote / Invoice'}</span>
              </button>

              <select
                aria-label="Move Deal Stage"
                disabled={updatingStage}
                value={activeDeal.stage}
                onChange={(e) => handleStageChange(activeDeal.id, e.target.value as DealStage)}
                className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-800"
              >
                {PIPELINE_STAGES.map((st) => (
                  <option key={st} value={st}>
                    Stage: {st}
                  </option>
                ))}
                <option value="Closed Lost">Stage: Closed Lost</option>
              </select>

              {activeDeal.stage !== 'Closed Won' && (
                <button
                  onClick={() => handleStageChange(activeDeal.id, 'Closed Won')}
                  disabled={updatingStage}
                  className="px-3.5 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  {updatingStage ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Award className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {language === 'bn'
                      ? `Closed Won (+${formatMoney(estimatedCommission, org)})`
                      : `Close Won (+${formatMoney(estimatedCommission, org)} Bonus)`}
                  </span>
                </button>
              )}

              <button
                onClick={handleGenerateCoaching}
                disabled={loadingCoaching}
                className="px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                {loadingCoaching ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{language === 'bn' ? 'AI ডিল উইন-স্ট্র্যাটেজি' : 'AI Deal Win-Strategy'}</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteDeal}
                disabled={deletingDeal}
                title="Delete deal"
                className="p-2 text-slate-400 hover:text-red-600 border border-slate-200 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Commercial Metrics & Owner Card */}
            <div className="lg:col-span-4 space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Contract Value</span>
                  <span className="text-base font-bold font-mono tabular-nums text-slate-900">
                    {formatMoney(activeDeal.valueUsd, org)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Win Probability</span>
                  <span className="font-mono tabular-nums font-semibold text-blue-700">
                    {activeDeal.winProbability}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Weighted Value</span>
                  <span className="font-mono tabular-nums font-medium text-slate-800">
                    {formatMoney(Math.round((activeDeal.valueUsd * activeDeal.winProbability) / 100), org)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Specialist Payroll Commission</span>
                  <span className="font-mono tabular-nums font-bold text-emerald-700">
                    +{formatMoney(estimatedCommission, org)}
                  </span>
                </div>
              </div>

              {dealOwner && (
                <div className="p-4 border border-slate-200 rounded-lg flex items-center gap-3">
                  <AvatarView name={dealOwner.name} avatarKey={dealOwner.avatarKey} size="md" />
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500">Deal Owner</div>
                    <div className="text-sm font-semibold text-slate-900 truncate">{dealOwner.name}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {dealOwner.role} · CSAT {dealOwner.csatScore}%
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* AI Deal Strategy Output */}
            <div className="lg:col-span-8 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-700" />
                <span>
                  {language === 'bn'
                    ? 'AI নেগোসিয়েশন ও ক্লোজিং গাইডলাইন'
                    : 'Executive Deal Acceleration & Pricing Playbook'}
                </span>
              </h3>

              {!activeDeal.aiCoaching ? (
                <div className="p-8 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 text-center">
                  {language === 'bn'
                    ? 'এই ডিলটি দ্রুত জিততে মূল্য নির্ধারণ, ঝুঁকি নিরসন এবং পরবর্তী পদক্ষেপ পেতে "AI ডিল উইন-স্ট্র্যাটেজি" বাটনে ক্লিক করুন।'
                    : 'Click "AI Deal Win-Strategy" to generate CFO/CTO value hooks, objection mitigation, and pricing guardrails.'}
                </div>
              ) : (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg text-xs leading-relaxed">
                  <div className="p-4">
                    <div className="font-semibold text-slate-900">01. Executive Value Hook (CFO / CTO)</div>
                    <p className="text-slate-700 mt-1">{activeDeal.aiCoaching.executiveValueHook}</p>
                  </div>
                  <div className="p-4">
                    <div className="font-semibold text-red-800 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-700" />
                      <span>02. Primary Deal Risk / Blocker</span>
                    </div>
                    <p className="text-slate-700 mt-1">{activeDeal.aiCoaching.keyRiskBlocker}</p>
                  </div>
                  <div className="p-4">
                    <div className="font-semibold text-slate-900">03. Commercial & Pricing Guardrail</div>
                    <p className="text-slate-700 mt-1">{activeDeal.aiCoaching.pricingGuardrail}</p>
                  </div>
                  <div className="p-4 bg-slate-50/80">
                    <div className="font-semibold text-blue-800 flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5 text-blue-700" />
                      <span>04. Next 48-Hour Closing Action</span>
                    </div>
                    <p className="text-slate-800 mt-1">{activeDeal.aiCoaching.nextBestAction}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
