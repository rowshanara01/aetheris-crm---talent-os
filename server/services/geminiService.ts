import { GoogleGenAI, Type } from '@google/genai';
import type {
  AICompensationReview,
  AIDealCoaching,
  CandidateEvaluation,
  CandidateProfile,
  CustomerAccount,
  CustomerRetentionPlan,
  DealOpportunity,
  EmailThread,
  EmailUrgency,
  EmployeeLongevityPlan,
  EmployeeRecord,
  LanguageCode,
} from '../../src/shared/types.ts';

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing. Please verify your API key in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface EmailTriageAIResult {
  recommendedEmployeeId: string;
  aiRoutingReason: string;
  category: string;
  sentiment: 'Positive' | 'Neutral' | 'Frustrated' | 'Urgent Escalation';
  urgency: EmailUrgency;
  draftReply: string;
  suggestedHealthDelta: number;
}

export interface PythonSpecialistRanking {
  employeeId: string;
  name: string;
  role: string;
  matchScore: number;
  availableSlots: number;
}

export async function analyzeAndDraftEmailReply(params: {
  email: EmailThread;
  customer?: CustomerAccount;
  employees: EmployeeRecord[];
  pythonRankings?: PythonSpecialistRanking[];
  language: LanguageCode;
}): Promise<EmailTriageAIResult> {
  const ai = getClient();
  const activeEmployees = params.employees.filter((e) => e.employmentStatus !== 'Offboarded');
  const languageInstruction =
    params.language === 'bn'
      ? 'Write the `draftReply` in natural, respectful, executive Bengali (বাংলা), while keeping `aiRoutingReason` and `category` concise and clear.'
      : 'Write the `draftReply` in crisp, empathetic, executive business English.';

  const employeeRoster = activeEmployees
    .map(
      (e) =>
        `- ID: ${e.id} | Name: ${e.name} | Role: ${e.role} | Skills: ${e.skills.join(', ')} | Load: ${e.activeAccountsCount}/${e.maxCapacity} | CSAT: ${e.csatScore}%`
    )
    .join('\n');

  const rankingContext =
    params.pythonRankings && params.pythonRankings.length > 0
      ? params.pythonRankings
          .map(
            (r, i) =>
              `${i + 1}. ${r.name} (${r.employeeId}) — Python Affinity Score: ${r.matchScore}/100, Open Slots: ${r.availableSlots}`
          )
          .join('\n')
      : 'No pre-rankings supplied.';

  const prompt = `Analyze this inbound enterprise CRM email, select the single best active employee from the roster to own the customer relationship, and compose an immediate, high-trust auto-reply designed to retain the customer long-term.

${languageInstruction}

Inbound Email:
- From: ${params.email.customerName} (${params.email.companyName}) <${params.email.customerEmail}>
- Subject: ${params.email.subject}
- Message: ${params.email.inboundBody}

Customer Account Context:
${
  params.customer
    ? `- ARR: $${params.customer.arrUsd} | Health Score: ${params.customer.healthScore}/100 | Churn Risk: ${params.customer.churnRisk} | Renewal Date: ${params.customer.renewalDate}\n- Notes: ${params.customer.notes}`
    : '- Prospective or unlinked enterprise contact'
}

Python Domain Engine Pre-Computed Specialist Rankings:
${rankingContext}

Available Active Employee Roster:
${employeeRoster}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction:
        'You are the Principal AI Routing & Customer Retention Architect for Aetheris CRM. Incorporate the Python Domain Engine affinity scores alongside semantic nuance, select a valid active employee ID from the roster, and craft concrete, SLA-backed responses.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          recommendedEmployeeId: {
            type: Type.STRING,
            description: 'Exact ID of the chosen active employee from the provided roster.',
          },
          aiRoutingReason: {
            type: Type.STRING,
            description:
              '1-2 sentence explanation of why this employee was selected based on Python affinity score, skills, CSAT, and workload.',
          },
          category: {
            type: Type.STRING,
            description: 'Concise classification of the email intent.',
          },
          sentiment: {
            type: Type.STRING,
            description: 'Must be one of: Positive, Neutral, Frustrated, Urgent Escalation',
          },
          urgency: {
            type: Type.STRING,
            description: 'Must be one of: Low, Medium, High, Critical',
          },
          draftReply: {
            type: Type.STRING,
            description: 'Complete, ready-to-send email reply naming the assigned specialist and concrete next steps.',
          },
          suggestedHealthDelta: {
            type: Type.INTEGER,
            description: 'Projected account health score improvement (+2 to +12) once resolved.',
          },
        },
        required: [
          'recommendedEmployeeId',
          'aiRoutingReason',
          'category',
          'sentiment',
          'urgency',
          'draftReply',
          'suggestedHealthDelta',
        ],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as EmailTriageAIResult;
  const validEmp = activeEmployees.find((e) => e.id === parsed.recommendedEmployeeId) ?? activeEmployees[0];
  if (validEmp) {
    parsed.recommendedEmployeeId = validEmp.id;
  }
  return parsed;
}

export async function generateNextInterviewQuestion(params: {
  candidate: CandidateProfile;
  language: LanguageCode;
}): Promise<{ question: string; competencyFocus: string }> {
  const ai = getClient();
  const transcriptText =
    params.candidate.interviewTranscript.length > 0
      ? params.candidate.interviewTranscript
          .map((t) => `${t.speaker.toUpperCase()}: ${t.content}`)
          .join('\n\n')
      : 'No questions asked yet. Start with an incisive opening scenario question.';

  const langNote =
    params.language === 'bn'
      ? 'Write the interview question in professional Bengali (বাংলা) suitable for a senior enterprise interview.'
      : 'Write the interview question in crisp, clear English.';

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: `Candidate Profile:
- Name: ${params.candidate.name}
- Target Role: ${params.candidate.role} (${params.candidate.department})
- Experience: ${params.candidate.experienceYears} years
- Core Skills: ${params.candidate.skills.join(', ')}
- Summary: ${params.candidate.resumeSummary}

Interview Transcript So Far:
${transcriptText}

Generate the next single high-signal scenario-based interview question that tests both role mastery and long-term customer/platform ownership. ${langNote}`,
    config: {
      systemInstruction:
        'You are a Principal Bar-Raiser Interviewer hiring high-retention talent for an enterprise CRM organization. Ask realistic scenario questions without fluff.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          question: {
            type: Type.STRING,
            description: 'The single next interview question to ask the candidate.',
          },
          competencyFocus: {
            type: Type.STRING,
            description: 'Short label for the competency being assessed (3-5 words).',
          },
        },
        required: ['question', 'competencyFocus'],
      },
    },
  });

  return JSON.parse((response.text ?? '{}').trim()) as { question: string; competencyFocus: string };
}

export async function evaluateCandidateInterview(params: {
  candidate: CandidateProfile;
  language: LanguageCode;
}): Promise<CandidateEvaluation> {
  const ai = getClient();
  const transcriptText =
    params.candidate.interviewTranscript.length > 0
      ? params.candidate.interviewTranscript
          .map((t) => `${t.speaker.toUpperCase()}: ${t.content}`)
          .join('\n\n')
      : 'No live interview turns recorded; evaluate strictly from resume summary and note need for deeper probing.';

  const langNote =
    params.language === 'bn'
      ? 'Write `rationale`, `strengths`, and `onboardingFocus` in clear professional Bengali (বাংলা), while keeping `verdict` strictly one of the allowed English enum strings.'
      : 'Write `rationale`, `strengths`, and `onboardingFocus` in clear executive English.';

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: `Evaluate this candidate for selection and long-term retention fit on our platform.
${langNote}

Candidate: ${params.candidate.name}
Role: ${params.candidate.role} (${params.candidate.department})
Experience: ${params.candidate.experienceYears} years
Skills: ${params.candidate.skills.join(', ')}
Resume Summary: ${params.candidate.resumeSummary}

Interview Transcript:
${transcriptText}`,
    config: {
      systemInstruction:
        'You are an objective Talent Selection Committee AI. Score rigorously on a 0-100 scale based on concrete evidence in the candidate responses and background.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          technicalMastery: { type: Type.INTEGER, description: 'Score 0-100 for technical/domain depth.' },
          communicationClarity: { type: Type.INTEGER, description: 'Score 0-100 for structured executive clarity.' },
          customerEmpathy: { type: Type.INTEGER, description: 'Score 0-100 for customer retention orientation.' },
          longTermRetentionFit: {
            type: Type.INTEGER,
            description: 'Score 0-100 for long-term team & platform longevity.',
          },
          overallScore: { type: Type.INTEGER, description: 'Weighted overall score 0-100.' },
          verdict: {
            type: Type.STRING,
            description: 'Must be exact string: "Select & Hire", "Strong Hold", or "Decline"',
          },
          rationale: {
            type: Type.STRING,
            description: '2-3 sentence evidence-backed hiring decision summary.',
          },
          strengths: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Top 3 demonstrated strengths.',
          },
          onboardingFocus: {
            type: Type.STRING,
            description: '90-day onboarding & long-term retention plan once hired.',
          },
        },
        required: [
          'technicalMastery',
          'communicationClarity',
          'customerEmpathy',
          'longTermRetentionFit',
          'overallScore',
          'verdict',
          'rationale',
          'strengths',
          'onboardingFocus',
        ],
      },
    },
  });

  const raw = JSON.parse((response.text ?? '{}').trim()) as Omit<CandidateEvaluation, 'evaluatedAt'>;
  const validVerdicts: CandidateEvaluation['verdict'][] = ['Select & Hire', 'Strong Hold', 'Decline'];
  const normalizedVerdict = validVerdicts.includes(raw.verdict) ? raw.verdict : 'Strong Hold';

  return {
    ...raw,
    verdict: normalizedVerdict,
    evaluatedAt: new Date().toISOString(),
  };
}

export async function evaluateEmployeeCompensationAndStanding(params: {
  employee: EmployeeRecord;
  assignedCustomers: CustomerAccount[];
  language: LanguageCode;
}): Promise<AICompensationReview> {
  const ai = getClient();
  const managedArr = params.assignedCustomers.reduce((sum, c) => sum + c.arrUsd, 0);
  const atRiskCount = params.assignedCustomers.filter((c) => c.churnRisk === 'High').length;
  const langNote =
    params.language === 'bn'
      ? 'Write `rationale` and `hrActionNote` in clear, objective professional Bengali (বাংলা), while keeping `standingVerdict` strictly one of the allowed English strings.'
      : 'Write `rationale` and `hrActionNote` in crisp executive English.';

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: `Audit this employee's performance, retention value, and monthly compensation structure for HR & Payroll decision-making.
${langNote}

Employee: ${params.employee.name} — ${params.employee.role} (${params.employee.department})
Status: ${params.employee.employmentStatus} | Tenure: ${params.employee.tenureMonths} months
Current Base Salary: $${params.employee.baseSalaryUsd}/mo | Current Bonus: $${params.employee.performanceBonusUsd}/mo
CSAT Score: ${params.employee.csatScore}% | Retention Index: ${params.employee.retentionScore}/100 | Burnout Risk: ${params.employee.burnoutRisk}
Managed Portfolio: ${params.assignedCustomers.length}/${params.employee.maxCapacity} accounts | Total Managed ARR: $${managedArr.toLocaleString()} | High-Risk Accounts: ${atRiskCount}`,
    config: {
      systemInstruction:
        'You are Chief People & Compensation Officer AI. Provide objective merit raise, bonus calibration, or coaching/performance risk guidance tied directly to CSAT, ARR managed, and retention metrics.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          standingVerdict: {
            type: Type.STRING,
            description:
              'Must be exact string: "Promote & Merit Raise", "Retain & Bonus", "Coaching Required", or "Performance Risk"',
          },
          recommendedBaseUsd: {
            type: Type.INTEGER,
            description: 'Recommended monthly base salary in USD.',
          },
          recommendedBonusUsd: {
            type: Type.INTEGER,
            description: 'Recommended monthly KPI bonus in USD.',
          },
          rationale: {
            type: Type.STRING,
            description: '2-3 sentence quantitative justification.',
          },
          hrActionNote: {
            type: Type.STRING,
            description: 'Concrete next HR action (salary revision, bonus payout, workload relief, or PIP review).',
          },
        },
        required: ['standingVerdict', 'recommendedBaseUsd', 'recommendedBonusUsd', 'rationale', 'hrActionNote'],
      },
    },
  });

  const raw = JSON.parse((response.text ?? '{}').trim()) as Omit<AICompensationReview, 'reviewedAt'>;
  const allowed: AICompensationReview['standingVerdict'][] = [
    'Promote & Merit Raise',
    'Retain & Bonus',
    'Coaching Required',
    'Performance Risk',
  ];
  return {
    ...raw,
    standingVerdict: allowed.includes(raw.standingVerdict) ? raw.standingVerdict : 'Retain & Bonus',
    reviewedAt: new Date().toISOString(),
  };
}

export async function generateCustomerRetentionPlaybook(params: {
  customer: CustomerAccount;
  recentEmails: EmailThread[];
  assignedEmployee?: EmployeeRecord;
  language: LanguageCode;
}): Promise<CustomerRetentionPlan> {
  const ai = getClient();
  const langNote =
    params.language === 'bn'
      ? 'Write `riskSummary`, `loyaltyIncentive`, `outreachSubject`, `outreachBody`, and `steps` in clear professional Bengali (বাংলা).'
      : 'Write all fields in crisp executive English.';

  const emailContext =
    params.recentEmails.length > 0
      ? params.recentEmails.map((e) => `- [${e.status}] ${e.subject} (Sentiment: ${e.sentiment})`).join('\n')
      : '- No recent support escalations';

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: `Create a concrete 3-horizon long-term customer retention playbook to prevent churn and lock in multi-year loyalty.
${langNote}

Account: ${params.customer.companyName} (${params.customer.industry})
Primary Contact: ${params.customer.contactName} <${params.customer.contactEmail}>
ARR: $${params.customer.arrUsd} | Health Score: ${params.customer.healthScore}/100 | NPS: ${params.customer.npsScore}/10 | Seat Utilization: ${Math.round(params.customer.activeSeatsRatio * 100)}%
Renewal Date: ${params.customer.renewalDate} | Churn Risk: ${params.customer.churnRisk}
Assigned Owner: ${params.assignedEmployee ? `${params.assignedEmployee.name} (${params.assignedEmployee.role})` : 'Unassigned'}
Account Notes: ${params.customer.notes}

Recent Email History:
${emailContext}`,
    config: {
      systemInstruction:
        'You are Chief Customer Officer AI. Design measurable, high-ROI retention interventions across 7-day stabilization, 30-day adoption expansion, and 90-day multi-year renewal.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          riskSummary: {
            type: Type.STRING,
            description: 'Diagnostic root cause of retention risk or expansion opportunity.',
          },
          loyaltyIncentive: {
            type: Type.STRING,
            description:
              'Commercial or architectural value-add offer (e.g. dedicated partition, multi-year price cap, training clinic).',
          },
          outreachSubject: { type: Type.STRING, description: 'Subject line for proactive executive check-in.' },
          outreachBody: { type: Type.STRING, description: 'Personalized outreach email from the assigned owner.' },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                horizon: {
                  type: Type.STRING,
                  description: 'e.g. Day 1-7 Stabilization, Day 30 Adoption, Day 90 Multi-Year Lock',
                },
                actionTitle: { type: Type.STRING },
                executionDetail: { type: Type.STRING },
                expectedImpact: { type: Type.STRING },
              },
              required: ['horizon', 'actionTitle', 'executionDetail', 'expectedImpact'],
            },
          },
        },
        required: ['riskSummary', 'loyaltyIncentive', 'outreachSubject', 'outreachBody', 'steps'],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as Omit<CustomerRetentionPlan, 'generatedAt'>;
  return {
    ...parsed,
    generatedAt: new Date().toISOString(),
  };
}

export async function generateEmployeeLongevityPlan(params: {
  employee: EmployeeRecord;
  assignedCustomers: CustomerAccount[];
  language: LanguageCode;
}): Promise<EmployeeLongevityPlan> {
  const ai = getClient();
  const langNote =
    params.language === 'bn'
      ? 'Write the plan fields in respectful, motivating professional Bengali (বাংলা).'
      : 'Write the plan fields in clear, actionable executive English.';

  const accountsSummary =
    params.assignedCustomers.length > 0
      ? params.assignedCustomers
          .map((c) => `${c.companyName} ($${c.arrUsd.toLocaleString()}, Risk: ${c.churnRisk})`)
          .join('; ')
      : 'No active accounts currently assigned';

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: `Design a long-term employee retention & platform engagement plan so this high-value team member thrives for years without burnout.
${langNote}

Employee: ${params.employee.name} — ${params.employee.role} (${params.employee.department})
Tenure: ${params.employee.tenureMonths} months | Career Track: ${params.employee.careerTrack}
Workload: ${params.employee.activeAccountsCount}/${params.employee.maxCapacity} accounts | Burnout Risk: ${params.employee.burnoutRisk}
CSAT Score: ${params.employee.csatScore}% | Current Retention Score: ${params.employee.retentionScore}/100
Skills: ${params.employee.skills.join(', ')}
Assigned Portfolio: ${accountsSummary}`,
    config: {
      systemInstruction:
        'You are VP of People & Organizational Longevity. Balance portfolio load, career velocity, and meaningful recognition to maximize multi-year employee retention.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          retentionForecast12m: {
            type: Type.INTEGER,
            description: 'Projected 12-month retention probability (0-100).',
          },
          workloadRecommendation: {
            type: Type.STRING,
            description: 'Concrete portfolio & capacity calibration advice.',
          },
          growthMilestone: {
            type: Type.STRING,
            description: 'Next 6-month career promotion or architectural leadership milestone.',
          },
          recognitionTrigger: {
            type: Type.STRING,
            description: 'Compensation, equity, or executive spotlight recommendation.',
          },
          managerActionNote: { type: Type.STRING, description: 'Immediate 1-on-1 talking point for leadership.' },
        },
        required: [
          'retentionForecast12m',
          'workloadRecommendation',
          'growthMilestone',
          'recognitionTrigger',
          'managerActionNote',
        ],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as Omit<EmployeeLongevityPlan, 'generatedAt'>;
  return {
    ...parsed,
    generatedAt: new Date().toISOString(),
  };
}

export async function generateDealWinCoaching(params: {
  deal: DealOpportunity;
  customer?: CustomerAccount;
  owner?: EmployeeRecord;
  language: LanguageCode;
}): Promise<AIDealCoaching> {
  const ai = getClient();
  const langNote =
    params.language === 'bn'
      ? 'Write `executiveValueHook`, `keyRiskBlocker`, `pricingGuardrail`, and `nextBestAction` in crisp, persuasive professional Bengali (বাংলা).'
      : 'Write all strategy fields in crisp, actionable executive English.';

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: `Analyze this enterprise CRM deal opportunity and generate a concrete win-strategy & pricing negotiation playbook.
${langNote}

Deal: ${params.deal.title} (${params.deal.dealType})
Company: ${params.deal.companyName} | Value: $${params.deal.valueUsd.toLocaleString()} | Stage: ${params.deal.stage}
Current Win Probability: ${params.deal.winProbability}% | Expected Close: ${params.deal.expectedCloseDate}
Deal Owner: ${params.owner ? `${params.owner.name} (${params.owner.role}, CSAT ${params.owner.csatScore}%)` : 'Unassigned'}
${
  params.customer
    ? `Existing Customer Health: ${params.customer.healthScore}/100 | Current ARR: $${params.customer.arrUsd.toLocaleString()} | Churn Risk: ${params.customer.churnRisk}`
    : 'Net-New Enterprise Prospect'
}
Opportunity Notes: ${params.deal.notes}`,
    config: {
      systemInstruction:
        'You are Chief Revenue Officer AI for an enterprise B2B SaaS platform. Calibrate realistic win probability and provide concrete executive negotiation guidance without generic filler.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          calibratedWinProbability: {
            type: Type.INTEGER,
            description: 'Calibrated win probability percentage between 10 and 98.',
          },
          executiveValueHook: {
            type: Type.STRING,
            description: 'High-impact ROI & business value angle for the CFO/CTO.',
          },
          keyRiskBlocker: {
            type: Type.STRING,
            description: 'Primary commercial or technical objection that could stall closing.',
          },
          pricingGuardrail: {
            type: Type.STRING,
            description: 'Multi-year pricing structure, discount cap, or SLA trade-off rule.',
          },
          nextBestAction: {
            type: Type.STRING,
            description: 'Immediate next 48-hour action for the assigned specialist.',
          },
        },
        required: [
          'calibratedWinProbability',
          'executiveValueHook',
          'keyRiskBlocker',
          'pricingGuardrail',
          'nextBestAction',
        ],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as Omit<AIDealCoaching, 'generatedAt'>;
  return {
    ...parsed,
    generatedAt: new Date().toISOString(),
  };
}

