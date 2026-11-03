import { useEffect, useState } from 'react';
import { Award, CheckCircle2, Loader2, MessageSquarePlus, Send, Sparkles, Trash2, UserPlus } from 'lucide-react';
import type { CandidateStage, DashboardSnapshot, LanguageCode } from '../shared/types';
import { crmApi } from '../services/crmApi';
import { AvatarView } from './AvatarView';

interface TalentInterviewViewProps {
  snapshot: DashboardSnapshot;
  language: LanguageCode;
  initialCandidateId?: string;
  onSnapshotChange: (next: DashboardSnapshot) => void;
  onOpenNewCandidateModal: () => void;
}

export function TalentInterviewView({
  snapshot,
  language,
  initialCandidateId,
  onSnapshotChange,
  onOpenNewCandidateModal,
}: TalentInterviewViewProps) {
  const [stageFilter, setStageFilter] = useState<'ALL' | CandidateStage>('ALL');
  const [selectedId, setSelectedId] = useState<string>(initialCandidateId || snapshot.candidates[0]?.id || '');
  const [candidateResponse, setCandidateResponse] = useState('');
  const [offerSalaryUsd, setOfferSalaryUsd] = useState<number>(5400);
  const [busyMode, setBusyMode] = useState<'question' | 'answer' | 'evaluate' | 'hire' | 'delete' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const sym = snapshot.orgSettings?.currencySymbol || '$';

  useEffect(() => {
    if (initialCandidateId) {
      setSelectedId(initialCandidateId);
    }
  }, [initialCandidateId]);

  const filteredCandidates = snapshot.candidates.filter(
    (c) => stageFilter === 'ALL' || c.stage === stageFilter
  );

  const activeCandidate =
    snapshot.candidates.find((c) => c.id === selectedId) ??
    filteredCandidates[0] ??
    snapshot.candidates[0] ??
    null;

  async function handleAskNextQuestion() {
    if (!activeCandidate) return;
    setErrorMsg(null);
    setBusyMode('question');
    try {
      const { snapshot: nextSnap } = await crmApi.askCandidateQuestion(activeCandidate.id, language);
      onSnapshotChange(nextSnap);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate AI interview question.');
    } finally {
      setBusyMode(null);
    }
  }

  async function handleSubmitAnswer() {
    if (!activeCandidate || !candidateResponse.trim()) return;
    setErrorMsg(null);
    setBusyMode('answer');
    try {
      const { snapshot: nextSnap } = await crmApi.submitCandidateAnswer(
        activeCandidate.id,
        candidateResponse
      );
      onSnapshotChange(nextSnap);
      setCandidateResponse('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit candidate response.');
    } finally {
      setBusyMode(null);
    }
  }

  async function handleEvaluateCandidate() {
    if (!activeCandidate) return;
    setErrorMsg(null);
    setBusyMode('evaluate');
    try {
      const { snapshot: nextSnap } = await crmApi.evaluateCandidate(activeCandidate.id, language);
      onSnapshotChange(nextSnap);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to evaluate candidate.');
    } finally {
      setBusyMode(null);
    }
  }

  async function handleHireCandidate() {
    if (!activeCandidate) return;
    setErrorMsg(null);
    setBusyMode('hire');
    try {
      const { snapshot: nextSnap } = await crmApi.hireCandidate(
        activeCandidate.id,
        offerSalaryUsd,
        'Probation'
      );
      onSnapshotChange(nextSnap);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to promote candidate to employee roster.');
    } finally {
      setBusyMode(null);
    }
  }

  async function handleDeleteCandidate() {
    if (!activeCandidate) return;
    setErrorMsg(null);
    setBusyMode('delete');
    try {
      const { snapshot: nextSnap } = await crmApi.deleteRecord('candidate', activeCandidate.id);
      onSnapshotChange(nextSnap);
      setSelectedId(nextSnap.candidates[0]?.id || '');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to remove candidate.');
    } finally {
      setBusyMode(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
          {(['ALL', 'Screening', 'Interviewing', 'Selected', 'Hired'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStageFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                stageFilter === st ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === 'ALL' ? 'All Candidates' : st}
            </button>
          ))}
        </div>

        <button
          onClick={onOpenNewCandidateModal}
          className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'নতুন প্রার্থী যুক্ত করুন' : 'Add Candidate to Pipeline'}</span>
        </button>
      </div>

      {errorMsg && (
        <div role="alert" className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Candidate List */}
        <section className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-800">Talent Selection Pipeline</span>
            <span className="font-mono tabular-nums">{filteredCandidates.length} candidates</span>
          </div>

          <div className="divide-y divide-slate-200">
            {filteredCandidates.map((cand) => {
              const isSelected = activeCandidate?.id === cand.id;
              return (
                <button
                  key={cand.id}
                  onClick={() => setSelectedId(cand.id)}
                  className={`w-full text-left p-4 transition-colors block ${
                    isSelected ? 'bg-slate-100/90' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AvatarView name={cand.name} avatarKey={cand.avatarKey} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900 truncate">{cand.name}</span>
                        <span className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
                          {cand.experienceYears}y exp
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 truncate mt-0.5">{cand.role}</div>
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                        <span
                          className={
                            cand.stage === 'Hired' || cand.stage === 'Selected'
                              ? 'font-medium text-emerald-700'
                              : 'font-medium text-blue-700'
                          }
                        >
                          {cand.stage}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{cand.interviewTranscript.length} turns</span>
                        {cand.evaluation && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums text-slate-800 font-medium">
                              Score {cand.evaluation.overallScore}/100
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Live AI Interview & Selection Studio */}
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
          {!activeCandidate ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Select a candidate to conduct an AI interview and run hiring rubric evaluation.
            </div>
          ) : (
            <>
              {/* Candidate Summary Header */}
              <div className="p-6 flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <AvatarView name={activeCandidate.name} avatarKey={activeCandidate.avatarKey} size="lg" />
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{activeCandidate.name}</h2>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <span className="text-slate-700 font-medium">{activeCandidate.role}</span>
                      <span aria-hidden="true">·</span>
                      <span>{activeCandidate.department}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{activeCandidate.experienceYears} Years</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 max-w-2xl leading-relaxed">
                      {activeCandidate.resumeSummary}
                    </p>
                    <div className="text-xs text-slate-500 mt-2">
                      <span className="font-medium text-slate-700">Core Competencies: </span>
                      {activeCandidate.skills.join(' · ')}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {activeCandidate.stage === 'Hired' ? (
                    <span className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Active CRM Team Member</span>
                    </span>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5">
                        <label htmlFor="offer-salary-input" className="text-xs text-slate-500 whitespace-nowrap">
                          {language === 'bn' ? `বেতন (${sym}/মাস):` : `Offer (${sym}/mo):`}
                        </label>
                        <input
                          id="offer-salary-input"
                          type="number"
                          min={1000}
                          step={100}
                          value={offerSalaryUsd}
                          onChange={(e) => setOfferSalaryUsd(Number(e.target.value))}
                          className="w-24 px-2.5 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900"
                        />
                      </div>
                      <button
                        onClick={handleHireCandidate}
                        disabled={busyMode !== null}
                        className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        {busyMode === 'hire' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Award className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {language === 'bn' ? 'নিয়োগ ও পে-রোলে যুক্ত করুন' : 'Hire & Enroll in Payroll'}
                        </span>
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleDeleteCandidate}
                    disabled={busyMode !== null}
                    title="Delete candidate record"
                    className="p-2 text-slate-400 hover:text-red-700 bg-white border border-slate-200 hover:border-red-200 rounded-lg transition-colors"
                  >
                    {busyMode === 'delete' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Interactive Interview Session */}
              <div className="p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {language === 'bn'
                        ? 'AI স্ট্রাকচার্ড ইন্টারভিউ সেশন'
                        : 'Structured AI Competency Interview'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ask adaptive role questions, record candidate answers, then run 4-axis hiring evaluation
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAskNextQuestion}
                      disabled={busyMode !== null}
                      className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      {busyMode === 'question' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <MessageSquarePlus className="w-3.5 h-3.5 text-blue-700" />
                      )}
                      <span>{language === 'bn' ? 'পরবর্তী AI প্রশ্ন করুন' : 'Ask Next AI Question'}</span>
                    </button>

                    <button
                      onClick={handleEvaluateCandidate}
                      disabled={busyMode !== null}
                      className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      {busyMode === 'evaluate' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>{language === 'bn' ? 'AI সিলেকশন মূল্যায়ন' : 'Run AI Selection Verdict'}</span>
                    </button>
                  </div>
                </div>

                {/* Transcript */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg divide-y divide-slate-200 max-h-80 overflow-y-auto">
                  {activeCandidate.interviewTranscript.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No interview questions asked yet. Click "Ask Next AI Question" to begin the live evaluation.
                    </div>
                  ) : (
                    activeCandidate.interviewTranscript.map((turn) => (
                      <div key={turn.id} className="p-4 space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span
                            className={
                              turn.speaker === 'interviewer'
                                ? 'font-semibold text-blue-800'
                                : 'font-semibold text-slate-900'
                            }
                          >
                            {turn.speaker === 'interviewer'
                              ? 'AI Bar-Raiser Interviewer'
                              : `${activeCandidate.name} (Candidate)`}
                            {turn.competencyFocus ? ` · ${turn.competencyFocus}` : ''}
                          </span>
                          <span className="font-mono tabular-nums">
                            {new Date(turn.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-800 leading-relaxed">{turn.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Candidate Response Input */}
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={candidateResponse}
                    onChange={(e) => setCandidateResponse(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitAnswer();
                      }
                    }}
                    placeholder={
                      language === 'bn'
                        ? 'প্রার্থীর উত্তর এখানে লিখুন বা পেস্ট করুন...'
                        : 'Enter candidate response during live interview...'
                    }
                    className="flex-1 px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={busyMode !== null || !candidateResponse.trim()}
                    className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    {busyMode === 'answer' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{language === 'bn' ? 'উত্তর রেকর্ড করুন' : 'Log Response'}</span>
                  </button>
                </div>
              </div>

              {/* AI Hiring Committee Scorecard */}
              {activeCandidate.evaluation && (
                <div className="p-6 bg-slate-50/70 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-medium text-slate-500">AI Selection Committee Verdict</span>
                      <div className="text-lg font-bold text-slate-900 mt-0.5">
                        {activeCandidate.evaluation.verdict} ·{' '}
                        <span className="font-mono tabular-nums text-blue-700">
                          {activeCandidate.evaluation.overallScore}/100
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-slate-500">
                      Evaluated {new Date(activeCandidate.evaluation.evaluatedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* 4 Competency Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-200">
                    <div>
                      <div className="text-xs text-slate-500">Technical Mastery</div>
                      <div className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                        {activeCandidate.evaluation.technicalMastery}/100
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Executive Clarity</div>
                      <div className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                        {activeCandidate.evaluation.communicationClarity}/100
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Customer Empathy</div>
                      <div className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                        {activeCandidate.evaluation.customerEmpathy}/100
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Long-Term Retention Fit</div>
                      <div className="text-base font-bold font-mono tabular-nums text-emerald-700 mt-0.5">
                        {activeCandidate.evaluation.longTermRetentionFit}/100
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-700 leading-relaxed pt-2 border-t border-slate-200">
                    <p>
                      <span className="font-semibold text-slate-900">Decision Rationale: </span>
                      {activeCandidate.evaluation.rationale}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Key Strengths: </span>
                      {activeCandidate.evaluation.strengths.join(' · ')}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">90-Day Retention Onboarding Plan: </span>
                      {activeCandidate.evaluation.onboardingFocus}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
