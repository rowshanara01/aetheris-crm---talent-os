export type LanguageCode = 'en' | 'bn';

export type UserRole = 'Admin' | 'HRManager' | 'Specialist';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  avatarKey?: string;
}

export interface WorkspaceUserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  createdAt: string;
}

export interface OrganizationSettings {
  companyName: string;
  companyDomain: string;
  supportEmail: string;
  companyAddress: string;
  currencyCode: 'USD' | 'BDT';
  currencySymbol: '$' | '৳';
  defaultTaxRatePct: number;
  slaTargetHours: number;
  autoTriageWebhook: boolean;
  smtpConfigured: boolean;
}

export type ChurnRiskLevel = 'Low' | 'Moderate' | 'High';
export type EmailUrgency = 'Low' | 'Medium' | 'High' | 'Critical';
export type EmailStatus = 'Needs Reply' | 'Draft Ready' | 'Auto-Replied';
export type CandidateStage = 'Screening' | 'Interviewing' | 'Selected' | 'Hired' | 'Declined';
export type EmploymentStatus = 'Active' | 'Probation' | 'Offboarded';

export type DealStage =
  | 'Discovery'
  | 'Technical Validation'
  | 'Executive Proposal'
  | 'Contract Negotiation'
  | 'Closed Won'
  | 'Closed Lost';

export interface RetentionHorizonStep {
  horizon: string;
  actionTitle: string;
  executionDetail: string;
  expectedImpact: string;
}

export interface CustomerRetentionPlan {
  generatedAt: string;
  riskSummary: string;
  loyaltyIncentive: string;
  outreachSubject: string;
  outreachBody: string;
  steps: RetentionHorizonStep[];
}

export interface CustomerAccount {
  id: string;
  companyName: string;
  industry: string;
  contactName: string;
  contactEmail: string;
  arrUsd: number;
  healthScore: number;
  npsScore: number;
  activeSeatsRatio: number;
  churnRisk: ChurnRiskLevel;
  renewalDate: string;
  assignedEmployeeId: string;
  lastContactAt: string;
  tenureMonths: number;
  avatarKey?: string;
  notes: string;
  retentionPlan?: CustomerRetentionPlan;
}

export interface AIDealCoaching {
  generatedAt: string;
  calibratedWinProbability: number;
  executiveValueHook: string;
  keyRiskBlocker: string;
  pricingGuardrail: string;
  nextBestAction: string;
}

export interface DealOpportunity {
  id: string;
  title: string;
  companyName: string;
  customerId?: string;
  dealType: 'New Enterprise Logo' | 'Multi-Year Renewal' | 'Seat Expansion';
  stage: DealStage;
  valueUsd: number;
  winProbability: number;
  expectedCloseDate: string;
  ownerEmployeeId: string;
  notes: string;
  updatedAt: string;
  aiCoaching?: AIDealCoaching;
}

export interface EmailThread {
  id: string;
  customerId: string;
  customerName: string;
  companyName: string;
  customerEmail: string;
  subject: string;
  inboundBody: string;
  receivedAt: string;
  category: string;
  sentiment: 'Positive' | 'Neutral' | 'Frustrated' | 'Urgent Escalation';
  urgency: EmailUrgency;
  status: EmailStatus;
  assignedEmployeeId?: string;
  aiRoutingReason?: string;
  aiDraftReply?: string;
  aiDraftLanguage?: LanguageCode;
  sentReply?: string;
  repliedAt?: string;
  smtpDeliveryStatus?: string;
}

export interface InterviewTurn {
  id: string;
  speaker: 'interviewer' | 'candidate';
  content: string;
  timestamp: string;
  competencyFocus?: string;
}

export interface CandidateEvaluation {
  evaluatedAt: string;
  technicalMastery: number;
  communicationClarity: number;
  customerEmpathy: number;
  longTermRetentionFit: number;
  overallScore: number;
  verdict: 'Select & Hire' | 'Strong Hold' | 'Decline';
  rationale: string;
  strengths: string[];
  onboardingFocus: string;
}

export interface CandidateProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  department: 'Customer Success' | 'Solutions Engineering' | 'Enterprise Sales' | 'Platform Operations';
  experienceYears: number;
  skills: string[];
  resumeSummary: string;
  stage: CandidateStage;
  appliedAt: string;
  avatarKey?: string;
  interviewTranscript: InterviewTurn[];
  evaluation?: CandidateEvaluation;
}

export interface EmployeeLongevityPlan {
  generatedAt: string;
  retentionForecast12m: number;
  workloadRecommendation: string;
  growthMilestone: string;
  recognitionTrigger: string;
  managerActionNote: string;
}

export interface AICompensationReview {
  reviewedAt: string;
  standingVerdict: 'Promote & Merit Raise' | 'Retain & Bonus' | 'Coaching Required' | 'Performance Risk';
  recommendedBaseUsd: number;
  recommendedBonusUsd: number;
  rationale: string;
  hrActionNote: string;
}

export interface EmployeeRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  skills: string[];
  employmentStatus: EmploymentStatus;
  baseSalaryUsd: number;
  performanceBonusUsd: number;
  taxDeductionUsd: number;
  attendanceRatePct: number;
  lastPaidPeriod?: string;
  offboardReason?: string;
  offboardedAt?: string;
  activeAccountsCount: number;
  maxCapacity: number;
  csatScore: number;
  retentionScore: number;
  burnoutRisk: 'Low' | 'Moderate' | 'Elevated';
  tenureMonths: number;
  careerTrack: string;
  joinedAt: string;
  hiredFromCandidateId?: string;
  avatarKey?: string;
  longevityPlan?: EmployeeLongevityPlan;
  compReview?: AICompensationReview;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: 'AnnualPaid' | 'MedicalPaid' | 'UnpaidLeave';
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Declined';
  backupEmployeeId?: string;
  backupEmployeeName?: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  department: string;
  periodMonth: string;
  baseSalaryUsd: number;
  performanceBonusUsd: number;
  taxDeductionUsd: number;
  netPayUsd: number;
  status: 'Pending' | 'Disbursed';
  disbursedAt?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  bnName: string;
  triggerCondition: string;
  automatedAction: string;
  enabled: boolean;
  executionsCount: number;
  lastTriggeredAt?: string;
}

export interface DomainEvent {
  id: string;
  timestamp: string;
  module:
    | 'Revenue Pipeline'
    | 'Email Automation'
    | 'Talent & Interview'
    | 'HR & Payroll'
    | 'Customer Retention'
    | 'Platform Longevity'
    | 'Workflow Engine'
    | 'Settings & Auth'
    | 'System';
  eventType: string;
  summary: string;
  actor: string;
}

export interface RetentionCohortPoint {
  periodLabel: string;
  customerRetentionPct: number;
  employeeRetentionPct: number;
  platformAdoptionPct: number;
}

export interface ArchitectureLayerSpec {
  id: string;
  order: string;
  name: string;
  bengaliSummary: string;
  responsibility: string;
  components: string[];
  designPattern: string;
  resilienceGuarantee: string;
}

export interface DashboardSnapshot {
  orgSettings: OrganizationSettings;
  customers: CustomerAccount[];
  deals: DealOpportunity[];
  emails: EmailThread[];
  candidates: CandidateProfile[];
  employees: EmployeeRecord[];
  leaveRequests: LeaveRequest[];
  payroll: PayrollRecord[];
  automationRules: AutomationRule[];
  events: DomainEvent[];
  cohorts: RetentionCohortPoint[];
  architectureLayers: ArchitectureLayerSpec[];
}
