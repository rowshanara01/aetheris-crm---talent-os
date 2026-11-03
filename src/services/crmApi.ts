import type {
  AuthUser,
  CandidateProfile,
  CustomerAccount,
  DashboardSnapshot,
  DealOpportunity,
  DealStage,
  EmailThread,
  EmployeeRecord,
  EmploymentStatus,
  LanguageCode,
  LeaveRequest,
  OrganizationSettings,
  WorkspaceUserSummary,
} from '../shared/types';

const AUTH_TOKEN_KEY = 'aetheris_session_token';

export const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '')
  .trim()
  .replace(/\/+$/, '');

export function resolveApiUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const normalized = url.startsWith('/') ? url : `/${url}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalized}` : normalized;
}

export function getStoredToken(): string {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // Ignore storage quota issues
  }
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(resolveApiUrl(url), {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data as T;
}

export const crmApi = {
  // Authentication & Session (Public registration & role-bypass disabled by policy)
  loginUser: (email: string, password: string) =>
    requestJson<{ token: string; user: AuthUser; snapshot: DashboardSnapshot }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  registerSpecialist: (payload: {
    name: string;
    email: string;
    password: string;
    title?: string;
  }) =>
    requestJson<{ token: string; user: AuthUser; snapshot: DashboardSnapshot }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  submitPublicCareerApplication: (payload: {
    name: string;
    email: string;
    role: string;
    department: string;
    experienceYears: number;
    skills: string;
    resumeSummary: string;
  }) =>
    requestJson<{ ok: boolean; candidateId: string; stage: string }>('/api/public/apply-career', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getCurrentUser: () => requestJson<{ user: AuthUser }>('/api/auth/me'),

  logoutUser: () =>
    requestJson<{ ok: boolean }>('/api/auth/logout', {
      method: 'POST',
    }),

  // Admin-Only Staff Provisioning (Admin creation restricted to SQLite database CLI)
  listWorkspaceUsers: () => requestJson<{ users: WorkspaceUserSummary[] }>('/api/admin/users'),

  adminCreateStaffUser: (payload: {
    name: string;
    email: string;
    password: string;
    role: 'HRManager' | 'Specialist';
    title?: string;
  }) =>
    requestJson<{ users: WorkspaceUserSummary[]; snapshot: DashboardSnapshot }>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminResetUserPassword: (userId: string, newPassword: string) =>
    requestJson<{ users: WorkspaceUserSummary[]; snapshot: DashboardSnapshot }>(
      `/api/admin/users/${userId}/reset-password`,
      {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      }
    ),

  adminDeleteUser: (userId: string) =>
    requestJson<{ users: WorkspaceUserSummary[]; snapshot: DashboardSnapshot }>(
      `/api/admin/users/${userId}`,
      {
        method: 'DELETE',
      }
    ),

  // Settings, Reset, CSV Bulk Import & Record CRUD
  updateOrgSettings: (payload: Partial<OrganizationSettings>) =>
    requestJson<{ snapshot: DashboardSnapshot }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  resetWorkspace: (mode: 'clean_slate' | 'restore_demo') =>
    requestJson<{ snapshot: DashboardSnapshot }>('/api/workspace/reset', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    }),

  importCustomersCsv: (csvText: string) =>
    requestJson<{ importedCount: number; snapshot: DashboardSnapshot }>('/api/import/customers-csv', {
      method: 'POST',
      body: JSON.stringify({ csvText }),
    }),

  importEmployeesCsv: (csvText: string) =>
    requestJson<{ importedCount: number; snapshot: DashboardSnapshot }>('/api/import/employees-csv', {
      method: 'POST',
      body: JSON.stringify({ csvText }),
    }),

  updateCustomer: (id: string, payload: Partial<CustomerAccount>) =>
    requestJson<{ customer: CustomerAccount; snapshot: DashboardSnapshot }>(`/api/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteRecord: (entityType: 'customer' | 'deal' | 'email' | 'candidate', id: string) =>
    requestJson<{ snapshot: DashboardSnapshot }>(`/api/records/${entityType}/${id}`, {
      method: 'DELETE',
    }),

  triggerInboundWebhook: (payload: {
    customerEmail: string;
    customerName?: string;
    companyName?: string;
    subject: string;
    inboundBody: string;
    autoReply?: boolean;
    language?: LanguageCode;
  }) =>
    requestJson<{
      ok: boolean;
      triagedByAi: boolean;
      emailId: string;
      email?: EmailThread;
      snapshot?: DashboardSnapshot;
    }>('/api/webhooks/inbound-email', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Core Snapshot & Modules
  getSnapshot: () => requestJson<DashboardSnapshot>('/api/snapshot'),

  getPythonBackendInfo: () =>
    requestJson<{ engine: string; sources: Record<string, string> }>('/api/python-backend-info'),

  createDeal: (payload: Partial<DealOpportunity>) =>
    requestJson<{ deal: DealOpportunity; snapshot: DashboardSnapshot }>('/api/deals', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateDealStage: (id: string, stage: DealStage) =>
    requestJson<{ deal: DealOpportunity; snapshot: DashboardSnapshot }>(`/api/deals/${id}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stage }),
    }),

  generateDealCoaching: (id: string, language: LanguageCode) =>
    requestJson<{ deal: DealOpportunity; snapshot: DashboardSnapshot }>(`/api/deals/${id}/ai-coaching`, {
      method: 'POST',
      body: JSON.stringify({ language }),
    }),

  createLeaveRequest: (payload: {
    employeeId: string;
    leaveType: LeaveRequest['leaveType'];
    startDate: string;
    endDate: string;
    daysCount: number;
    reason: string;
  }) =>
    requestJson<{ snapshot: DashboardSnapshot }>('/api/leaves', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  reviewLeaveRequest: (id: string, decision: 'Approved' | 'Declined') =>
    requestJson<{ snapshot: DashboardSnapshot }>(`/api/leaves/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    }),

  toggleAutomationRule: (id: string) =>
    requestJson<{ snapshot: DashboardSnapshot }>(`/api/workflows/${id}/toggle`, {
      method: 'POST',
    }),

  runAutonomousSweep: () =>
    requestJson<{ summary: string; actionsCount: number; snapshot: DashboardSnapshot }>(
      '/api/workflows/run-sweep',
      { method: 'POST' }
    ),

  createEmail: (payload: Partial<EmailThread>) =>
    requestJson<{ email: EmailThread; snapshot: DashboardSnapshot }>('/api/emails', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  triageEmailWithAI: (id: string, language: LanguageCode, autoSend = false) =>
    requestJson<{ email: EmailThread; snapshot: DashboardSnapshot }>(`/api/emails/${id}/ai-triage`, {
      method: 'POST',
      body: JSON.stringify({ language, autoSend }),
    }),

  sendEmailReply: (id: string, replyBody: string, assignedEmployeeId?: string) =>
    requestJson<{ email: EmailThread; snapshot: DashboardSnapshot }>(`/api/emails/${id}/send`, {
      method: 'POST',
      body: JSON.stringify({ replyBody, assignedEmployeeId }),
    }),

  createCandidate: (payload: {
    name: string;
    email: string;
    role: string;
    department: CandidateProfile['department'];
    experienceYears: number;
    skills: string;
    resumeSummary: string;
  }) =>
    requestJson<{ candidate: CandidateProfile; snapshot: DashboardSnapshot }>('/api/candidates', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  askCandidateQuestion: (id: string, language: LanguageCode) =>
    requestJson<{ candidate: CandidateProfile; snapshot: DashboardSnapshot }>(`/api/candidates/${id}/ask-question`, {
      method: 'POST',
      body: JSON.stringify({ language }),
    }),

  submitCandidateAnswer: (id: string, answer: string) =>
    requestJson<{ candidate: CandidateProfile; snapshot: DashboardSnapshot }>(`/api/candidates/${id}/answer`, {
      method: 'POST',
      body: JSON.stringify({ answer }),
    }),

  evaluateCandidate: (id: string, language: LanguageCode) =>
    requestJson<{ candidate: CandidateProfile; snapshot: DashboardSnapshot }>(`/api/candidates/${id}/evaluate`, {
      method: 'POST',
      body: JSON.stringify({ language }),
    }),

  hireCandidate: (id: string, baseSalaryUsd = 5200, employmentStatus: EmploymentStatus = 'Probation') =>
    requestJson<{ candidate: CandidateProfile; employee?: EmployeeRecord; snapshot: DashboardSnapshot }>(
      `/api/candidates/${id}/hire`,
      {
        method: 'POST',
        body: JSON.stringify({ baseSalaryUsd, employmentStatus }),
      }
    ),

  directHireEmployee: (payload: {
    name: string;
    email: string;
    role: string;
    department: string;
    skills: string;
    baseSalaryUsd: number;
    employmentStatus: EmploymentStatus;
    maxCapacity?: number;
  }) =>
    requestJson<{ employee: EmployeeRecord; snapshot: DashboardSnapshot }>('/api/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateEmployeeCompensation: (
    id: string,
    baseSalaryUsd: number,
    performanceBonusUsd: number,
    employmentStatus?: EmploymentStatus
  ) =>
    requestJson<{ employee: EmployeeRecord; snapshot: DashboardSnapshot }>(`/api/employees/${id}/compensation`, {
      method: 'PATCH',
      body: JSON.stringify({ baseSalaryUsd, performanceBonusUsd, employmentStatus }),
    }),

  offboardEmployee: (id: string, reason: string, handoverEmployeeId?: string) =>
    requestJson<{ employee: EmployeeRecord; snapshot: DashboardSnapshot }>(`/api/employees/${id}/offboard`, {
      method: 'POST',
      body: JSON.stringify({ reason, handoverEmployeeId }),
    }),

  reinstateEmployee: (id: string) =>
    requestJson<{ employee: EmployeeRecord; snapshot: DashboardSnapshot }>(`/api/employees/${id}/reinstate`, {
      method: 'POST',
    }),

  runEmployeeCompReview: (id: string, language: LanguageCode) =>
    requestJson<{ employee: EmployeeRecord; snapshot: DashboardSnapshot }>(`/api/employees/${id}/comp-review`, {
      method: 'POST',
      body: JSON.stringify({ language }),
    }),

  generatePayrollBatch: (periodMonth: string) =>
    requestJson<{ snapshot: DashboardSnapshot }>('/api/payroll/generate', {
      method: 'POST',
      body: JSON.stringify({ periodMonth }),
    }),

  disbursePayroll: (params: { payrollId?: string; periodMonth?: string }) =>
    requestJson<{ snapshot: DashboardSnapshot }>('/api/payroll/disburse', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  createCustomer: (payload: Partial<CustomerAccount>) =>
    requestJson<{ customer: CustomerAccount; snapshot: DashboardSnapshot }>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  reassignCustomer: (id: string, assignedEmployeeId: string) =>
    requestJson<{ customer: CustomerAccount; snapshot: DashboardSnapshot }>(`/api/customers/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assignedEmployeeId }),
    }),

  generateCustomerRetentionPlan: (id: string, language: LanguageCode) =>
    requestJson<{ customer: CustomerAccount; snapshot: DashboardSnapshot }>(`/api/customers/${id}/retention-plan`, {
      method: 'POST',
      body: JSON.stringify({ language }),
    }),

  executeCustomerRetention: (id: string) =>
    requestJson<{ customer: CustomerAccount; snapshot: DashboardSnapshot }>(`/api/customers/${id}/execute-retention`, {
      method: 'POST',
    }),

  generateEmployeeLongevityPlan: (id: string, language: LanguageCode) =>
    requestJson<{ employee: EmployeeRecord; snapshot: DashboardSnapshot }>(`/api/employees/${id}/longevity-plan`, {
      method: 'POST',
      body: JSON.stringify({ language }),
    }),
};
