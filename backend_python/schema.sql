PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS org_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    company_name TEXT NOT NULL DEFAULT 'Aetheris CRM',
    company_domain TEXT NOT NULL DEFAULT 'aetheris.io',
    support_email TEXT NOT NULL DEFAULT 'support@aetheris.io',
    company_address TEXT NOT NULL DEFAULT 'Gulshan-2 Avenue, Dhaka 1212 / Global Cloud',
    currency_code TEXT NOT NULL DEFAULT 'USD',
    currency_symbol TEXT NOT NULL DEFAULT '$',
    default_tax_rate_pct REAL NOT NULL DEFAULT 10.0,
    sla_target_hours INTEGER NOT NULL DEFAULT 4,
    auto_triage_webhook INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS app_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Admin',
    title TEXT NOT NULL DEFAULT 'Executive Administrator',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL,
    skills_json TEXT NOT NULL,
    employment_status TEXT NOT NULL DEFAULT 'Active',
    base_salary_usd INTEGER NOT NULL DEFAULT 4800,
    performance_bonus_usd INTEGER NOT NULL DEFAULT 450,
    tax_deduction_usd INTEGER NOT NULL DEFAULT 380,
    attendance_rate_pct REAL NOT NULL DEFAULT 98.5,
    last_paid_period TEXT,
    offboard_reason TEXT,
    offboarded_at TEXT,
    active_accounts_count INTEGER NOT NULL DEFAULT 0,
    max_capacity INTEGER NOT NULL DEFAULT 5,
    csat_score REAL NOT NULL DEFAULT 95.0,
    retention_score INTEGER NOT NULL DEFAULT 92,
    burnout_risk TEXT NOT NULL DEFAULT 'Low',
    tenure_months INTEGER NOT NULL DEFAULT 1,
    career_track TEXT NOT NULL,
    joined_at TEXT NOT NULL,
    hired_from_candidate_id TEXT,
    avatar_key TEXT,
    longevity_plan_json TEXT,
    comp_review_json TEXT
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    leave_type TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    days_count INTEGER NOT NULL DEFAULT 1,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    backup_employee_id TEXT,
    backup_employee_name TEXT
);

CREATE TABLE IF NOT EXISTS payroll_records (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL,
    period_month TEXT NOT NULL,
    base_salary_usd INTEGER NOT NULL,
    performance_bonus_usd INTEGER NOT NULL,
    tax_deduction_usd INTEGER NOT NULL,
    net_pay_usd INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    disbursed_at TEXT
);

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    industry TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    arr_usd INTEGER NOT NULL,
    health_score INTEGER NOT NULL,
    nps_score INTEGER NOT NULL,
    active_seats_ratio REAL NOT NULL,
    churn_risk TEXT NOT NULL,
    renewal_date TEXT NOT NULL,
    assigned_employee_id TEXT NOT NULL,
    last_contact_at TEXT NOT NULL,
    tenure_months INTEGER NOT NULL DEFAULT 1,
    avatar_key TEXT,
    notes TEXT NOT NULL,
    retention_plan_json TEXT
);

CREATE TABLE IF NOT EXISTS deals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    company_name TEXT NOT NULL,
    customer_id TEXT,
    deal_type TEXT NOT NULL,
    stage TEXT NOT NULL,
    value_usd INTEGER NOT NULL,
    win_probability INTEGER NOT NULL,
    expected_close_date TEXT NOT NULL,
    owner_employee_id TEXT NOT NULL,
    notes TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    ai_coaching_json TEXT
);

CREATE TABLE IF NOT EXISTS emails (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    inbound_body TEXT NOT NULL,
    received_at TEXT NOT NULL,
    category TEXT NOT NULL,
    sentiment TEXT NOT NULL,
    urgency TEXT NOT NULL,
    status TEXT NOT NULL,
    assigned_employee_id TEXT,
    ai_routing_reason TEXT,
    ai_draft_reply TEXT,
    ai_draft_language TEXT,
    sent_reply TEXT,
    replied_at TEXT,
    smtp_delivery_status TEXT
);

CREATE TABLE IF NOT EXISTS candidates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL,
    experience_years INTEGER NOT NULL,
    skills_json TEXT NOT NULL,
    resume_summary TEXT NOT NULL,
    stage TEXT NOT NULL,
    applied_at TEXT NOT NULL,
    avatar_key TEXT,
    interview_transcript_json TEXT NOT NULL,
    evaluation_json TEXT
);

CREATE TABLE IF NOT EXISTS automation_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    bn_name TEXT NOT NULL,
    trigger_condition TEXT NOT NULL,
    automated_action TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    executions_count INTEGER NOT NULL DEFAULT 0,
    last_triggered_at TEXT
);

CREATE TABLE IF NOT EXISTS domain_events (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    module TEXT NOT NULL,
    event_type TEXT NOT NULL,
    summary TEXT NOT NULL,
    actor TEXT NOT NULL
);
