import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import { pythonBridge } from '../persistence/PythonBridge.ts';
import {
  analyzeAndDraftEmailReply,
  evaluateCandidateInterview,
  evaluateEmployeeCompensationAndStanding,
  generateCustomerRetentionPlaybook,
  generateDealWinCoaching,
  generateEmployeeLongevityPlan,
  generateNextInterviewQuestion,
  type PythonSpecialistRanking,
} from '../services/geminiService.ts';
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
} from '../../src/shared/types.ts';

export const apiRouter = express.Router();

function formatErrorMessage(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID') || raw.includes('403')) {
    return {
      status: 403,
      message: 'Gemini API permission or key error. Please check your API key in Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message: 'API quota reached. You can upgrade or select a billing-enabled API key in Settings > Secrets.',
    };
  }
  if (raw.includes('Invalid email or password') || raw.includes('Session expired')) {
    return {
      status: 401,
      message: raw,
    };
  }
  return {
    status: 500,
    message: raw || 'Internal server error occurred.',
  };
}

function extractBearerToken(req: express.Request): string {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return '';
}

async function resolveOptionalUser(req: express.Request): Promise<AuthUser | null> {
  const token = extractBearerToken(req);
  if (!token) return null;
  try {
    const res = await pythonBridge.post<{ user: AuthUser }>('/auth/me', { token });
    return res.user;
  } catch {
    return null;
  }
}

// --- 0. Public Health Probe (Render / Hugging Face Spaces / Keep-Alive Cron) ---
apiRouter.get('/health', async (_req, res) => {
  try {
    const pyHealth = await pythonBridge.get<{ ok: boolean; engine: string }>('/health');
    res.json({
      ok: true,
      status: 'healthy',
      gateway: 'node-express',
      pythonEngine: pyHealth.engine,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ ok: false, error: message });
  }
});

// --- 0. Authentication & Strict RBAC Security Boundary ---
apiRouter.post('/auth/register', async (req, res) => {
  try {
    if (req.body?.role === 'Admin' || req.body?.role === 'HRManager') {
      res.status(403).json({
        error:
          'Administrator accounts cannot be registered from the website. Admin accounts can only be created directly in the SQLite database (manage_admin.py).',
      });
      return;
    }
    const result = await pythonBridge.post<{
      token: string;
      user: AuthUser;
      snapshot: DashboardSnapshot;
    }>('/auth/register-specialist', {
      name: req.body?.name,
      email: req.body?.email,
      password: req.body?.password,
      title: req.body?.title || 'CRM Account Specialist',
    });
    res.status(201).json(result);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status === 500 ? 400 : status).json({ error: message });
  }
});

apiRouter.post('/auth/quick-role', (_req, res) => {
  res.status(403).json({
    error: 'Unauthenticated role bypass is disabled. Please sign in with your email and password.',
  });
});

// Public Career Portal Application (inserts candidate into Screening pipeline without leaking internal snapshot)
apiRouter.post('/public/apply-career', async (req, res) => {
  try {
    const { name, email, role, department, experienceYears, skills, resumeSummary } = (req.body || {}) as Record<
      string,
      unknown
    >;
    if (!String(name || '').trim() || !String(email || '').trim()) {
      res.status(400).json({ error: 'Applicant name and email are required.' });
      return;
    }
    const created = await pythonBridge.post<{ candidate: CandidateProfile; snapshot: DashboardSnapshot }>(
      '/candidates',
      {
        name: String(name).trim(),
        email: String(email).trim(),
        role: String(role || 'Senior Customer Success Architect').trim(),
        department: String(department || 'Customer Success').trim(),
        experienceYears: Number(experienceYears || 3),
        skills: String(skills || 'Enterprise Support, Client Retention').trim(),
        resumeSummary: String(
          resumeSummary || 'Applied via public Aetheris Careers Portal for AI competency screening.'
        ).trim(),
      }
    );
    res.status(201).json({
      ok: true,
      candidateId: created.candidate.id,
      stage: created.candidate.stage,
    });
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status === 500 ? 400 : status).json({ error: message });
  }
});

apiRouter.post('/auth/login', async (req, res) => {
  try {
    const result = await pythonBridge.post<{
      token: string;
      user: AuthUser;
      snapshot: DashboardSnapshot;
    }>('/auth/login', req.body);
    res.json(result);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

apiRouter.get('/auth/me', async (req, res) => {
  const user = await resolveOptionalUser(req);
  if (!user) {
    res.status(401).json({ error: 'Not signed in.' });
    return;
  }
  res.json({ user });
});

apiRouter.post('/auth/logout', async (req, res) => {
  try {
    const token = extractBearerToken(req);
    await pythonBridge.post('/auth/logout', { token });
    res.json({ ok: true });
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// Require valid authenticated session for all internal CRM/HR/Settings endpoints
// (Public routes allowed before this middleware or explicitly bypassed: /health, /auth/*, /public/*, /webhooks/inbound-email)
apiRouter.use(async (req, res, next) => {
  if (
    req.path === '/health' ||
    req.path.startsWith('/auth/') ||
    req.path.startsWith('/public/') ||
    req.path === '/webhooks/inbound-email'
  ) {
    next();
    return;
  }
  const user = await resolveOptionalUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required. Please sign in with your workspace credentials.' });
    return;
  }
  (req as express.Request & { authUser?: AuthUser }).authUser = user;
  next();
});

// --- 0a. Admin-Only Staff Account Provisioning (Admin creation strictly blocked on web) ---
apiRouter.get('/admin/users', async (req, res) => {
  try {
    const user = (req as express.Request & { authUser?: AuthUser }).authUser;
    if (!user || user.role !== 'Admin') {
      res.status(403).json({ error: 'Only Administrators can view provisioned user accounts.' });
      return;
    }
    const result = await pythonBridge.get<{ users: WorkspaceUserSummary[] }>('/admin/users/list');
    res.json(result);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

apiRouter.post('/admin/users', async (req, res) => {
  try {
    const user = (req as express.Request & { authUser?: AuthUser }).authUser;
    if (!user || user.role !== 'Admin') {
      res.status(403).json({ error: 'Only Administrators can create staff login accounts.' });
      return;
    }
    if (req.body?.role === 'Admin') {
      res.status(403).json({
        error:
          'Administrator accounts cannot be created from the website. Provision Admin accounts directly in SQLite via: python3 backend_python/manage_admin.py create-admin',
      });
      return;
    }
    const created = await pythonBridge.post<{
      users: WorkspaceUserSummary[];
      snapshot: DashboardSnapshot;
    }>('/admin/users/create', {
      ...req.body,
      actorName: user.name,
    });
    res.status(201).json(created);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status === 500 ? 400 : status).json({ error: message });
  }
});

apiRouter.post('/admin/users/:id/reset-password', async (req, res) => {
  try {
    const user = (req as express.Request & { authUser?: AuthUser }).authUser;
    if (!user || user.role !== 'Admin') {
      res.status(403).json({ error: 'Only Administrators can reset staff passwords.' });
      return;
    }
    const updated = await pythonBridge.post<{
      users: WorkspaceUserSummary[];
      snapshot: DashboardSnapshot;
    }>('/admin/users/reset-password', {
      targetUserId: req.params.id,
      newPassword: req.body?.newPassword,
      actorId: user.id,
      actorName: user.name,
    });
    res.json(updated);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status === 500 ? 400 : status).json({ error: message });
  }
});

apiRouter.delete('/admin/users/:id', async (req, res) => {
  try {
    const user = (req as express.Request & { authUser?: AuthUser }).authUser;
    if (!user || user.role !== 'Admin') {
      res.status(403).json({ error: 'Only Administrators can revoke staff accounts.' });
      return;
    }
    const updated = await pythonBridge.post<{
      users: WorkspaceUserSummary[];
      snapshot: DashboardSnapshot;
    }>('/admin/users/delete', {
      targetUserId: req.params.id,
      actorId: user.id,
      actorName: user.name,
    });
    res.json(updated);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status === 500 ? 400 : status).json({ error: message });
  }
});

// --- 0b. Organization Settings, Workspace Reset, CSV Bulk Import & Record CRUD ---
apiRouter.put('/settings', async (req, res) => {
  try {
    const user = await resolveOptionalUser(req);
    if (user && user.role === 'Specialist') {
      res.status(403).json({ error: 'Only Admin or HR Manager roles can modify company settings.' });
      return;
    }
    const updated = await pythonBridge.post<{ snapshot: DashboardSnapshot }>(
      '/settings/update',
      req.body as Partial<OrganizationSettings>
    );
    res.json(updated);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

apiRouter.post('/workspace/reset', async (req, res) => {
  try {
    const user = await resolveOptionalUser(req);
    if (user && user.role !== 'Admin') {
      res.status(403).json({ error: 'Only Workspace Admins can reset or restore workspace datasets.' });
      return;
    }
    const { mode = 'clean_slate' } = (req.body || {}) as { mode?: 'clean_slate' | 'restore_demo' };
    const updated = await pythonBridge.post<{ snapshot: DashboardSnapshot }>('/workspace/reset', {
      mode,
      actorName: user?.name || 'Founder & Admin',
    });
    res.json(updated);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

apiRouter.post('/import/customers-csv', async (req, res) => {
  try {
    const { csvText } = req.body as { csvText?: string };
    if (!csvText?.trim()) {
      res.status(400).json({ error: 'CSV content is empty.' });
      return;
    }
    const result = await pythonBridge.post<{ importedCount: number; snapshot: DashboardSnapshot }>(
      '/import/customers-csv',
      { csvText }
    );
    res.json(result);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status === 500 ? 400 : status).json({ error: message });
  }
});

apiRouter.post('/import/employees-csv', async (req, res) => {
  try {
    const user = await resolveOptionalUser(req);
    if (user && user.role === 'Specialist') {
      res.status(403).json({ error: 'Only Admin or HR Manager can bulk-import employee payroll records.' });
      return;
    }
    const { csvText } = req.body as { csvText?: string };
    if (!csvText?.trim()) {
      res.status(400).json({ error: 'CSV content is empty.' });
      return;
    }
    const result = await pythonBridge.post<{ importedCount: number; snapshot: DashboardSnapshot }>(
      '/import/employees-csv',
      { csvText }
    );
    res.json(result);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status === 500 ? 400 : status).json({ error: message });
  }
});

apiRouter.patch('/customers/:id', async (req, res) => {
  try {
    const customerId = req.params.id;
    const updated = await pythonBridge.post<{ customer: CustomerAccount; snapshot: DashboardSnapshot }>(
      '/customers/update',
      { ...req.body, customerId }
    );
    res.json(updated);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

apiRouter.delete('/records/:entityType/:id', async (req, res) => {
  try {
    const user = await resolveOptionalUser(req);
    if (user && user.role === 'Specialist' && req.params.entityType !== 'email') {
      res.status(403).json({ error: 'Only Admin or HR Manager can delete CRM/Talent records.' });
      return;
    }
    const updated = await pythonBridge.post<{ snapshot: DashboardSnapshot }>('/records/delete', {
      entityType: req.params.entityType,
      recordId: req.params.id,
    });
    res.json(updated);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// --- 0c. Public Live Inbound Email Webhook (Zapier / Website Contact Form / Mailgun / SendGrid) ---
apiRouter.post('/webhooks/inbound-email', async (req, res) => {
  try {
    const {
      customerEmail,
      from,
      fromEmail,
      email,
      customerName,
      fromName,
      name,
      companyName,
      subject,
      inboundBody,
      text,
      body,
      message,
      autoReply = false,
      skipAiTriage = false,
      language = 'en',
    } = (req.body || {}) as Record<string, unknown>;

    const senderEmail = String(customerEmail || fromEmail || from || email || '').trim();
    const senderName = String(customerName || fromName || name || '').trim();
    const mailSubject = String(subject || 'Website / Webhook Inquiry').trim();
    const mailBody = String(inboundBody || text || body || message || '').trim();

    if (!senderEmail || !mailBody) {
      res.status(400).json({
        error: 'Webhook requires customerEmail (or from/email) and inboundBody (or text/body).',
      });
      return;
    }

    const snapBefore = await pythonBridge.getSnapshot();
    const matchedCust = snapBefore.customers.find(
      (c) => c.contactEmail.toLowerCase() === senderEmail.toLowerCase()
    );

    const created = await pythonBridge.post<{ email: EmailThread; snapshot: DashboardSnapshot }>('/emails', {
      customerId: matchedCust?.id,
      customerEmail: senderEmail,
      customerName: senderName || matchedCust?.contactName || 'Inbound Client',
      companyName: String(companyName || matchedCust?.companyName || senderEmail.split('@')[1] || 'External Client'),
      subject: mailSubject,
      inboundBody: mailBody,
    });

    const callerUser = await resolveOptionalUser(req);

    // If orgSettings.autoTriageWebhook is enabled (and not explicitly skipped), run AI specialist routing + draft automatically
    if (!skipAiTriage && (snapBefore.orgSettings?.autoTriageWebhook || autoReply)) {
      try {
        const { rankings } = await pythonBridge.post<{ rankings: PythonSpecialistRanking[] }>(
          '/emails/rank-specialists',
          { subject: mailSubject, inboundBody: mailBody }
        );
        const aiResult = await analyzeAndDraftEmailReply({
          email: created.email,
          customer: matchedCust,
          employees: created.snapshot.employees,
          pythonRankings: rankings,
          language: language === 'bn' ? 'bn' : 'en',
        });
        const triaged = await pythonBridge.post<{ email: EmailThread; snapshot: DashboardSnapshot }>(
          '/emails/triage-commit',
          {
            emailId: created.email.id,
            aiResult,
            language: language === 'bn' ? 'bn' : 'en',
            autoSend: Boolean(autoReply),
          }
        );
        res.status(201).json({
          ok: true,
          triagedByAi: true,
          emailId: triaged.email.id,
          ...(callerUser ? { email: triaged.email, snapshot: triaged.snapshot } : {}),
        });
        return;
      } catch {
        // Return logged email gracefully even if AI quota is temporarily unavailable
      }
    }

    res.status(201).json({
      ok: true,
      triagedByAi: false,
      emailId: created.email.id,
      ...(callerUser ? { email: created.email, snapshot: created.snapshot } : {}),
    });
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 1. Snapshot (from Python 3.10 + SQLite3 Engine)
apiRouter.get('/snapshot', async (_req, res) => {
  try {
    const snapshot = await pythonBridge.getSnapshot();
    res.json(snapshot);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 1b. Inspect Python Backend Source Files & Runtime Health
apiRouter.get('/python-backend-info', async (_req, res) => {
  try {
    const health = await pythonBridge.get<{ ok: boolean; engine: string }>('/health');
    const pyDir = path.resolve(process.cwd(), 'backend_python');
    const files = ['schema.sql', 'domain_engine.py', 'database.py', 'crm_server.py'];
    const sources: Record<string, string> = {};
    for (const fileName of files) {
      sources[fileName] = await fs.readFile(path.join(pyDir, fileName), 'utf-8');
    }
    res.json({ engine: health.engine, sources });
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 1c. Create Revenue Deal Opportunity
apiRouter.post('/deals', async (req, res) => {
  try {
    const { title } = req.body as Partial<DealOpportunity>;
    if (!title?.trim()) {
      res.status(400).json({ error: 'Deal opportunity title is required.' });
      return;
    }
    const created = await pythonBridge.post<{ deal: DealOpportunity; snapshot: DashboardSnapshot }>(
      '/deals',
      req.body
    );
    res.status(201).json(created);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 1d. Advance / Update Deal Stage (triggers Closed-Won ARR & Payroll Commission in Python)
apiRouter.patch('/deals/:id/stage', async (req, res) => {
  try {
    const dealId = req.params.id;
    const { stage } = req.body as { stage: DealStage };
    const updated = await pythonBridge.post<{ deal: DealOpportunity; snapshot: DashboardSnapshot }>(
      '/deals/stage',
      { dealId, stage }
    );
    res.json(updated);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 1e. Generate AI Deal Win-Strategy Coaching
apiRouter.post('/deals/:id/ai-coaching', async (req, res) => {
  try {
    const dealId = req.params.id;
    const { language = 'en' } = (req.body || {}) as { language?: LanguageCode };
    const current = await pythonBridge.getSnapshot();
    const deal = current.deals.find((d) => d.id === dealId);
    if (!deal) {
      res.status(404).json({ error: 'Deal opportunity not found.' });
      return;
    }
    const customer = deal.customerId ? current.customers.find((c) => c.id === deal.customerId) : undefined;
    const owner = current.employees.find((e) => e.id === deal.ownerEmployeeId);

    const coaching = await generateDealWinCoaching({
      deal,
      customer,
      owner,
      language: language === 'bn' ? 'bn' : 'en',
    });

    const updated = await pythonBridge.post<{ deal: DealOpportunity; snapshot: DashboardSnapshot }>(
      '/deals/coaching-commit',
      { dealId, coaching }
    );
    res.json(updated);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 1f. Submit Employee Leave Request
apiRouter.post('/leaves', async (req, res) => {
  try {
    const { employeeId } = req.body as Partial<LeaveRequest>;
    if (!employeeId) {
      res.status(400).json({ error: 'employeeId is required.' });
      return;
    }
    const created = await pythonBridge.post<{ snapshot: DashboardSnapshot }>('/leaves', req.body);
    res.status(201).json(created);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 1g. Approve / Decline Leave Request (auto-assigns Backup SLA Specialist in Python)
apiRouter.post('/leaves/:id/review', async (req, res) => {
  try {
    const user = await resolveOptionalUser(req);
    if (user && user.role === 'Specialist') {
      res.status(403).json({ error: 'Only Admin or HR Manager can approve/decline leave requests.' });
      return;
    }
    const leaveId = req.params.id;
    const { decision } = req.body as { decision: 'Approved' | 'Declined' };
    const updated = await pythonBridge.post<{ snapshot: DashboardSnapshot }>('/leaves/review', {
      leaveId,
      decision,
    });
    res.json(updated);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 1h. Toggle Autonomous Workflow Rule
apiRouter.post('/workflows/:id/toggle', async (req, res) => {
  try {
    const ruleId = req.params.id;
    const updated = await pythonBridge.post<{ snapshot: DashboardSnapshot }>('/workflows/toggle', {
      ruleId,
    });
    res.json(updated);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 1i. Execute Autonomous Python Ops Sweep
apiRouter.post('/workflows/run-sweep', async (_req, res) => {
  try {
    const result = await pythonBridge.post<{
      summary: string;
      actionsCount: number;
      snapshot: DashboardSnapshot;
    }>('/workflows/run-sweep', {});
    res.json(result);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 2. Log New Inbound Email in Python SQLite
apiRouter.post('/emails', async (req, res) => {
  try {
    const { customerEmail, subject, inboundBody } = req.body as Partial<EmailThread>;
    if (!subject?.trim() || !inboundBody?.trim() || !customerEmail?.trim()) {
      res.status(400).json({ error: 'Customer email, subject, and message body are required.' });
      return;
    }
    const created = await pythonBridge.post<{ email: EmailThread; snapshot: DashboardSnapshot }>('/emails', req.body);
    res.status(201).json(created);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 3. Python Specialist Scoring + Gemini 3.8 Auto-Reply Synthesis
apiRouter.post('/emails/:id/ai-triage', async (req, res) => {
  try {
    const emailId = req.params.id;
    const { language = 'en', autoSend = false } = req.body as { language?: LanguageCode; autoSend?: boolean };
    const current = await pythonBridge.getSnapshot();
    const targetEmail = current.emails.find((e) => e.id === emailId);
    if (!targetEmail) {
      res.status(404).json({ error: 'Email thread not found.' });
      return;
    }

    const { rankings } = await pythonBridge.post<{ rankings: PythonSpecialistRanking[] }>(
      '/emails/rank-specialists',
      { subject: targetEmail.subject, inboundBody: targetEmail.inboundBody }
    );

    const customer = current.customers.find((c) => c.id === targetEmail.customerId);
    const aiResult = await analyzeAndDraftEmailReply({
      email: targetEmail,
      customer,
      employees: current.employees,
      pythonRankings: rankings,
      language: language === 'bn' ? 'bn' : 'en',
    });

    const committed = await pythonBridge.post<{ email: EmailThread; snapshot: DashboardSnapshot }>(
      '/emails/triage-commit',
      {
        emailId,
        aiResult,
        language: language === 'bn' ? 'bn' : 'en',
        autoSend,
      }
    );

    res.json(committed);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 4. Send Verified Email Reply via Python Service
apiRouter.post('/emails/:id/send', async (req, res) => {
  try {
    const emailId = req.params.id;
    const { replyBody, assignedEmployeeId } = req.body as { replyBody?: string; assignedEmployeeId?: string };
    if (!replyBody?.trim()) {
      res.status(400).json({ error: 'Reply message body cannot be empty.' });
      return;
    }
    const committed = await pythonBridge.post<{ email: EmailThread; snapshot: DashboardSnapshot }>('/emails/send', {
      emailId,
      replyBody,
      assignedEmployeeId,
    });
    res.json(committed);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 5. Add Candidate in Python SQLite
apiRouter.post('/candidates', async (req, res) => {
  try {
    const { name, email, role } = req.body as { name?: string; email?: string; role?: string };
    if (!name?.trim() || !email?.trim() || !role?.trim()) {
      res.status(400).json({ error: 'Candidate name, email, and target role are required.' });
      return;
    }
    const created = await pythonBridge.post<{ candidate: CandidateProfile; snapshot: DashboardSnapshot }>(
      '/candidates',
      req.body
    );
    res.status(201).json(created);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 6. Generate Next AI Interview Question & Persist in Python SQLite
apiRouter.post('/candidates/:id/ask-question', async (req, res) => {
  try {
    const candId = req.params.id;
    const { language = 'en' } = req.body as { language?: LanguageCode };
    const current = await pythonBridge.getSnapshot();
    const candidate = current.candidates.find((c) => c.id === candId);
    if (!candidate) {
      res.status(404).json({ error: 'Candidate not found.' });
      return;
    }

    const generated = await generateNextInterviewQuestion({
      candidate,
      language: language === 'bn' ? 'bn' : 'en',
    });

    const updated = await pythonBridge.post<{ candidate: CandidateProfile; snapshot: DashboardSnapshot }>(
      '/candidates/turn',
      {
        candidateId: candId,
        speaker: 'interviewer',
        content: generated.question,
        competencyFocus: generated.competencyFocus,
      }
    );

    res.json(updated);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 7. Submit Candidate Interview Answer in Python SQLite
apiRouter.post('/candidates/:id/answer', async (req, res) => {
  try {
    const candId = req.params.id;
    const { answer } = req.body as { answer?: string };
    if (!answer?.trim()) {
      res.status(400).json({ error: 'Candidate response cannot be empty.' });
      return;
    }

    const updated = await pythonBridge.post<{ candidate: CandidateProfile; snapshot: DashboardSnapshot }>(
      '/candidates/turn',
      {
        candidateId: candId,
        speaker: 'candidate',
        content: answer.trim(),
      }
    );

    res.json(updated);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 8. Run AI Selection Rubric Evaluation & Commit to Python SQLite
apiRouter.post('/candidates/:id/evaluate', async (req, res) => {
  try {
    const candId = req.params.id;
    const { language = 'en' } = req.body as { language?: LanguageCode };
    const current = await pythonBridge.getSnapshot();
    const candidate = current.candidates.find((c) => c.id === candId);
    if (!candidate) {
      res.status(404).json({ error: 'Candidate not found.' });
      return;
    }

    const evaluation = await evaluateCandidateInterview({
      candidate,
      language: language === 'bn' ? 'bn' : 'en',
    });

    const updated = await pythonBridge.post<{ candidate: CandidateProfile; snapshot: DashboardSnapshot }>(
      '/candidates/evaluate-commit',
      { candidateId: candId, evaluation }
    );

    res.json(updated);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 9. Select & Hire Candidate into Python SQLite Employee Roster (with Salary & Status)
apiRouter.post('/candidates/:id/hire', async (req, res) => {
  try {
    const user = await resolveOptionalUser(req);
    if (user && user.role === 'Specialist') {
      res.status(403).json({ error: 'Only Admin or HR Manager can finalize hiring & salary enrollment.' });
      return;
    }
    const candId = req.params.id;
    const { baseSalaryUsd = 5200, employmentStatus = 'Probation' } = (req.body || {}) as {
      baseSalaryUsd?: number;
      employmentStatus?: EmploymentStatus;
    };
    const hired = await pythonBridge.post<{
      candidate: CandidateProfile;
      employee?: EmployeeRecord;
      snapshot: DashboardSnapshot;
    }>('/candidates/hire', { candidateId: candId, baseSalaryUsd, employmentStatus });
    res.json(hired);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 9b. Direct Hire Employee (HR & Payroll)
apiRouter.post('/employees', async (req, res) => {
  try {
    const user = await resolveOptionalUser(req);
    if (user && user.role === 'Specialist') {
      res.status(403).json({ error: 'Only Admin or HR Manager can hire employees into payroll.' });
      return;
    }
    const { name, email, role } = req.body as { name?: string; email?: string; role?: string };
    if (!name?.trim() || !email?.trim() || !role?.trim()) {
      res.status(400).json({ error: 'Employee name, email, and role are required.' });
      return;
    }
    const created = await pythonBridge.post<{ employee: EmployeeRecord; snapshot: DashboardSnapshot }>(
      '/employees/direct-hire',
      req.body
    );
    res.status(201).json(created);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 9c. Update Employee Salary & Bonus
apiRouter.patch('/employees/:id/compensation', async (req, res) => {
  try {
    const user = await resolveOptionalUser(req);
    if (user && user.role === 'Specialist') {
      res.status(403).json({ error: 'Only Admin or HR Manager can adjust compensation.' });
      return;
    }
    const employeeId = req.params.id;
    const { baseSalaryUsd, performanceBonusUsd, employmentStatus } = req.body as {
      baseSalaryUsd: number;
      performanceBonusUsd: number;
      employmentStatus?: EmploymentStatus;
    };
    const updated = await pythonBridge.post<{ employee: EmployeeRecord; snapshot: DashboardSnapshot }>(
      '/employees/compensation',
      { employeeId, baseSalaryUsd, performanceBonusUsd, employmentStatus }
    );
    res.json(updated);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 9d. Offboard / Terminate Employee with Automatic Account Handover
apiRouter.post('/employees/:id/offboard', async (req, res) => {
  try {
    const user = await resolveOptionalUser(req);
    if (user && user.role === 'Specialist') {
      res.status(403).json({ error: 'Only Admin or HR Manager can execute employee offboarding.' });
      return;
    }
    const employeeId = req.params.id;
    const { reason = 'Performance / Restructuring', handoverEmployeeId } = (req.body || {}) as {
      reason?: string;
      handoverEmployeeId?: string;
    };
    const updated = await pythonBridge.post<{ employee: EmployeeRecord; snapshot: DashboardSnapshot }>(
      '/employees/offboard',
      { employeeId, reason, handoverEmployeeId }
    );
    res.json(updated);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 9e. Reinstate Offboarded Employee
apiRouter.post('/employees/:id/reinstate', async (req, res) => {
  try {
    const user = await resolveOptionalUser(req);
    if (user && user.role === 'Specialist') {
      res.status(403).json({ error: 'Only Admin or HR Manager can reinstate employees.' });
      return;
    }
    const employeeId = req.params.id;
    const updated = await pythonBridge.post<{ employee: EmployeeRecord; snapshot: DashboardSnapshot }>(
      '/employees/reinstate',
      { employeeId }
    );
    res.json(updated);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 9f. AI Employee Compensation & Performance Audit
apiRouter.post('/employees/:id/comp-review', async (req, res) => {
  try {
    const empId = req.params.id;
    const { language = 'en' } = (req.body || {}) as { language?: LanguageCode };
    const current = await pythonBridge.getSnapshot();
    const employee = current.employees.find((e) => e.id === empId);
    if (!employee) {
      res.status(404).json({ error: 'Employee not found.' });
      return;
    }
    const assignedCustomers = current.customers.filter((c) => c.assignedEmployeeId === empId);
    const review = await evaluateEmployeeCompensationAndStanding({
      employee,
      assignedCustomers,
      language: language === 'bn' ? 'bn' : 'en',
    });
    const updated = await pythonBridge.post<{ employee: EmployeeRecord; snapshot: DashboardSnapshot }>(
      '/employees/comp-review-commit',
      { employeeId: empId, review }
    );
    res.json(updated);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 9g. Generate Monthly Payroll Batch via Python KPI Engine
apiRouter.post('/payroll/generate', async (req, res) => {
  try {
    const user = await resolveOptionalUser(req);
    if (user && user.role === 'Specialist') {
      res.status(403).json({ error: 'Only Admin or HR Manager can generate payroll batches.' });
      return;
    }
    const { periodMonth = '2026-11' } = (req.body || {}) as { periodMonth?: string };
    const generated = await pythonBridge.post<{ snapshot: DashboardSnapshot }>('/payroll/generate', {
      periodMonth,
    });
    res.json(generated);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 9h. Disburse Single Payslip or Full Monthly Payroll Batch
apiRouter.post('/payroll/disburse', async (req, res) => {
  try {
    const user = await resolveOptionalUser(req);
    if (user && user.role === 'Specialist') {
      res.status(403).json({ error: 'Only Admin or HR Manager can disburse salaries.' });
      return;
    }
    const { payrollId, periodMonth } = (req.body || {}) as { payrollId?: string; periodMonth?: string };
    const disbursed = await pythonBridge.post<{ snapshot: DashboardSnapshot }>('/payroll/disburse', {
      payrollId,
      periodMonth,
    });
    res.json(disbursed);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 10. Create New Customer Account in Python SQLite
apiRouter.post('/customers', async (req, res) => {
  try {
    const { companyName, contactName, contactEmail } = req.body as Partial<CustomerAccount>;
    if (!companyName?.trim() || !contactName?.trim() || !contactEmail?.trim()) {
      res.status(400).json({ error: 'Company name, contact name, and contact email are required.' });
      return;
    }
    const created = await pythonBridge.post<{ customer: CustomerAccount; snapshot: DashboardSnapshot }>(
      '/customers',
      req.body
    );
    res.status(201).json(created);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 11. Reassign Customer Owner in Python SQLite
apiRouter.patch('/customers/:id/assign', async (req, res) => {
  try {
    const custId = req.params.id;
    const { assignedEmployeeId } = req.body as { assignedEmployeeId?: string };
    if (!assignedEmployeeId) {
      res.status(400).json({ error: 'assignedEmployeeId is required.' });
      return;
    }
    const updated = await pythonBridge.post<{ customer: CustomerAccount; snapshot: DashboardSnapshot }>(
      '/customers/assign',
      { customerId: custId, assignedEmployeeId }
    );
    res.json(updated);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 12. Generate AI Customer Retention Playbook & Store in Python SQLite
apiRouter.post('/customers/:id/retention-plan', async (req, res) => {
  try {
    const custId = req.params.id;
    const { language = 'en' } = req.body as { language?: LanguageCode };
    const current = await pythonBridge.getSnapshot();
    const customer = current.customers.find((c) => c.id === custId);
    if (!customer) {
      res.status(404).json({ error: 'Customer not found.' });
      return;
    }

    const recentEmails = current.emails.filter((e) => e.customerId === custId);
    const assignedEmployee = current.employees.find((e) => e.id === customer.assignedEmployeeId);

    const plan = await generateCustomerRetentionPlaybook({
      customer,
      recentEmails,
      assignedEmployee,
      language: language === 'bn' ? 'bn' : 'en',
    });

    const updated = await pythonBridge.post<{ customer: CustomerAccount; snapshot: DashboardSnapshot }>(
      '/customers/retention-commit',
      { customerId: custId, plan }
    );
    res.json(updated);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 13. Execute Retention Intervention in Python SQLite
apiRouter.post('/customers/:id/execute-retention', async (req, res) => {
  try {
    const custId = req.params.id;
    const updated = await pythonBridge.post<{ customer: CustomerAccount; snapshot: DashboardSnapshot }>(
      '/customers/execute-retention',
      { customerId: custId }
    );
    res.json(updated);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});

// 14. Generate AI Employee Longevity Plan & Store in Python SQLite
apiRouter.post('/employees/:id/longevity-plan', async (req, res) => {
  try {
    const empId = req.params.id;
    const { language = 'en' } = req.body as { language?: LanguageCode };
    const current = await pythonBridge.getSnapshot();
    const employee = current.employees.find((e) => e.id === empId);
    if (!employee) {
      res.status(404).json({ error: 'Employee not found.' });
      return;
    }

    const assignedCustomers = current.customers.filter((c) => c.assignedEmployeeId === empId);
    const plan = await generateEmployeeLongevityPlan({
      employee,
      assignedCustomers,
      language: language === 'bn' ? 'bn' : 'en',
    });

    const updated = await pythonBridge.post<{ employee: EmployeeRecord; snapshot: DashboardSnapshot }>(
      '/employees/longevity-commit',
      { employeeId: empId, plan }
    );
    res.json(updated);
  } catch (err) {
    const { status, message } = formatErrorMessage(err);
    res.status(status).json({ error: message });
  }
});
