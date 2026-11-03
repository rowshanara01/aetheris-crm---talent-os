"""
Aetheris CRM & Talent OS — SQLite3 Relational Persistence Layer (Python 3).
Manages ACID transactions across employees, leave_requests, payroll_records,
customers, deals, emails, candidates, automation_rules, and domain_events.
"""

from __future__ import annotations
import csv
import io
import json
import os
import secrets
import sqlite3
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from domain_engine import (
    STAGE_DEFAULT_PROBABILITY,
    calculate_deal_commission,
    calculate_kpi_bonus_and_tax,
    compute_burnout_risk,
    compute_churn_risk,
    hash_password_pbkdf2,
    is_smtp_configured,
    select_handover_specialist,
    try_dispatch_smtp_email,
    verify_password_pbkdf2,
)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get("SQLITE_DATA_DIR") or (BASE_DIR / "data")).resolve()
DB_PATH = DATA_DIR / "aetheris_python.sqlite3"
SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"

COHORTS = [
    {"periodLabel": "Month 1", "customerRetentionPct": 99.2, "employeeRetentionPct": 100.0, "platformAdoptionPct": 94.0},
    {"periodLabel": "Month 3", "customerRetentionPct": 97.5, "employeeRetentionPct": 98.4, "platformAdoptionPct": 91.8},
    {"periodLabel": "Month 6", "customerRetentionPct": 95.8, "employeeRetentionPct": 96.5, "platformAdoptionPct": 90.4},
    {"periodLabel": "Month 12", "customerRetentionPct": 94.1, "employeeRetentionPct": 95.2, "platformAdoptionPct": 89.6},
    {"periodLabel": "Month 24", "customerRetentionPct": 92.7, "employeeRetentionPct": 93.8, "platformAdoptionPct": 88.9},
    {"periodLabel": "Month 36", "customerRetentionPct": 91.9, "employeeRetentionPct": 92.6, "platformAdoptionPct": 88.5},
]

ARCHITECTURE_LAYERS = [
    {
        "id": "layer-presentation",
        "order": "01",
        "name": "Client Workspace, Deal War-Room & Bilingual UI",
        "bengaliSummary": "রিয়েল-টাইম এন্টারপ্রাইজ ড্যাশবোর্ড, রেভিনিউ পাইপলাইন, ইনবক্স ট্রায়াজ, লাইভ ইন্টারভিউ, নিয়োগ-ছাঁটাই, ছুটি ও বেতন ইন্টারফেস।",
        "responsibility": "Renders modular CRM, Revenue Pipeline, Autonomous Workflows, AI Interviewer, and HR & Payroll views.",
        "components": ["React 19 Modular Views", "Kanban Deal & Commission Pipeline", "Global Workspace Search", "HR, Leave & Payroll Ledger"],
        "designPattern": "Unidirectional Snapshot State + Command Dispatch",
        "resilienceGuarantee": "Zero API secrets in client bundle, accessible focus rings, and instant cross-module search.",
    },
    {
        "id": "layer-gateway",
        "order": "02",
        "name": "API Gateway & AI Proxy Layer",
        "bengaliSummary": "সার্ভার-সাইড রাউটিং, ইনপুট ভ্যালিডেশন এবং Python ব্যাকএন্ড ব্রিজ লেয়ার।",
        "responsibility": "Bridges browser requests to the Python 3.10 microservice and executes schema-constrained server-side Gemini 3.8 reasoning.",
        "components": ["REST Reverse Proxy", "Python Process Supervisor", "Gemini 3.8 JSON Schema Orchestrator", "Error Boundary Formatter"],
        "designPattern": "API Gateway + Supervised Python Sidecar",
        "resilienceGuarantee": "Automatic health-probing and clean process lifecycle management of the Python 3.10 service.",
    },
    {
        "id": "layer-python-domain",
        "order": "03",
        "name": "Python 3.10 Revenue, HR, Payroll & Autonomous Ops Engine",
        "bengaliSummary": "পাইথন (Python 3.10) ভিত্তিক ডিল কমিশন, এমপ্লয়ি ম্যাচিং, ছুটি ব্যাকআপ হ্যান্ডওভার, ছাঁটাই ও অটোনোমাস ওয়ার্কফ্লো ইঞ্জিন।",
        "responsibility": "Executes specialist matching, Closed-Won ARR + payroll commission settlement, leave SLA backup, and autonomous ops sweeps in Python.",
        "components": ["backend_python/crm_server.py", "backend_python/domain_engine.py", "Deal-to-Payroll Commission Engine", "Autonomous Ops Sweep"],
        "designPattern": "Python Domain-Driven Service Layer",
        "resilienceGuarantee": "Closing deals, approving leave, or offboarding staff atomically updates ARR, backup owners, and payslips.",
    },
    {
        "id": "layer-ai",
        "order": "04",
        "name": "Structured AI Auto-Reply, Deal Coach, Interview & Comp Committee",
        "bengaliSummary": "স্কিমা-নিয়ন্ত্রিত AI রিজনিং ইঞ্জিন যা অটো-রিপ্লাই, ডিল উইন-স্ট্র্যাটেজি, ইন্টারভিউ মূল্যায়ন ও বেতন অডিট তৈরি করে।",
        "responsibility": "Combines Python domain metrics with Gemini 3.8 structured JSON schemas for auto-replies, deal coaching, interviews, and HR audits.",
        "components": ["Bilingual Auto-Reply Synthesizer", "AI Deal Win-Strategy Coach", "4-Axis Hiring Rubric Evaluator", "AI Compensation & Performance Auditor"],
        "designPattern": "Hybrid Python Scoring + Structured LLM Generation",
        "resilienceGuarantee": "Strict JSON response schemas prevent malformed outputs from entering SQLite tables.",
    },
    {
        "id": "layer-sqlite",
        "order": "05",
        "name": "Python SQLite3 (WAL) Relational Database",
        "bengaliSummary": "Python sqlite3 এবং Write-Ahead Logging (WAL) রিলেশনাল ডাটাবেস যা সকল রেকর্ড সুরক্ষিত রাখে।",
        "responsibility": "Persists 9 normalized relational tables (employees, leave_requests, payroll_records, customers, deals, emails, candidates, automation_rules, domain_events).",
        "components": ["backend_python/database.py", "backend_python/schema.sql", "SQLite3 WAL Engine", "Immutable Audit Event Table"],
        "designPattern": "Repository Pattern + Parameterized SQL Transactions",
        "resilienceGuarantee": "Parameterized SQL prevents injection; non-destructive migrations preserve live data across upgrades.",
    },
]


def utc_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def today_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


class SQLiteCRMRepository:
    def __init__(self, db_path: Path = DB_PATH) -> None:
        self.db_path = db_path
        self._lock = threading.RLock()
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        self._initialize_schema_and_seed()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _run_migrations(self, conn: sqlite3.Connection) -> None:
        existing_cols = {
            row["name"] for row in conn.execute("PRAGMA table_info(employees)").fetchall()
        }
        migrations = [
            ("employment_status", "TEXT NOT NULL DEFAULT 'Active'"),
            ("base_salary_usd", "INTEGER NOT NULL DEFAULT 5200"),
            ("performance_bonus_usd", "INTEGER NOT NULL DEFAULT 600"),
            ("tax_deduction_usd", "INTEGER NOT NULL DEFAULT 480"),
            ("attendance_rate_pct", "REAL NOT NULL DEFAULT 98.5"),
            ("last_paid_period", "TEXT"),
            ("offboard_reason", "TEXT"),
            ("offboarded_at", "TEXT"),
            ("comp_review_json", "TEXT"),
        ]
        for col_name, col_def in migrations:
            if col_name not in existing_cols:
                conn.execute(f"ALTER TABLE employees ADD COLUMN {col_name} {col_def}")

        email_cols = {
            row["name"] for row in conn.execute("PRAGMA table_info(emails)").fetchall()
        }
        if "smtp_delivery_status" not in email_cols:
            conn.execute("ALTER TABLE emails ADD COLUMN smtp_delivery_status TEXT")

        conn.execute(
            "UPDATE employees SET base_salary_usd = 6400, performance_bonus_usd = 890, tax_deduction_usd = 729, attendance_rate_pct = 99.2, last_paid_period = '2026-10' WHERE id = 'emp-101' AND last_paid_period IS NULL"
        )
        conn.execute(
            "UPDATE employees SET base_salary_usd = 5600, performance_bonus_usd = 502, tax_deduction_usd = 610, attendance_rate_pct = 97.4, last_paid_period = '2026-10' WHERE id = 'emp-102' AND last_paid_period IS NULL"
        )
        conn.execute(
            "UPDATE employees SET base_salary_usd = 6100, performance_bonus_usd = 810, tax_deduction_usd = 691, attendance_rate_pct = 98.9, last_paid_period = '2026-10' WHERE id = 'emp-103' AND last_paid_period IS NULL"
        )

    def _seed_org_and_users_if_empty(self, conn: sqlite3.Connection) -> None:
        org_cnt = conn.execute("SELECT COUNT(*) AS c FROM org_settings").fetchone()["c"]
        if org_cnt == 0:
            conn.execute(
                """
                INSERT INTO org_settings (
                    id, company_name, company_domain, support_email, company_address,
                    currency_code, currency_symbol, default_tax_rate_pct, sla_target_hours, auto_triage_webhook
                ) VALUES (
                    1, 'Aetheris CRM', 'aetheris.io', 'support@aetheris.io',
                    'Gulshan-2 Avenue, Dhaka 1212 · Global Enterprise Cloud',
                    'USD', '$', 10.0, 4, 1
                )
                """
            )

        usr_cnt = conn.execute("SELECT COUNT(*) AS c FROM app_users").fetchone()["c"]
        env_admin_name = (os.environ.get("INITIAL_ADMIN_NAME") or "").strip()
        env_admin_email = (os.environ.get("INITIAL_ADMIN_EMAIL") or "").strip().lower()
        env_admin_pw = os.environ.get("INITIAL_ADMIN_PASSWORD") or ""
        if usr_cnt == 0:
            now = utc_iso()
            init_admin_name = env_admin_name or "Nusrat Jahan"
            init_admin_email = env_admin_email or "admin@aetheris.io"
            init_admin_pw = env_admin_pw or "Aetheris2026!"
            default_accounts = [
                ("usr-admin", init_admin_name, init_admin_email, "Admin", "Founder & System Administrator", init_admin_pw),
                ("usr-hr", "Tariqul Islam", "hr@aetheris.io", "HRManager", "Head of People & Payroll", "Aetheris2026!"),
                ("usr-spec", "Tanvir Rahman", "specialist@aetheris.io", "Specialist", "Senior Solutions Specialist", "Aetheris2026!"),
            ]
            for uid, name, email, role, title, raw_pw in default_accounts:
                pw_hash, salt = hash_password_pbkdf2(raw_pw)
                conn.execute(
                    """
                    INSERT INTO app_users (id, name, email, password_hash, salt, role, title, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (uid, name, email, pw_hash, salt, role, title, now),
                )
        elif env_admin_email and len(env_admin_pw) >= 6:
            # Ensure container deployments (Hugging Face Secrets / Render Env) always keep primary Admin in sync
            pw_hash, salt = hash_password_pbkdf2(env_admin_pw)
            conn.execute(
                """
                UPDATE app_users
                SET name = COALESCE(NULLIF(?, ''), name),
                    email = ?,
                    password_hash = ?,
                    salt = ?,
                    role = 'Admin'
                WHERE id = 'usr-admin'
                """,
                (env_admin_name, env_admin_email, pw_hash, salt),
            )

    def _seed_payroll_if_empty(self, conn: sqlite3.Connection) -> None:
        cnt = conn.execute("SELECT COUNT(*) AS c FROM payroll_records").fetchone()["c"]
        if cnt > 0:
            return
        emp_rows = conn.execute("SELECT * FROM employees WHERE employment_status != 'Offboarded'").fetchall()
        records = []
        for idx, emp in enumerate(emp_rows):
            base = int(emp["base_salary_usd"])
            bonus = int(emp["performance_bonus_usd"])
            tax = int(emp["tax_deduction_usd"])
            net_pay = max(0, base + bonus - tax)
            records.append(
                (
                    f"pay-oct-{idx + 1}",
                    emp["id"],
                    emp["name"],
                    emp["role"],
                    emp["department"],
                    "2026-10",
                    base,
                    bonus,
                    tax,
                    net_pay,
                    "Disbursed",
                    "2026-10-30T16:00:00Z",
                )
            )
            records.append(
                (
                    f"pay-nov-{idx + 1}",
                    emp["id"],
                    emp["name"],
                    emp["role"],
                    emp["department"],
                    "2026-11",
                    base,
                    bonus,
                    tax,
                    net_pay,
                    "Pending",
                    None,
                )
            )
        conn.executemany(
            """
            INSERT INTO payroll_records (
                id, employee_id, employee_name, role, department, period_month,
                base_salary_usd, performance_bonus_usd, tax_deduction_usd, net_pay_usd, status, disbursed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            records,
        )

    def _seed_deals_if_empty(self, conn: sqlite3.Connection) -> None:
        cnt = conn.execute("SELECT COUNT(*) AS c FROM deals").fetchone()["c"]
        if cnt > 0:
            return
        deals = [
            (
                "deal-601",
                "Nordic Freight — Gothenburg Terminal 120-Seat Expansion",
                "Nordic Freight & Port Systems",
                "cust-202",
                "Seat Expansion",
                "Contract Negotiation",
                94000,
                85,
                "2026-11-22",
                "emp-103",
                "36-month volume price-lock agreement for 120 port terminal operators across Gothenburg and Malmo.",
                utc_iso(),
                None,
            ),
            (
                "deal-602",
                "Meghna FinTech — Dedicated Settlement Partition & FY27 Renewal",
                "Meghna FinTech Ltd.",
                "cust-201",
                "Multi-Year Renewal",
                "Technical Validation",
                148000,
                55,
                "2026-12-12",
                "emp-102",
                "Board renewal contingent on dedicated Python async webhook worker isolation and 99.95% SLA addendum.",
                utc_iso(),
                None,
            ),
            (
                "deal-603",
                "Pragati Retail — Chittagong Regional Store Rollout (+40 Managers)",
                "Pragati Retail Commerce",
                "cust-203",
                "Seat Expansion",
                "Executive Proposal",
                42000,
                72,
                "2026-11-28",
                "emp-101",
                "Includes Bengali-first store manager enablement workshops and automated inventory alert connectors.",
                utc_iso(),
                None,
            ),
            (
                "deal-604",
                "Padma Telecom Cloud — Enterprise Omnichannel CRM Suite",
                "Padma Telecom Cloud",
                None,
                "New Enterprise Logo",
                "Discovery",
                185000,
                35,
                "2027-01-15",
                "emp-103",
                "Net-new telco enterprise evaluating AI email routing and bilingual SLA management for 260 agents.",
                utc_iso(),
                None,
            ),
        ]
        conn.executemany(
            """
            INSERT INTO deals (
                id, title, company_name, customer_id, deal_type, stage,
                value_usd, win_probability, expected_close_date, owner_employee_id, notes, updated_at, ai_coaching_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            deals,
        )

    def _seed_leaves_if_empty(self, conn: sqlite3.Connection) -> None:
        cnt = conn.execute("SELECT COUNT(*) AS c FROM leave_requests").fetchone()["c"]
        if cnt > 0:
            return
        leaves = [
            (
                "lv-701",
                "emp-102",
                "Tanvir Rahman",
                "AnnualPaid",
                "2026-11-18",
                "2026-11-20",
                3,
                "Family wedding in Sylhet — webhook runbooks documented for backup engineer.",
                "Pending",
                None,
                None,
            ),
            (
                "lv-702",
                "emp-101",
                "Nusrat Jahan",
                "MedicalPaid",
                "2026-10-14",
                "2026-10-15",
                2,
                "Scheduled dental procedure; enterprise escalations covered seamlessly.",
                "Approved",
                "emp-103",
                "Elena Rostova",
            ),
        ]
        conn.executemany(
            """
            INSERT INTO leave_requests (
                id, employee_id, employee_name, leave_type, start_date, end_date,
                days_count, reason, status, backup_employee_id, backup_employee_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            leaves,
        )

    def _seed_automation_rules_if_empty(self, conn: sqlite3.Connection) -> None:
        cnt = conn.execute("SELECT COUNT(*) AS c FROM automation_rules").fetchone()["c"]
        if cnt > 0:
            return
        rules = [
            (
                "rule-801",
                "Renewal Risk Deal Auto-Generator",
                "ঝুঁকিপূর্ণ অ্যাকাউন্টের অটো-রিনিউয়াল ডিল তৈরি",
                "Customer Churn Risk is High or Moderate with no open Renewal Deal",
                "Automatically opens a tracked Multi-Year Renewal opportunity in Revenue Pipeline",
                1,
                2,
                "2026-10-31T14:00:00Z",
            ),
            (
                "rule-802",
                "Burnout Guard & Portfolio Load-Balancer",
                "এমপ্লয়ি বার্নআউট প্রতিরোধ ও অটো পোর্টফোলিও ব্যালেন্সার",
                "Specialist utilization >= 90% (Elevated Burnout Risk)",
                "Transfers 1 lower-touch account to highest-CSAT specialist with open capacity",
                1,
                1,
                "2026-10-29T09:30:00Z",
            ),
            (
                "rule-803",
                "Critical Escalation SLA Priority Router",
                "ক্রিটিকাল ইমেইল এস্কেলেশন অটো-অ্যাসাইনমেন্ট",
                "Unassigned inbound email marked Critical or High urgency",
                "Matches & assigns best available specialist via Python affinity engine",
                1,
                3,
                "2026-11-01T04:15:10Z",
            ),
        ]
        conn.executemany(
            """
            INSERT INTO automation_rules (
                id, name, bn_name, trigger_condition, automated_action, enabled, executions_count, last_triggered_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rules,
        )

    def _initialize_schema_and_seed(self) -> None:
        with self._lock, self._connect() as conn:
            schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
            conn.executescript(schema_sql)
            self._run_migrations(conn)
            has_org = conn.execute("SELECT COUNT(*) AS cnt FROM org_settings").fetchone()["cnt"]
            emp_count = conn.execute("SELECT COUNT(*) AS cnt FROM employees").fetchone()["cnt"]
            if has_org == 0 and emp_count == 0:
                self._seed_initial_data(conn)
                self._recompute_employee_loads(conn)
                self._seed_payroll_if_empty(conn)
                self._seed_deals_if_empty(conn)
                self._seed_leaves_if_empty(conn)
            elif emp_count > 0:
                self._recompute_employee_loads(conn)
            self._seed_automation_rules_if_empty(conn)
            self._seed_org_and_users_if_empty(conn)
            conn.commit()

    def _seed_initial_data(self, conn: sqlite3.Connection) -> None:
        employees = [
            (
                "emp-101",
                "Nusrat Jahan",
                "nusrat.jahan@aetheris.io",
                "Principal Customer Success Architect",
                "Customer Success",
                json.dumps(["Enterprise Renewal", "Bengali & English Support", "SLA Escalation", "Fintech Onboarding"]),
                "Active",
                6400,
                890,
                729,
                99.2,
                "2026-10",
                None,
                None,
                2,
                5,
                98.4,
                96,
                "Low",
                28,
                "Director Track · Level 5",
                "2024-07-12",
                None,
                "admin",
                None,
                None,
            ),
            (
                "emp-102",
                "Tanvir Rahman",
                "tanvir.rahman@aetheris.io",
                "Senior Solutions Engineer",
                "Solutions Engineering",
                json.dumps(["API Integration", "Webhook Architecture", "Python SDK", "Performance Tuning"]),
                "Active",
                5600,
                502,
                610,
                97.4,
                "2026-10",
                None,
                None,
                3,
                4,
                95.8,
                88,
                "Moderate",
                19,
                "Staff Engineer Track · Level 4",
                "2025-04-03",
                None,
                "candidate",
                None,
                None,
            ),
            (
                "emp-103",
                "Elena Rostova",
                "elena.rostova@aetheris.io",
                "Enterprise Account Strategist",
                "Enterprise Sales",
                json.dumps(["Multi-Year Contracts", "Executive QBR", "Churn Recovery", "Global Logistics"]),
                "Active",
                6100,
                810,
                691,
                98.9,
                "2026-10",
                None,
                None,
                2,
                5,
                97.1,
                94,
                "Low",
                34,
                "VP Commercial Track · Level 5",
                "2024-01-15",
                None,
                "client",
                None,
                None,
            ),
        ]
        conn.executemany(
            """
            INSERT INTO employees (
                id, name, email, role, department, skills_json, employment_status,
                base_salary_usd, performance_bonus_usd, tax_deduction_usd, attendance_rate_pct, last_paid_period,
                offboard_reason, offboarded_at, active_accounts_count, max_capacity,
                csat_score, retention_score, burnout_risk, tenure_months, career_track,
                joined_at, hired_from_candidate_id, avatar_key, longevity_plan_json, comp_review_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            employees,
        )

        customers = [
            (
                "cust-201",
                "Meghna FinTech Ltd.",
                "Digital Banking & Payments",
                "Farhan Kabir",
                "f.kabir@meghnafintech.com",
                148000,
                54,
                6,
                0.62,
                "High",
                "2026-12-15",
                "emp-102",
                "2026-10-29",
                22,
                "candidate",
                "Webhook latency spike reported during end-of-month settlement batch. Renewal in 44 days; requires Python worker tuning and multi-year loyalty lock-in.",
                None,
            ),
            (
                "cust-202",
                "Nordic Freight & Port Systems",
                "Supply Chain & Maritime",
                "Claire Lindqvist",
                "claire.l@nordicfreight.se",
                215000,
                91,
                9,
                0.94,
                "Low",
                "2027-04-30",
                "emp-103",
                "2026-10-31",
                31,
                "client",
                "Expanding across 3 regional terminals. Interested in automated customs workflow tier and 36-month enterprise commitment.",
                None,
            ),
            (
                "cust-203",
                "Pragati Retail Commerce",
                "Omnichannel E-Commerce",
                "Mahmudul Hasan",
                "mahmud@pragatiretail.bd",
                86000,
                68,
                7,
                0.74,
                "Moderate",
                "2027-01-20",
                "emp-101",
                "2026-10-25",
                14,
                "admin",
                "Regional operations team requested Bengali-first onboarding workshops for 40 new store managers to sustain daily platform adoption.",
                None,
            ),
            (
                "cust-204",
                "Helios Cloud Diagnostics",
                "Healthcare SaaS",
                "Dr. Aris Thorne",
                "athorne@heliosmed.io",
                174000,
                87,
                9,
                0.89,
                "Low",
                "2027-06-10",
                "emp-101",
                "2026-10-30",
                18,
                "client",
                "High daily active retention across clinical coordinators. Preparing annual compliance audit documentation.",
                None,
            ),
        ]
        conn.executemany(
            """
            INSERT INTO customers (
                id, company_name, industry, contact_name, contact_email, arr_usd,
                health_score, nps_score, active_seats_ratio, churn_risk, renewal_date,
                assigned_employee_id, last_contact_at, tenure_months, avatar_key, notes, retention_plan_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            customers,
        )

        emails = [
            (
                "eml-301",
                "cust-201",
                "Farhan Kabir",
                "Meghna FinTech Ltd.",
                "f.kabir@meghnafintech.com",
                "Urgent: Settlement webhook retry delay before December contract renewal",
                "Hello team, our settlement reconciliation webhooks experienced a 14-second delay during last night's peak window. Before our board signs off on the December annual renewal, we need a clear root-cause resolution plan, dedicated technical engineer assignment, and SLA assurance.",
                "2026-11-01T04:15:00Z",
                "Technical Escalation & Renewal Risk",
                "Urgent Escalation",
                "Critical",
                "Needs Reply",
                "emp-102",
                None,
                None,
                None,
                None,
                None,
            ),
            (
                "eml-302",
                "cust-203",
                "Mahmudul Hasan",
                "Pragati Retail Commerce",
                "mahmud@pragatiretail.bd",
                "নতুন ৪০ জন স্টোর ম্যানেজারের জন্য ট্রেনিং ও লং-টার্ম সাপোর্ট প্ল্যান প্রসঙ্গে",
                "আসসালামু আলাইকুম, আগামী সপ্তাহে আমাদের ঢাকা ও চট্টগ্রামের ৪০ জন নতুন স্টোর ম্যানেজার আপনার প্ল্যাটফর্মে যুক্ত হবেন। তাদের যেন দ্রুত অনবোর্ডিং হয় এবং দীর্ঘমেয়াদে সবাই সক্রিয়ভাবে সিস্টেম ব্যবহার করে, সেজন্য একজন অভিজ্ঞ সাপোর্ট স্পেশালিস্ট ও গাইডলাইন প্রয়োজন।",
                "2026-11-01T03:40:00Z",
                "Onboarding & Adoption Expansion",
                "Positive",
                "High",
                "Needs Reply",
                "emp-101",
                None,
                None,
                None,
                None,
                None,
            ),
            (
                "eml-303",
                "cust-202",
                "Claire Lindqvist",
                "Nordic Freight & Port Systems",
                "claire.l@nordicfreight.se",
                "Multi-year enterprise expansion & Gothenburg terminal rollout",
                "Hi Aetheris team, our Q3 port automation metrics exceeded target by 22%. Could we align an account strategist this week to structure a 3-year volume agreement covering 120 additional operator seats?",
                "2026-10-31T18:20:00Z",
                "Expansion & Multi-Year Lock-In",
                "Positive",
                "Medium",
                "Auto-Replied",
                "emp-103",
                "Python Routing Engine + Gemini matched Elena Rostova (97.1% CSAT) on Multi-Year Contracts & Global Logistics.",
                None,
                "en",
                "Dear Claire, thank you for sharing the Q3 automation milestone at Nordic Freight. I have assigned Elena Rostova, our Enterprise Account Strategist specializing in maritime logistics and multi-year volume agreements, to lead your Gothenburg rollout. She has prepared a 36-month tiered seat proposal with price-lock protection and will share calendar slots for Thursday.",
                "2026-10-31T18:22:10Z",
            ),
        ]
        conn.executemany(
            """
            INSERT INTO emails (
                id, customer_id, customer_name, company_name, customer_email, subject,
                inbound_body, received_at, category, sentiment, urgency, status,
                assigned_employee_id, ai_routing_reason, ai_draft_reply, ai_draft_language, sent_reply, replied_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            emails,
        )

        candidates = [
            (
                "cand-401",
                "Rafiqul Islam Chowdhury",
                "rafiq.chowdhury@devmail.org",
                "Senior Python & Customer Reliability Engineer",
                "Solutions Engineering",
                7,
                json.dumps(["Python Async Services", "Distributed Webhooks", "Incident De-escalation", "Enterprise SLA Management"]),
                "7 years building Python backend services and leading fintech API reliability across South Asia. Reduced enterprise churn by 38% via proactive webhook telemetry.",
                "Interviewing",
                "2026-10-28",
                "candidate",
                json.dumps(
                    [
                        {
                            "id": "turn-1",
                            "speaker": "interviewer",
                            "content": "When an enterprise fintech client experiences webhook queue latency right before contract renewal, how do you balance immediate Python worker mitigation with executive relationship trust?",
                            "timestamp": "2026-10-30T10:00:00Z",
                            "competencyFocus": "Python Reliability & Retention Ownership",
                        },
                        {
                            "id": "turn-2",
                            "speaker": "candidate",
                            "content": "Within 15 minutes I isolate noisy-neighbor queue contention by provisioning a dedicated async worker pool for their settlement events and share live p99 latency metrics with their CTO. Within 24 hours I deliver a transparent post-incident architecture brief with automated circuit-breaker safeguards.",
                            "timestamp": "2026-10-30T10:04:00Z",
                        },
                    ]
                ),
                None,
            ),
            (
                "cand-402",
                "Samira Tasnim",
                "samira.tasnim@talentcloud.io",
                "Enterprise Customer Success Manager",
                "Customer Success",
                5,
                json.dumps(["Executive QBRs", "Cohort Retention Analytics", "Bilingual Onboarding (BN/EN)", "Churn Playbooks"]),
                "5 years managing $4.2M ARR B2B SaaS portfolio with 114% Net Revenue Retention. Built structured 30-60-90 day adoption frameworks for retail and healthcare clients.",
                "Interviewing",
                "2026-10-29",
                "admin",
                json.dumps(
                    [
                        {
                            "id": "turn-10",
                            "speaker": "interviewer",
                            "content": "How do you detect silent churn risk in an account whose invoice payments are current, and what intervention keeps them engaged for 3+ years?",
                            "timestamp": "2026-10-31T09:30:00Z",
                            "competencyFocus": "Long-Term Cohort Retention",
                        },
                        {
                            "id": "turn-11",
                            "speaker": "candidate",
                            "content": "I track weekly active seat ratio and core workflow completion depth rather than login counts alone. Whenever seat utilization drops 15% over two sprints, I trigger a role-tailored enablement clinic for frontline managers and co-author an executive ROI scorecard.",
                            "timestamp": "2026-10-31T09:34:00Z",
                        },
                    ]
                ),
                None,
            ),
            (
                "cand-403",
                "Marcus Vance",
                "m.vance@opsnetwork.co",
                "Platform Lifecycle Operations Lead",
                "Platform Operations",
                6,
                json.dumps(["Python Automation", "Employee Enablement", "SLA Routing", "Capacity Modeling"]),
                "6 years designing Python-driven CRM routing topologies and internal talent enablement systems that cut employee burnout while improving first-response SLA by 64%.",
                "Screening",
                "2026-10-31",
                "client",
                json.dumps([]),
                None,
            ),
        ]
        conn.executemany(
            """
            INSERT INTO candidates (
                id, name, email, role, department, experience_years, skills_json,
                resume_summary, stage, applied_at, avatar_key, interview_transcript_json, evaluation_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            candidates,
        )

        events = [
            (
                "evt-500",
                utc_iso(),
                "System",
                "PYTHON_SQLITE_ENGINE_BOOTED",
                "Python 3.10 + SQLite3 (WAL) CRM, Revenue Pipeline, HR & Payroll engine initialized.",
                "Python 3.10 Runtime",
            ),
            (
                "evt-501",
                "2026-11-01T04:15:05Z",
                "Email Automation",
                "INBOUND_ESCALATION_QUEUED",
                "Critical renewal-sensitive webhook escalation received from Meghna FinTech Ltd.",
                "Python Mail Ingestion",
            ),
            (
                "evt-502",
                "2026-10-30T16:00:00Z",
                "HR & Payroll",
                "MONTHLY_PAYROLL_DISBURSED",
                "October 2026 specialist salaries and KPI retention bonuses disbursed.",
                "Python Payroll Engine",
            ),
        ]
        conn.executemany(
            "INSERT INTO domain_events (id, timestamp, module, event_type, summary, actor) VALUES (?, ?, ?, ?, ?, ?)",
            events,
        )

    def _recompute_employee_loads(self, conn: sqlite3.Connection) -> None:
        rows = conn.execute("SELECT id, max_capacity, employment_status FROM employees").fetchall()
        for r in rows:
            emp_id = r["id"]
            if r["employment_status"] == "Offboarded":
                conn.execute(
                    "UPDATE employees SET active_accounts_count = 0, burnout_risk = 'Low' WHERE id = ?",
                    (emp_id,),
                )
                continue
            max_cap = r["max_capacity"]
            cnt = conn.execute(
                "SELECT COUNT(*) AS c FROM customers WHERE assigned_employee_id = ?",
                (emp_id,),
            ).fetchone()["c"]
            risk = compute_burnout_risk(cnt, max_cap)
            conn.execute(
                "UPDATE employees SET active_accounts_count = ?, burnout_risk = ? WHERE id = ?",
                (cnt, risk, emp_id),
            )

    def _log_event(
        self,
        conn: sqlite3.Connection,
        module: str,
        event_type: str,
        summary: str,
        actor: str,
    ) -> None:
        evt_id = f"evt-{int(time.time() * 1000)}-{os.urandom(2).hex()}"
        conn.execute(
            "INSERT INTO domain_events (id, timestamp, module, event_type, summary, actor) VALUES (?, ?, ?, ?, ?, ?)",
            (evt_id, utc_iso(), module, event_type, summary, actor),
        )

    def get_snapshot(self) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            self._recompute_employee_loads(conn)
            conn.commit()

            employees = []
            for r in conn.execute("SELECT * FROM employees ORDER BY CASE WHEN employment_status = 'Offboarded' THEN 1 ELSE 0 END, joined_at DESC").fetchall():
                emp: Dict[str, Any] = {
                    "id": r["id"],
                    "name": r["name"],
                    "email": r["email"],
                    "role": r["role"],
                    "department": r["department"],
                    "skills": json.loads(r["skills_json"]),
                    "employmentStatus": r["employment_status"],
                    "baseSalaryUsd": r["base_salary_usd"],
                    "performanceBonusUsd": r["performance_bonus_usd"],
                    "taxDeductionUsd": r["tax_deduction_usd"],
                    "attendanceRatePct": float(r["attendance_rate_pct"] if r["attendance_rate_pct"] is not None else 98.5),
                    "activeAccountsCount": r["active_accounts_count"],
                    "maxCapacity": r["max_capacity"],
                    "csatScore": r["csat_score"],
                    "retentionScore": r["retention_score"],
                    "burnoutRisk": r["burnout_risk"],
                    "tenureMonths": r["tenure_months"],
                    "careerTrack": r["career_track"],
                    "joinedAt": r["joined_at"],
                    "avatarKey": r["avatar_key"],
                }
                if r["last_paid_period"]:
                    emp["lastPaidPeriod"] = r["last_paid_period"]
                if r["offboard_reason"]:
                    emp["offboardReason"] = r["offboard_reason"]
                if r["offboarded_at"]:
                    emp["offboardedAt"] = r["offboarded_at"]
                if r["hired_from_candidate_id"]:
                    emp["hiredFromCandidateId"] = r["hired_from_candidate_id"]
                if r["longevity_plan_json"]:
                    emp["longevityPlan"] = json.loads(r["longevity_plan_json"])
                if r["comp_review_json"]:
                    emp["compReview"] = json.loads(r["comp_review_json"])
                employees.append(emp)

            leave_requests = []
            for r in conn.execute("SELECT * FROM leave_requests ORDER BY CASE WHEN status = 'Pending' THEN 0 ELSE 1 END, start_date DESC").fetchall():
                lv: Dict[str, Any] = {
                    "id": r["id"],
                    "employeeId": r["employee_id"],
                    "employeeName": r["employee_name"],
                    "leaveType": r["leave_type"],
                    "startDate": r["start_date"],
                    "endDate": r["end_date"],
                    "daysCount": r["days_count"],
                    "reason": r["reason"],
                    "status": r["status"],
                }
                if r["backup_employee_id"]:
                    lv["backupEmployeeId"] = r["backup_employee_id"]
                if r["backup_employee_name"]:
                    lv["backupEmployeeName"] = r["backup_employee_name"]
                leave_requests.append(lv)

            payroll = []
            for r in conn.execute("SELECT * FROM payroll_records ORDER BY period_month DESC, status ASC, employee_name ASC").fetchall():
                pay: Dict[str, Any] = {
                    "id": r["id"],
                    "employeeId": r["employee_id"],
                    "employeeName": r["employee_name"],
                    "role": r["role"],
                    "department": r["department"],
                    "periodMonth": r["period_month"],
                    "baseSalaryUsd": r["base_salary_usd"],
                    "performanceBonusUsd": r["performance_bonus_usd"],
                    "taxDeductionUsd": r["tax_deduction_usd"],
                    "netPayUsd": r["net_pay_usd"],
                    "status": r["status"],
                }
                if r["disbursed_at"]:
                    pay["disbursedAt"] = r["disbursed_at"]
                payroll.append(pay)

            customers = []
            for r in conn.execute("SELECT * FROM customers ORDER BY rowid DESC").fetchall():
                cust: Dict[str, Any] = {
                    "id": r["id"],
                    "companyName": r["company_name"],
                    "industry": r["industry"],
                    "contactName": r["contact_name"],
                    "contactEmail": r["contact_email"],
                    "arrUsd": r["arr_usd"],
                    "healthScore": r["health_score"],
                    "npsScore": r["nps_score"],
                    "activeSeatsRatio": r["active_seats_ratio"],
                    "churnRisk": r["churn_risk"],
                    "renewalDate": r["renewal_date"],
                    "assignedEmployeeId": r["assigned_employee_id"],
                    "lastContactAt": r["last_contact_at"],
                    "tenureMonths": r["tenure_months"],
                    "avatarKey": r["avatar_key"],
                    "notes": r["notes"],
                }
                if r["retention_plan_json"]:
                    cust["retentionPlan"] = json.loads(r["retention_plan_json"])
                customers.append(cust)

            deals = []
            for r in conn.execute("SELECT * FROM deals ORDER BY updated_at DESC, value_usd DESC").fetchall():
                dl: Dict[str, Any] = {
                    "id": r["id"],
                    "title": r["title"],
                    "companyName": r["company_name"],
                    "dealType": r["deal_type"],
                    "stage": r["stage"],
                    "valueUsd": r["value_usd"],
                    "winProbability": r["win_probability"],
                    "expectedCloseDate": r["expected_close_date"],
                    "ownerEmployeeId": r["owner_employee_id"],
                    "notes": r["notes"],
                    "updatedAt": r["updated_at"],
                }
                if r["customer_id"]:
                    dl["customerId"] = r["customer_id"]
                if r["ai_coaching_json"]:
                    dl["aiCoaching"] = json.loads(r["ai_coaching_json"])
                deals.append(dl)

            emails = []
            for r in conn.execute("SELECT * FROM emails ORDER BY received_at DESC").fetchall():
                eml: Dict[str, Any] = {
                    "id": r["id"],
                    "customerId": r["customer_id"],
                    "customerName": r["customer_name"],
                    "companyName": r["company_name"],
                    "customerEmail": r["customer_email"],
                    "subject": r["subject"],
                    "inboundBody": r["inbound_body"],
                    "receivedAt": r["received_at"],
                    "category": r["category"],
                    "sentiment": r["sentiment"],
                    "urgency": r["urgency"],
                    "status": r["status"],
                }
                for opt_col, key in [
                    ("assigned_employee_id", "assignedEmployeeId"),
                    ("ai_routing_reason", "aiRoutingReason"),
                    ("ai_draft_reply", "aiDraftReply"),
                    ("ai_draft_language", "aiDraftLanguage"),
                    ("sent_reply", "sentReply"),
                    ("replied_at", "repliedAt"),
                    ("smtp_delivery_status", "smtpDeliveryStatus"),
                ]:
                    if r[opt_col] is not None:
                        eml[key] = r[opt_col]
                emails.append(eml)

            candidates = []
            for r in conn.execute("SELECT * FROM candidates ORDER BY rowid DESC").fetchall():
                cand: Dict[str, Any] = {
                    "id": r["id"],
                    "name": r["name"],
                    "email": r["email"],
                    "role": r["role"],
                    "department": r["department"],
                    "experienceYears": r["experience_years"],
                    "skills": json.loads(r["skills_json"]),
                    "resumeSummary": r["resume_summary"],
                    "stage": r["stage"],
                    "appliedAt": r["applied_at"],
                    "avatarKey": r["avatar_key"],
                    "interviewTranscript": json.loads(r["interview_transcript_json"]),
                }
                if r["evaluation_json"]:
                    cand["evaluation"] = json.loads(r["evaluation_json"])
                candidates.append(cand)

            automation_rules = []
            for r in conn.execute("SELECT * FROM automation_rules ORDER BY id ASC").fetchall():
                rule: Dict[str, Any] = {
                    "id": r["id"],
                    "name": r["name"],
                    "bnName": r["bn_name"],
                    "triggerCondition": r["trigger_condition"],
                    "automatedAction": r["automated_action"],
                    "enabled": bool(r["enabled"]),
                    "executionsCount": r["executions_count"],
                }
                if r["last_triggered_at"]:
                    rule["lastTriggeredAt"] = r["last_triggered_at"]
                automation_rules.append(rule)

            events = []
            for r in conn.execute("SELECT * FROM domain_events ORDER BY timestamp DESC LIMIT 60").fetchall():
                events.append(
                    {
                        "id": r["id"],
                        "timestamp": r["timestamp"],
                        "module": r["module"],
                        "eventType": r["event_type"],
                        "summary": r["summary"],
                        "actor": r["actor"],
                    }
                )

            org_row = conn.execute("SELECT * FROM org_settings WHERE id = 1").fetchone()
            org_settings: Dict[str, Any] = {
                "companyName": org_row["company_name"] if org_row else "Aetheris CRM",
                "companyDomain": org_row["company_domain"] if org_row else "aetheris.io",
                "supportEmail": org_row["support_email"] if org_row else "support@aetheris.io",
                "companyAddress": org_row["company_address"] if org_row else "Dhaka, Bangladesh",
                "currencyCode": org_row["currency_code"] if org_row else "USD",
                "currencySymbol": org_row["currency_symbol"] if org_row else "$",
                "defaultTaxRatePct": float(org_row["default_tax_rate_pct"]) if org_row else 10.0,
                "slaTargetHours": int(org_row["sla_target_hours"]) if org_row else 4,
                "autoTriageWebhook": bool(org_row["auto_triage_webhook"]) if org_row else True,
                "smtpConfigured": is_smtp_configured(),
            }

            return {
                "orgSettings": org_settings,
                "customers": customers,
                "deals": deals,
                "emails": emails,
                "candidates": candidates,
                "employees": employees,
                "leaveRequests": leave_requests,
                "payroll": payroll,
                "automationRules": automation_rules,
                "events": events,
                "cohorts": COHORTS,
                "architectureLayers": ARCHITECTURE_LAYERS,
            }

    # --- Revenue & Expansion Deal Pipeline Methods ---
    def create_deal(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            deal_id = f"deal-{int(time.time() * 1000)}"
            stage = payload.get("stage") or "Discovery"
            prob = int(payload.get("winProbability") or STAGE_DEFAULT_PROBABILITY.get(stage, 35))
            val = max(1000, int(payload.get("valueUsd") or 50000))
            cust_id = payload.get("customerId") or None
            first_emp = conn.execute(
                "SELECT id FROM employees WHERE employment_status != 'Offboarded' LIMIT 1"
            ).fetchone()
            owner_id = payload.get("ownerEmployeeId") or (first_emp["id"] if first_emp else "emp-101")
            comp_name = (payload.get("companyName") or "Enterprise Prospect").strip()
            if cust_id:
                c_row = conn.execute("SELECT company_name FROM customers WHERE id = ?", (cust_id,)).fetchone()
                if c_row:
                    comp_name = c_row["company_name"]

            conn.execute(
                """
                INSERT INTO deals (
                    id, title, company_name, customer_id, deal_type, stage,
                    value_usd, win_probability, expected_close_date, owner_employee_id, notes, updated_at, ai_coaching_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
                """,
                (
                    deal_id,
                    payload["title"].strip(),
                    comp_name,
                    cust_id,
                    payload.get("dealType") or "Seat Expansion",
                    stage,
                    val,
                    prob,
                    payload.get("expectedCloseDate") or "2026-12-30",
                    owner_id,
                    (payload.get("notes") or "Enterprise commercial opportunity tracked in Python pipeline.").strip(),
                    utc_iso(),
                ),
            )
            self._log_event(
                conn,
                "Revenue Pipeline",
                "DEAL_CREATED",
                f"Opened ${val:,} opportunity '{payload['title'].strip()}' ({stage}).",
                "Python Deal Pipeline",
            )
            conn.commit()

        snap = self.get_snapshot()
        deal_obj = next(d for d in snap["deals"] if d["id"] == deal_id)
        return {"deal": deal_obj, "snapshot": snap}

    def update_deal_stage(self, deal_id: str, next_stage: str) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT * FROM deals WHERE id = ?", (deal_id,)).fetchone()
            if not row:
                raise ValueError("Deal opportunity not found.")
            prev_stage = row["stage"]
            prob = STAGE_DEFAULT_PROBABILITY.get(next_stage, row["win_probability"])
            conn.execute(
                "UPDATE deals SET stage = ?, win_probability = ?, updated_at = ? WHERE id = ?",
                (next_stage, prob, utc_iso(), deal_id),
            )

            # Closed-Loop Settlement when transitioning into Closed Won
            if next_stage == "Closed Won" and prev_stage != "Closed Won":
                val = int(row["value_usd"])
                owner_id = row["owner_employee_id"]
                cust_id = row["customer_id"]

                # 1. Expand Customer ARR or onboard Net-New Enterprise Customer
                if cust_id:
                    cust = conn.execute("SELECT * FROM customers WHERE id = ?", (cust_id,)).fetchone()
                    if cust:
                        added_arr = val if row["deal_type"] != "Multi-Year Renewal" else int(val * 0.15)
                        new_arr = int(cust["arr_usd"]) + added_arr
                        new_health = min(100, int(cust["health_score"]) + 10)
                        new_risk = compute_churn_risk(new_health, float(cust["active_seats_ratio"]))
                        conn.execute(
                            "UPDATE customers SET arr_usd = ?, health_score = ?, churn_risk = ?, last_contact_at = ? WHERE id = ?",
                            (new_arr, new_health, new_risk, today_iso(), cust_id),
                        )
                else:
                    new_cust_id = f"cust-{int(time.time() * 1000)}"
                    slug = "".join(ch if ch.isalnum() else "" for ch in row["company_name"].lower())[:14] or "client"
                    conn.execute(
                        """
                        INSERT INTO customers (
                            id, company_name, industry, contact_name, contact_email, arr_usd,
                            health_score, nps_score, active_seats_ratio, churn_risk, renewal_date,
                            assigned_employee_id, last_contact_at, tenure_months, avatar_key, notes, retention_plan_json
                        ) VALUES (?, ?, 'Enterprise SaaS', 'Executive Sponsor', ?, ?, 90, 9, 0.88, 'Low', '2027-11-30', ?, ?, 1, 'client', ?, NULL)
                        """,
                        (
                            new_cust_id,
                            row["company_name"],
                            f"ops@{slug}.com",
                            val,
                            owner_id,
                            today_iso(),
                            f"Converted from Closed-Won deal: {row['title']}",
                        ),
                    )
                    conn.execute("UPDATE deals SET customer_id = ? WHERE id = ?", (new_cust_id, deal_id))

                # 2. Credit Sales/Expansion Commission to Specialist Payroll
                emp = conn.execute("SELECT * FROM employees WHERE id = ?", (owner_id,)).fetchone()
                if emp and emp["employment_status"] != "Offboarded":
                    commission = calculate_deal_commission(val, row["deal_type"])
                    new_bonus = int(emp["performance_bonus_usd"]) + commission
                    comp = calculate_kpi_bonus_and_tax(
                        int(emp["base_salary_usd"]),
                        float(emp["csat_score"]),
                        0,
                        override_bonus=new_bonus,
                    )
                    conn.execute(
                        "UPDATE employees SET performance_bonus_usd = ?, tax_deduction_usd = ? WHERE id = ?",
                        (comp["performanceBonusUsd"], comp["taxDeductionUsd"], owner_id),
                    )
                    conn.execute(
                        """
                        UPDATE payroll_records SET
                            performance_bonus_usd = ?,
                            tax_deduction_usd = ?,
                            net_pay_usd = ?
                        WHERE employee_id = ? AND status = 'Pending'
                        """,
                        (
                            comp["performanceBonusUsd"],
                            comp["taxDeductionUsd"],
                            comp["netPayUsd"],
                            owner_id,
                        ),
                    )
                    self._log_event(
                        conn,
                        "Revenue Pipeline",
                        "DEAL_WON_AND_COMMISSION_CREDITED",
                        f"Closed Won '{row['title']}' (${val:,})! Credited +${commission:,} commission bonus to {emp['name']}'s payroll.",
                        "Python Revenue & Payroll Engine",
                    )
            else:
                self._log_event(
                    conn,
                    "Revenue Pipeline",
                    "DEAL_STAGE_UPDATED",
                    f"Moved '{row['title']}' from {prev_stage} to {next_stage} ({prob}% win prob).",
                    "Python Deal Pipeline",
                )

            self._recompute_employee_loads(conn)
            conn.commit()

        snap = self.get_snapshot()
        deal_obj = next(d for d in snap["deals"] if d["id"] == deal_id)
        return {"deal": deal_obj, "snapshot": snap}

    def commit_deal_coaching(self, deal_id: str, coaching: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT * FROM deals WHERE id = ?", (deal_id,)).fetchone()
            if not row:
                raise ValueError("Deal opportunity not found.")
            cal_prob = int(coaching.get("calibratedWinProbability", row["win_probability"]))
            if row["stage"] not in ("Closed Won", "Closed Lost"):
                cal_prob = max(5, min(98, cal_prob))
            else:
                cal_prob = row["win_probability"]
            conn.execute(
                "UPDATE deals SET win_probability = ?, ai_coaching_json = ?, updated_at = ? WHERE id = ?",
                (cal_prob, json.dumps(coaching), utc_iso(), deal_id),
            )
            self._log_event(
                conn,
                "Revenue Pipeline",
                "AI_DEAL_COACHING_GENERATED",
                f"Generated AI Deal Win-Strategy for '{row['title']}' (Calibrated Prob: {cal_prob}%).",
                "Gemini 3.8 Deal Strategist",
            )
            conn.commit()

        snap = self.get_snapshot()
        deal_obj = next(d for d in snap["deals"] if d["id"] == deal_id)
        return {"deal": deal_obj, "snapshot": snap}

    # --- Attendance & Leave Management Methods ---
    def create_leave_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            emp_id = payload["employeeId"]
            emp = conn.execute("SELECT * FROM employees WHERE id = ?", (emp_id,)).fetchone()
            if not emp:
                raise ValueError("Employee not found.")
            lv_id = f"lv-{int(time.time() * 1000)}"
            days = max(1, int(payload.get("daysCount") or 2))
            conn.execute(
                """
                INSERT INTO leave_requests (
                    id, employee_id, employee_name, leave_type, start_date, end_date,
                    days_count, reason, status, backup_employee_id, backup_employee_name
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NULL, NULL)
                """,
                (
                    lv_id,
                    emp_id,
                    emp["name"],
                    payload.get("leaveType") or "AnnualPaid",
                    payload.get("startDate") or today_iso(),
                    payload.get("endDate") or today_iso(),
                    days,
                    (payload.get("reason") or "Planned personal leave").strip(),
                ),
            )
            self._log_event(
                conn,
                "HR & Payroll",
                "LEAVE_REQUEST_SUBMITTED",
                f"{emp['name']} requested {days} day(s) of {payload.get('leaveType', 'AnnualPaid')}.",
                "Python HR Attendance",
            )
            conn.commit()

        return {"snapshot": self.get_snapshot()}

    def review_leave_request(self, leave_id: str, decision: str) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            lv = conn.execute("SELECT * FROM leave_requests WHERE id = ?", (leave_id,)).fetchone()
            if not lv:
                raise ValueError("Leave request not found.")
            if decision not in ("Approved", "Declined"):
                raise ValueError("Decision must be Approved or Declined.")

            backup_id = None
            backup_name = None
            if decision == "Approved":
                active_others = conn.execute(
                    "SELECT id, name, active_accounts_count, max_capacity, csat_score, employment_status FROM employees WHERE id != ? AND employment_status != 'Offboarded'",
                    (lv["employee_id"],),
                ).fetchall()
                if active_others:
                    other_dicts = [
                        {
                            "id": o["id"],
                            "activeAccountsCount": o["active_accounts_count"],
                            "maxCapacity": o["max_capacity"],
                            "csatScore": o["csat_score"],
                            "employmentStatus": o["employment_status"],
                        }
                        for o in active_others
                    ]
                    backup_id = select_handover_specialist(lv["employee_id"], other_dicts)
                    backup_row = next((o for o in active_others if o["id"] == backup_id), active_others[0])
                    backup_id = backup_row["id"]
                    backup_name = backup_row["name"]

                # If UnpaidLeave, apply pro-rata salary adjustment on Pending payslip & attendance %
                if lv["leave_type"] == "UnpaidLeave":
                    emp = conn.execute("SELECT * FROM employees WHERE id = ?", (lv["employee_id"],)).fetchone()
                    if emp:
                        new_att = max(75.0, round(float(emp["attendance_rate_pct"]) - (lv["days_count"] * 1.5), 1))
                        comp = calculate_kpi_bonus_and_tax(
                            int(emp["base_salary_usd"]),
                            float(emp["csat_score"]),
                            0,
                            override_bonus=int(emp["performance_bonus_usd"]),
                            unpaid_leave_days=int(lv["days_count"]),
                        )
                        conn.execute(
                            "UPDATE employees SET attendance_rate_pct = ? WHERE id = ?",
                            (new_att, emp["id"]),
                        )
                        conn.execute(
                            """
                            UPDATE payroll_records SET
                                base_salary_usd = ?,
                                tax_deduction_usd = ?,
                                net_pay_usd = ?
                            WHERE employee_id = ? AND status = 'Pending'
                            """,
                            (
                                comp["baseSalaryUsd"],
                                comp["taxDeductionUsd"],
                                comp["netPayUsd"],
                                emp["id"],
                            ),
                        )

            conn.execute(
                "UPDATE leave_requests SET status = ?, backup_employee_id = ?, backup_employee_name = ? WHERE id = ?",
                (decision, backup_id, backup_name, leave_id),
            )
            self._log_event(
                conn,
                "HR & Payroll",
                f"LEAVE_REQUEST_{decision.upper()}",
                f"{decision} {lv['days_count']}d leave for {lv['employee_name']}"
                + (f" (SLA Backup: {backup_name})." if backup_name else "."),
                "Python HR & SLA Guard",
            )
            conn.commit()

        return {"snapshot": self.get_snapshot()}

    # --- Autonomous Workflow Engine Methods ---
    def toggle_automation_rule(self, rule_id: str) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT * FROM automation_rules WHERE id = ?", (rule_id,)).fetchone()
            if not row:
                raise ValueError("Automation rule not found.")
            next_state = 0 if row["enabled"] else 1
            conn.execute("UPDATE automation_rules SET enabled = ? WHERE id = ?", (next_state, rule_id))
            self._log_event(
                conn,
                "Workflow Engine",
                "WORKFLOW_RULE_TOGGLED",
                f"{'Enabled' if next_state else 'Paused'} automation rule: {row['name']}.",
                "Python Workflow Supervisor",
            )
            conn.commit()
        return {"snapshot": self.get_snapshot()}

    def execute_autonomous_sweep(self) -> Dict[str, Any]:
        actions_taken: List[str] = []
        with self._lock, self._connect() as conn:
            now = utc_iso()
            rules = {
                r["id"]: dict(r)
                for r in conn.execute("SELECT * FROM automation_rules").fetchall()
            }

            # Rule 801: Renewal Risk Deal Auto-Generator
            if rules.get("rule-801", {}).get("enabled"):
                risky_custs = conn.execute(
                    "SELECT * FROM customers WHERE churn_risk IN ('High', 'Moderate')"
                ).fetchall()
                for c in risky_custs:
                    open_deal = conn.execute(
                        "SELECT id FROM deals WHERE customer_id = ? AND stage NOT IN ('Closed Won', 'Closed Lost')",
                        (c["id"],),
                    ).fetchone()
                    if not open_deal:
                        d_id = f"deal-auto-{int(time.time() * 1000)}-{os.urandom(1).hex()}"
                        conn.execute(
                            """
                            INSERT INTO deals (
                                id, title, company_name, customer_id, deal_type, stage,
                                value_usd, win_probability, expected_close_date, owner_employee_id, notes, updated_at, ai_coaching_json
                            ) VALUES (?, ?, ?, ?, 'Multi-Year Renewal', 'Discovery', ?, 45, ?, ?, 'Auto-created by Python Renewal Risk Sweep.', ?, NULL)
                            """,
                            (
                                d_id,
                                f"{c['company_name']} — Proactive Retention Renewal",
                                c["company_name"],
                                c["id"],
                                c["arr_usd"],
                                c["renewal_date"],
                                c["assigned_employee_id"],
                                now,
                            ),
                        )
                        actions_taken.append(f"Opened renewal deal for {c['company_name']}")
                conn.execute(
                    "UPDATE automation_rules SET executions_count = executions_count + 1, last_triggered_at = ? WHERE id = 'rule-801'",
                    (now,),
                )

            # Rule 802: Burnout Guard & Portfolio Load-Balancer
            if rules.get("rule-802", {}).get("enabled"):
                self._recompute_employee_loads(conn)
                overloaded = conn.execute(
                    "SELECT * FROM employees WHERE employment_status != 'Offboarded' AND burnout_risk = 'Elevated'"
                ).fetchall()
                active_all = [
                    {
                        "id": e["id"],
                        "name": e["name"],
                        "activeAccountsCount": e["active_accounts_count"],
                        "maxCapacity": e["max_capacity"],
                        "csatScore": e["csat_score"],
                        "employmentStatus": e["employment_status"],
                    }
                    for e in conn.execute("SELECT * FROM employees WHERE employment_status != 'Offboarded'").fetchall()
                ]
                for ov in overloaded:
                    target_id = select_handover_specialist(ov["id"], active_all)
                    if target_id:
                        acct = conn.execute(
                            "SELECT id, company_name FROM customers WHERE assigned_employee_id = ? ORDER BY health_score DESC LIMIT 1",
                            (ov["id"],),
                        ).fetchone()
                        if acct:
                            conn.execute(
                                "UPDATE customers SET assigned_employee_id = ? WHERE id = ?",
                                (target_id, acct["id"]),
                            )
                            actions_taken.append(f"Rebalanced {acct['company_name']} from {ov['name']}")
                conn.execute(
                    "UPDATE automation_rules SET executions_count = executions_count + 1, last_triggered_at = ? WHERE id = 'rule-802'",
                    (now,),
                )

            # Rule 803: Critical Escalation SLA Priority Router
            if rules.get("rule-803", {}).get("enabled"):
                unassigned_emails = conn.execute(
                    "SELECT * FROM emails WHERE assigned_employee_id IS NULL AND status != 'Auto-Replied'"
                ).fetchall()
                best_emp = conn.execute(
                    "SELECT id, name FROM employees WHERE employment_status != 'Offboarded' ORDER BY active_accounts_count ASC, csat_score DESC LIMIT 1"
                ).fetchone()
                if best_emp:
                    for eml in unassigned_emails:
                        conn.execute(
                            "UPDATE emails SET assigned_employee_id = ? WHERE id = ?",
                            (best_emp["id"], eml["id"]),
                        )
                        actions_taken.append(f"Assigned {eml['company_name']} email to {best_emp['name']}")
                conn.execute(
                    "UPDATE automation_rules SET executions_count = executions_count + 1, last_triggered_at = ? WHERE id = 'rule-803'",
                    (now,),
                )

            self._recompute_employee_loads(conn)
            summary_msg = (
                f"Autonomous Python Sweep completed: {'; '.join(actions_taken)}."
                if actions_taken
                else "Autonomous Python Sweep verified all SLA queues, renewal pipelines, and burnout thresholds are optimal."
            )
            self._log_event(
                conn,
                "Workflow Engine",
                "AUTONOMOUS_SWEEP_EXECUTED",
                summary_msg,
                "Python Autonomous Ops Engine",
            )
            conn.commit()

        return {"summary": summary_msg, "actionsCount": len(actions_taken), "snapshot": self.get_snapshot()}

    # --- Existing Core Methods ---
    def create_email(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            cust_id = payload.get("customerId") or "unlinked"
            cust_row = conn.execute("SELECT * FROM customers WHERE id = ?", (cust_id,)).fetchone()
            eml_id = f"eml-{int(time.time() * 1000)}"
            assigned_emp = cust_row["assigned_employee_id"] if cust_row else None
            customer_name = (payload.get("customerName") or (cust_row["contact_name"] if cust_row else "Enterprise Contact")).strip()
            company_name = (payload.get("companyName") or (cust_row["company_name"] if cust_row else "External Organization")).strip()
            customer_email = payload["customerEmail"].strip()
            subject = payload["subject"].strip()
            inbound_body = payload["inboundBody"].strip()

            conn.execute(
                """
                INSERT INTO emails (
                    id, customer_id, customer_name, company_name, customer_email, subject,
                    inbound_body, received_at, category, sentiment, urgency, status, assigned_employee_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    eml_id,
                    cust_id,
                    customer_name,
                    company_name,
                    customer_email,
                    subject,
                    inbound_body,
                    utc_iso(),
                    "Pending AI Triage",
                    "Neutral",
                    "Medium",
                    "Needs Reply",
                    assigned_emp,
                ),
            )
            self._log_event(
                conn,
                "Email Automation",
                "INBOUND_EMAIL_RECEIVED",
                f'Python SQLite logged inbound email: "{subject}" from {company_name}',
                "Python Mail Service",
            )
            conn.commit()
        snap = self.get_snapshot()
        email_obj = next(e for e in snap["emails"] if e["id"] == eml_id)
        return {"email": email_obj, "snapshot": snap}

    def commit_email_triage(self, email_id: str, ai_data: Dict[str, Any], language: str, auto_send: bool) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT * FROM emails WHERE id = ?", (email_id,)).fetchone()
            if not row:
                raise ValueError("Email thread not found.")

            org_row = conn.execute("SELECT * FROM org_settings WHERE id = 1").fetchone()
            comp_brand = org_row["company_name"] if org_row else "Aetheris CRM"
            sup_email = org_row["support_email"] if org_row else "support@aetheris.io"

            rec_emp = ai_data["recommendedEmployeeId"]
            status = "Auto-Replied" if auto_send else "Draft Ready"
            sent_reply = ai_data["draftReply"] if auto_send else row["sent_reply"]
            replied_at = utc_iso() if auto_send else row["replied_at"]
            smtp_status = row["smtp_delivery_status"]

            if auto_send:
                smtp_status = try_dispatch_smtp_email(
                    row["customer_email"],
                    row["subject"],
                    ai_data["draftReply"],
                    comp_brand,
                    sup_email,
                )

            conn.execute(
                """
                UPDATE emails SET
                    assigned_employee_id = ?,
                    ai_routing_reason = ?,
                    category = ?,
                    sentiment = ?,
                    urgency = ?,
                    ai_draft_reply = ?,
                    ai_draft_language = ?,
                    status = ?,
                    sent_reply = ?,
                    replied_at = ?,
                    smtp_delivery_status = ?
                WHERE id = ?
                """,
                (
                    rec_emp,
                    ai_data["aiRoutingReason"],
                    ai_data["category"],
                    ai_data["sentiment"],
                    ai_data["urgency"],
                    ai_data["draftReply"],
                    language,
                    status,
                    sent_reply,
                    replied_at,
                    smtp_status,
                    email_id,
                ),
            )

            if auto_send:
                cust = conn.execute("SELECT * FROM customers WHERE id = ?", (row["customer_id"],)).fetchone()
                if cust:
                    delta = max(2, int(ai_data.get("suggestedHealthDelta", 5)))
                    new_health = min(100, cust["health_score"] + delta)
                    new_risk = compute_churn_risk(new_health, cust["active_seats_ratio"])
                    conn.execute(
                        "UPDATE customers SET assigned_employee_id = ?, last_contact_at = ?, health_score = ?, churn_risk = ? WHERE id = ?",
                        (rec_emp, today_iso(), new_health, new_risk, cust["id"]),
                    )

            self._recompute_employee_loads(conn)
            self._log_event(
                conn,
                "Email Automation",
                "AI_AUTO_REPLY_DISPATCHED" if auto_send else "AI_DRAFT_AND_EMPLOYEE_MATCHED",
                f"Python engine routed {row['company_name']} to {rec_emp} ({status}).",
                "Python Router + Gemini 3.8",
            )
            conn.commit()

        snap = self.get_snapshot()
        email_obj = next(e for e in snap["emails"] if e["id"] == email_id)
        return {"email": email_obj, "snapshot": snap}

    def send_email_reply(self, email_id: str, reply_body: str, assigned_emp_id: Optional[str]) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT * FROM emails WHERE id = ?", (email_id,)).fetchone()
            if not row:
                raise ValueError("Email thread not found.")
            org_row = conn.execute("SELECT * FROM org_settings WHERE id = 1").fetchone()
            comp_brand = org_row["company_name"] if org_row else "Aetheris CRM"
            sup_email = org_row["support_email"] if org_row else "support@aetheris.io"

            emp_id = assigned_emp_id or row["assigned_employee_id"]
            smtp_status = try_dispatch_smtp_email(
                row["customer_email"],
                row["subject"],
                reply_body.strip(),
                comp_brand,
                sup_email,
            )
            conn.execute(
                "UPDATE emails SET assigned_employee_id = ?, sent_reply = ?, status = 'Auto-Replied', replied_at = ?, smtp_delivery_status = ? WHERE id = ?",
                (emp_id, reply_body.strip(), utc_iso(), smtp_status, email_id),
            )
            cust = conn.execute("SELECT * FROM customers WHERE id = ?", (row["customer_id"],)).fetchone()
            if cust:
                new_health = min(100, cust["health_score"] + 5)
                new_risk = compute_churn_risk(new_health, cust["active_seats_ratio"])
                conn.execute(
                    "UPDATE customers SET assigned_employee_id = COALESCE(?, assigned_employee_id), last_contact_at = ?, health_score = ?, churn_risk = ? WHERE id = ?",
                    (emp_id, today_iso(), new_health, new_risk, cust["id"]),
                )
            self._recompute_employee_loads(conn)
            self._log_event(
                conn,
                "Email Automation",
                "EMAIL_REPLY_SENT",
                f"Dispatched verified reply to {row['customer_email']} ({smtp_status}).",
                "Python Outbound Mailer",
            )
            conn.commit()

        snap = self.get_snapshot()
        email_obj = next(e for e in snap["emails"] if e["id"] == email_id)
        return {"email": email_obj, "snapshot": snap}

    def create_candidate(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            cand_id = f"cand-{int(time.time() * 1000)}"
            raw_skills = payload.get("skills", [])
            if isinstance(raw_skills, str):
                skills = [s.strip() for s in raw_skills.split(",") if s.strip()]
            else:
                skills = list(raw_skills)
            if not skills:
                skills = ["Python CRM", "Enterprise Retention"]

            conn.execute(
                """
                INSERT INTO candidates (
                    id, name, email, role, department, experience_years, skills_json,
                    resume_summary, stage, applied_at, avatar_key, interview_transcript_json, evaluation_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    cand_id,
                    payload["name"].strip(),
                    payload["email"].strip(),
                    payload["role"].strip(),
                    payload.get("department") or "Customer Success",
                    int(payload.get("experienceYears") or 3),
                    json.dumps(skills),
                    (payload.get("resumeSummary") or "Specialist focused on long-term client retention.").strip(),
                    "Interviewing",
                    today_iso(),
                    "candidate",
                    json.dumps([]),
                    None,
                ),
            )
            self._log_event(
                conn,
                "Talent & Interview",
                "CANDIDATE_PIPELINE_ADDED",
                f"Added candidate {payload['name'].strip()} ({payload['role'].strip()}) into SQLite pipeline.",
                "Python Talent Engine",
            )
            conn.commit()

        snap = self.get_snapshot()
        cand_obj = next(c for c in snap["candidates"] if c["id"] == cand_id)
        return {"candidate": cand_obj, "snapshot": snap}

    def append_interview_turn(
        self,
        cand_id: str,
        speaker: str,
        content: str,
        competency_focus: Optional[str] = None,
    ) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT * FROM candidates WHERE id = ?", (cand_id,)).fetchone()
            if not row:
                raise ValueError("Candidate not found.")
            transcript = json.loads(row["interview_transcript_json"])
            turn: Dict[str, Any] = {
                "id": f"turn-{int(time.time() * 1000)}",
                "speaker": speaker,
                "content": content.strip(),
                "timestamp": utc_iso(),
            }
            if competency_focus:
                turn["competencyFocus"] = competency_focus
            transcript.append(turn)
            next_stage = "Interviewing" if row["stage"] == "Screening" else row["stage"]
            conn.execute(
                "UPDATE candidates SET stage = ?, interview_transcript_json = ? WHERE id = ?",
                (next_stage, json.dumps(transcript), cand_id),
            )
            self._log_event(
                conn,
                "Talent & Interview",
                "INTERVIEW_TURN_COMMITTED",
                f"Logged {speaker} interview turn for {row['name']}.",
                "Python Interview Engine",
            )
            conn.commit()

        snap = self.get_snapshot()
        cand_obj = next(c for c in snap["candidates"] if c["id"] == cand_id)
        return {"candidate": cand_obj, "snapshot": snap}

    def commit_candidate_evaluation(self, cand_id: str, evaluation: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT * FROM candidates WHERE id = ?", (cand_id,)).fetchone()
            if not row:
                raise ValueError("Candidate not found.")
            stage = row["stage"]
            if stage != "Hired":
                if evaluation["verdict"] == "Select & Hire":
                    stage = "Selected"
                elif evaluation["verdict"] == "Decline":
                    stage = "Declined"
                else:
                    stage = "Interviewing"
            conn.execute(
                "UPDATE candidates SET stage = ?, evaluation_json = ? WHERE id = ?",
                (stage, json.dumps(evaluation), cand_id),
            )
            self._log_event(
                conn,
                "Talent & Interview",
                "AI_SELECTION_VERDICT_GENERATED",
                f"Evaluated {row['name']}: {evaluation['verdict']} ({evaluation['overallScore']}/100).",
                "Python Selection Committee",
            )
            conn.commit()

        snap = self.get_snapshot()
        cand_obj = next(c for c in snap["candidates"] if c["id"] == cand_id)
        return {"candidate": cand_obj, "snapshot": snap}

    def hire_candidate(
        self,
        cand_id: str,
        base_salary_usd: int = 5200,
        employment_status: str = "Probation",
    ) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT * FROM candidates WHERE id = ?", (cand_id,)).fetchone()
            if not row:
                raise ValueError("Candidate not found.")
            existing_emp = conn.execute(
                "SELECT id FROM employees WHERE hired_from_candidate_id = ?", (cand_id,)
            ).fetchone()

            emp_id = existing_emp["id"] if existing_emp else f"emp-{int(time.time() * 1000)}"
            if not existing_emp:
                eval_obj = json.loads(row["evaluation_json"]) if row["evaluation_json"] else {}
                ret_score = int(eval_obj.get("longTermRetentionFit", 94))
                slug = "".join(ch if ch.isalnum() else "." for ch in row["name"].lower()).strip(".")
                corp_email = row["email"] if "@aetheris.io" in row["email"] else f"{slug}@aetheris.io"
                salary = max(1000, int(base_salary_usd or 5200))
                comp = calculate_kpi_bonus_and_tax(salary, 96.0, 0)

                conn.execute("UPDATE candidates SET stage = 'Hired' WHERE id = ?", (cand_id,))
                conn.execute(
                    """
                    INSERT INTO employees (
                        id, name, email, role, department, skills_json, employment_status,
                        base_salary_usd, performance_bonus_usd, tax_deduction_usd, attendance_rate_pct, last_paid_period,
                        offboard_reason, offboarded_at, active_accounts_count, max_capacity,
                        csat_score, retention_score, burnout_risk, tenure_months, career_track,
                        joined_at, hired_from_candidate_id, avatar_key, longevity_plan_json, comp_review_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 100.0, NULL, NULL, NULL, 0, 5, 96.0, ?, 'Low', 1, 'Onboarding Cohort · Growth Track', ?, ?, ?, NULL, NULL)
                    """,
                    (
                        emp_id,
                        row["name"],
                        corp_email,
                        row["role"],
                        row["department"],
                        row["skills_json"],
                        employment_status if employment_status in ("Active", "Probation") else "Probation",
                        comp["baseSalaryUsd"],
                        comp["performanceBonusUsd"],
                        comp["taxDeductionUsd"],
                        ret_score,
                        today_iso(),
                        cand_id,
                        row["avatar_key"] or "candidate",
                    ),
                )

                current_period = datetime.now(timezone.utc).strftime("%Y-%m")
                conn.execute(
                    """
                    INSERT INTO payroll_records (
                        id, employee_id, employee_name, role, department, period_month,
                        base_salary_usd, performance_bonus_usd, tax_deduction_usd, net_pay_usd, status, disbursed_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NULL)
                    """,
                    (
                        f"pay-{int(time.time() * 1000)}",
                        emp_id,
                        row["name"],
                        row["role"],
                        row["department"],
                        current_period,
                        comp["baseSalaryUsd"],
                        comp["performanceBonusUsd"],
                        comp["taxDeductionUsd"],
                        comp["netPayUsd"],
                    ),
                )

                self._log_event(
                    conn,
                    "HR & Payroll",
                    "CANDIDATE_HIRED_WITH_PAYROLL",
                    f"Hired {row['name']} (${salary:,}/mo, {employment_status}) and enrolled in payroll.",
                    "Python HR & Payroll Engine",
                )
                conn.commit()

        snap = self.get_snapshot()
        cand_obj = next(c for c in snap["candidates"] if c["id"] == cand_id)
        emp_obj = next((e for e in snap["employees"] if e["id"] == emp_id), None)
        return {"candidate": cand_obj, "employee": emp_obj, "snapshot": snap}

    def direct_hire_employee(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            emp_id = f"emp-{int(time.time() * 1000)}"
            raw_skills = payload.get("skills", [])
            if isinstance(raw_skills, str):
                skills = [s.strip() for s in raw_skills.split(",") if s.strip()]
            else:
                skills = list(raw_skills)
            if not skills:
                skills = ["Enterprise CRM", "Client Retention"]

            salary = max(1000, int(payload.get("baseSalaryUsd") or 5000))
            status = payload.get("employmentStatus") or "Active"
            comp = calculate_kpi_bonus_and_tax(salary, 96.0, 0)

            conn.execute(
                """
                INSERT INTO employees (
                    id, name, email, role, department, skills_json, employment_status,
                    base_salary_usd, performance_bonus_usd, tax_deduction_usd, attendance_rate_pct, last_paid_period,
                    offboard_reason, offboarded_at, active_accounts_count, max_capacity,
                    csat_score, retention_score, burnout_risk, tenure_months, career_track,
                    joined_at, hired_from_candidate_id, avatar_key, longevity_plan_json, comp_review_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 100.0, NULL, NULL, NULL, 0, ?, 96.0, 94, 'Low', 1, 'Direct Hire · Specialist Track', ?, NULL, 'admin', NULL, NULL)
                """,
                (
                    emp_id,
                    payload["name"].strip(),
                    payload["email"].strip(),
                    payload["role"].strip(),
                    payload.get("department") or "Customer Success",
                    json.dumps(skills),
                    status,
                    comp["baseSalaryUsd"],
                    comp["performanceBonusUsd"],
                    comp["taxDeductionUsd"],
                    int(payload.get("maxCapacity") or 5),
                    today_iso(),
                ),
            )

            current_period = datetime.now(timezone.utc).strftime("%Y-%m")
            conn.execute(
                """
                INSERT INTO payroll_records (
                    id, employee_id, employee_name, role, department, period_month,
                    base_salary_usd, performance_bonus_usd, tax_deduction_usd, net_pay_usd, status, disbursed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NULL)
                """,
                (
                    f"pay-{int(time.time() * 1000)}",
                    emp_id,
                    payload["name"].strip(),
                    payload["role"].strip(),
                    payload.get("department") or "Customer Success",
                    current_period,
                    comp["baseSalaryUsd"],
                    comp["performanceBonusUsd"],
                    comp["taxDeductionUsd"],
                    comp["netPayUsd"],
                ),
            )

            self._log_event(
                conn,
                "HR & Payroll",
                "EMPLOYEE_DIRECT_HIRED",
                f"Onboarded {payload['name'].strip()} as {payload['role'].strip()} (${salary:,}/mo).",
                "Python HR Ops",
            )
            conn.commit()

        snap = self.get_snapshot()
        emp_obj = next(e for e in snap["employees"] if e["id"] == emp_id)
        return {"employee": emp_obj, "snapshot": snap}

    def update_employee_compensation(
        self,
        emp_id: str,
        base_salary_usd: int,
        performance_bonus_usd: int,
        employment_status: Optional[str] = None,
    ) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT * FROM employees WHERE id = ?", (emp_id,)).fetchone()
            if not row:
                raise ValueError("Employee not found.")
            comp = calculate_kpi_bonus_and_tax(
                max(500, int(base_salary_usd)),
                float(row["csat_score"]),
                0,
                override_bonus=max(0, int(performance_bonus_usd)),
            )
            next_status = employment_status if employment_status in ("Active", "Probation") else row["employment_status"]
            conn.execute(
                """
                UPDATE employees SET
                    base_salary_usd = ?,
                    performance_bonus_usd = ?,
                    tax_deduction_usd = ?,
                    employment_status = ?
                WHERE id = ?
                """,
                (
                    comp["baseSalaryUsd"],
                    comp["performanceBonusUsd"],
                    comp["taxDeductionUsd"],
                    next_status,
                    emp_id,
                ),
            )
            conn.execute(
                """
                UPDATE payroll_records SET
                    base_salary_usd = ?,
                    performance_bonus_usd = ?,
                    tax_deduction_usd = ?,
                    net_pay_usd = ?
                WHERE employee_id = ? AND status = 'Pending'
                """,
                (
                    comp["baseSalaryUsd"],
                    comp["performanceBonusUsd"],
                    comp["taxDeductionUsd"],
                    comp["netPayUsd"],
                    emp_id,
                ),
            )
            self._log_event(
                conn,
                "HR & Payroll",
                "SALARY_STRUCTURE_UPDATED",
                f"Updated {row['name']} compensation: Base ${comp['baseSalaryUsd']:,}, Bonus ${comp['performanceBonusUsd']:,}, Net ${comp['netPayUsd']:,}.",
                "Python Payroll Controller",
            )
            conn.commit()

        snap = self.get_snapshot()
        emp_obj = next(e for e in snap["employees"] if e["id"] == emp_id)
        return {"employee": emp_obj, "snapshot": snap}

    def offboard_employee(
        self,
        emp_id: str,
        reason: str,
        handover_emp_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT * FROM employees WHERE id = ?", (emp_id,)).fetchone()
            if not row:
                raise ValueError("Employee not found.")
            active_others = conn.execute(
                "SELECT id, active_accounts_count, max_capacity, csat_score, employment_status FROM employees WHERE id != ? AND employment_status != 'Offboarded'",
                (emp_id,),
            ).fetchall()
            if not active_others:
                raise ValueError("Cannot offboard the last active specialist without hiring a replacement first.")

            if handover_emp_id and any(o["id"] == handover_emp_id for o in active_others):
                successor_id = handover_emp_id
            else:
                other_dicts = [
                    {
                        "id": o["id"],
                        "activeAccountsCount": o["active_accounts_count"],
                        "maxCapacity": o["max_capacity"],
                        "csatScore": o["csat_score"],
                        "employmentStatus": o["employment_status"],
                    }
                    for o in active_others
                ]
                successor_id = select_handover_specialist(emp_id, other_dicts) or active_others[0]["id"]

            successor_row = conn.execute("SELECT name FROM employees WHERE id = ?", (successor_id,)).fetchone()
            transferred_cnt = conn.execute(
                "SELECT COUNT(*) AS c FROM customers WHERE assigned_employee_id = ?", (emp_id,)
            ).fetchone()["c"]

            conn.execute(
                "UPDATE customers SET assigned_employee_id = ?, last_contact_at = ? WHERE assigned_employee_id = ?",
                (successor_id, today_iso(), emp_id),
            )
            conn.execute(
                "UPDATE deals SET owner_employee_id = ? WHERE owner_employee_id = ? AND stage NOT IN ('Closed Won', 'Closed Lost')",
                (successor_id, emp_id),
            )
            conn.execute(
                "UPDATE emails SET assigned_employee_id = ? WHERE assigned_employee_id = ? AND status != 'Auto-Replied'",
                (successor_id, emp_id),
            )

            conn.execute(
                """
                UPDATE employees SET
                    employment_status = 'Offboarded',
                    offboard_reason = ?,
                    offboarded_at = ?,
                    active_accounts_count = 0,
                    burnout_risk = 'Low'
                WHERE id = ?
                """,
                (reason.strip() or "Organizational Restructuring", today_iso(), emp_id),
            )
            conn.execute(
                "DELETE FROM payroll_records WHERE employee_id = ? AND status = 'Pending'",
                (emp_id,),
            )

            self._recompute_employee_loads(conn)
            self._log_event(
                conn,
                "HR & Payroll",
                "EMPLOYEE_OFFBOARDED_WITH_HANDOVER",
                f"Offboarded {row['name']} ({reason.strip()}). Transferred {transferred_cnt} client account(s) & open deals to {successor_row['name']}.",
                "Python Offboarding Guard",
            )
            conn.commit()

        snap = self.get_snapshot()
        emp_obj = next(e for e in snap["employees"] if e["id"] == emp_id)
        return {"employee": emp_obj, "snapshot": snap}

    def reinstate_employee(self, emp_id: str) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT * FROM employees WHERE id = ?", (emp_id,)).fetchone()
            if not row:
                raise ValueError("Employee not found.")
            conn.execute(
                "UPDATE employees SET employment_status = 'Active', offboard_reason = NULL, offboarded_at = NULL WHERE id = ?",
                (emp_id,),
            )
            self._recompute_employee_loads(conn)
            self._log_event(
                conn,
                "HR & Payroll",
                "EMPLOYEE_REINSTATED",
                f"Reinstated {row['name']} to Active workforce roster.",
                "Python HR Ops",
            )
            conn.commit()

        snap = self.get_snapshot()
        emp_obj = next(e for e in snap["employees"] if e["id"] == emp_id)
        return {"employee": emp_obj, "snapshot": snap}

    def commit_comp_review(self, emp_id: str, review: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT * FROM employees WHERE id = ?", (emp_id,)).fetchone()
            if not row:
                raise ValueError("Employee not found.")
            conn.execute(
                "UPDATE employees SET comp_review_json = ? WHERE id = ?",
                (json.dumps(review), emp_id),
            )
            self._log_event(
                conn,
                "HR & Payroll",
                "AI_COMPENSATION_AUDIT_COMPLETED",
                f"AI Compensation & Performance review for {row['name']}: {review['standingVerdict']}.",
                "Gemini 3.8 HR Auditor",
            )
            conn.commit()

        snap = self.get_snapshot()
        emp_obj = next(e for e in snap["employees"] if e["id"] == emp_id)
        return {"employee": emp_obj, "snapshot": snap}

    def generate_payroll_batch(self, period_month: str) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            active_emps = conn.execute(
                "SELECT * FROM employees WHERE employment_status != 'Offboarded'"
            ).fetchall()
            created_cnt = 0
            for emp in active_emps:
                existing = conn.execute(
                    "SELECT id, status FROM payroll_records WHERE employee_id = ? AND period_month = ?",
                    (emp["id"], period_month),
                ).fetchone()
                managed_arr = conn.execute(
                    "SELECT COALESCE(SUM(arr_usd), 0) AS total_arr FROM customers WHERE assigned_employee_id = ?",
                    (emp["id"],),
                ).fetchone()["total_arr"]

                unpaid_days = conn.execute(
                    "SELECT COALESCE(SUM(days_count), 0) AS d FROM leave_requests WHERE employee_id = ? AND leave_type = 'UnpaidLeave' AND status = 'Approved' AND substr(start_date, 1, 7) = ?",
                    (emp["id"], period_month),
                ).fetchone()["d"]

                comp = calculate_kpi_bonus_and_tax(
                    int(emp["base_salary_usd"]),
                    float(emp["csat_score"]),
                    int(managed_arr),
                    unpaid_leave_days=int(unpaid_days),
                )

                conn.execute(
                    "UPDATE employees SET performance_bonus_usd = ?, tax_deduction_usd = ? WHERE id = ?",
                    (comp["performanceBonusUsd"], comp["taxDeductionUsd"], emp["id"]),
                )

                if not existing:
                    conn.execute(
                        """
                        INSERT INTO payroll_records (
                            id, employee_id, employee_name, role, department, period_month,
                            base_salary_usd, performance_bonus_usd, tax_deduction_usd, net_pay_usd, status, disbursed_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NULL)
                        """,
                        (
                            f"pay-{period_month}-{emp['id']}-{os.urandom(2).hex()}",
                            emp["id"],
                            emp["name"],
                            emp["role"],
                            emp["department"],
                            period_month,
                            comp["baseSalaryUsd"],
                            comp["performanceBonusUsd"],
                            comp["taxDeductionUsd"],
                            comp["netPayUsd"],
                        ),
                    )
                    created_cnt += 1
                elif existing["status"] == "Pending":
                    conn.execute(
                        """
                        UPDATE payroll_records SET
                            base_salary_usd = ?,
                            performance_bonus_usd = ?,
                            tax_deduction_usd = ?,
                            net_pay_usd = ?
                        WHERE id = ?
                        """,
                        (
                            comp["baseSalaryUsd"],
                            comp["performanceBonusUsd"],
                            comp["taxDeductionUsd"],
                            comp["netPayUsd"],
                            existing["id"],
                        ),
                    )

            self._log_event(
                conn,
                "HR & Payroll",
                "PAYROLL_BATCH_CALCULATED",
                f"Python KPI Payroll Engine calculated {period_month} salaries, ARR commissions & leave adjustments ({created_cnt} new slips).",
                "Python Payroll Engine",
            )
            conn.commit()

        return {"snapshot": self.get_snapshot()}

    def disburse_payroll(
        self,
        payroll_id: Optional[str] = None,
        period_month: Optional[str] = None,
    ) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            now = utc_iso()
            if payroll_id:
                row = conn.execute("SELECT * FROM payroll_records WHERE id = ?", (payroll_id,)).fetchone()
                if not row:
                    raise ValueError("Payslip record not found.")
                conn.execute(
                    "UPDATE payroll_records SET status = 'Disbursed', disbursed_at = ? WHERE id = ?",
                    (now, payroll_id),
                )
                conn.execute(
                    "UPDATE employees SET last_paid_period = ? WHERE id = ?",
                    (row["period_month"], row["employee_id"]),
                )
                self._log_event(
                    conn,
                    "HR & Payroll",
                    "SALARY_DISBURSED",
                    f"Disbursed ${row['net_pay_usd']:,} net salary to {row['employee_name']} for {row['period_month']}.",
                    "Python Treasury & Payroll",
                )
            elif period_month:
                rows = conn.execute(
                    "SELECT * FROM payroll_records WHERE period_month = ? AND status = 'Pending'",
                    (period_month,),
                ).fetchall()
                total_net = sum(r["net_pay_usd"] for r in rows)
                conn.execute(
                    "UPDATE payroll_records SET status = 'Disbursed', disbursed_at = ? WHERE period_month = ? AND status = 'Pending'",
                    (now, period_month),
                )
                for r in rows:
                    conn.execute(
                        "UPDATE employees SET last_paid_period = ? WHERE id = ?",
                        (period_month, r["employee_id"]),
                    )
                self._log_event(
                    conn,
                    "HR & Payroll",
                    "BATCH_PAYROLL_DISBURSED",
                    f"Disbursed {len(rows)} payslips totaling ${total_net:,} net for period {period_month}.",
                    "Python Treasury & Payroll",
                )
            conn.commit()

        return {"snapshot": self.get_snapshot()}

    def create_customer(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            cust_id = f"cust-{int(time.time() * 1000)}"
            first_emp = conn.execute(
                "SELECT id FROM employees WHERE employment_status != 'Offboarded' LIMIT 1"
            ).fetchone()
            owner_id = payload.get("assignedEmployeeId") or (first_emp["id"] if first_emp else "emp-101")
            arr_val = int(payload.get("arrUsd") or 75000)

            conn.execute(
                """
                INSERT INTO customers (
                    id, company_name, industry, contact_name, contact_email, arr_usd,
                    health_score, nps_score, active_seats_ratio, churn_risk, renewal_date,
                    assigned_employee_id, last_contact_at, tenure_months, avatar_key, notes, retention_plan_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    cust_id,
                    payload["companyName"].strip(),
                    (payload.get("industry") or "Enterprise SaaS").strip(),
                    payload["contactName"].strip(),
                    payload["contactEmail"].strip(),
                    arr_val,
                    82,
                    8,
                    0.85,
                    "Low",
                    payload.get("renewalDate") or "2027-09-30",
                    owner_id,
                    today_iso(),
                    1,
                    "client",
                    (payload.get("notes") or "Enrolled in 30-60-90 day Python retention cadence.").strip(),
                    None,
                ),
            )
            self._recompute_employee_loads(conn)
            self._log_event(
                conn,
                "Customer Retention",
                "CUSTOMER_ACCOUNT_ONBOARDED",
                f"Onboarded {payload['companyName'].strip()} (${arr_val:,} ARR) into SQLite.",
                "Python Account Service",
            )
            conn.commit()

        snap = self.get_snapshot()
        cust_obj = next(c for c in snap["customers"] if c["id"] == cust_id)
        return {"customer": cust_obj, "snapshot": snap}

    def assign_customer(self, cust_id: str, emp_id: str) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT * FROM customers WHERE id = ?", (cust_id,)).fetchone()
            if not row:
                raise ValueError("Customer not found.")
            conn.execute(
                "UPDATE customers SET assigned_employee_id = ?, last_contact_at = ? WHERE id = ?",
                (emp_id, today_iso(), cust_id),
            )
            self._recompute_employee_loads(conn)
            self._log_event(
                conn,
                "Customer Retention",
                "ACCOUNT_OWNER_REASSIGNED",
                f"Python portfolio balancer reassigned {row['company_name']} to {emp_id}.",
                "Python Portfolio Balancer",
            )
            conn.commit()

        snap = self.get_snapshot()
        cust_obj = next(c for c in snap["customers"] if c["id"] == cust_id)
        return {"customer": cust_obj, "snapshot": snap}

    def commit_retention_plan(self, cust_id: str, plan: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT * FROM customers WHERE id = ?", (cust_id,)).fetchone()
            if not row:
                raise ValueError("Customer not found.")
            conn.execute(
                "UPDATE customers SET retention_plan_json = ? WHERE id = ?",
                (json.dumps(plan), cust_id),
            )
            self._log_event(
                conn,
                "Customer Retention",
                "AI_RETENTION_PLAYBOOK_CREATED",
                f"Stored 3-horizon retention playbook for {row['company_name']} in SQLite.",
                "Python Retention Service",
            )
            conn.commit()

        snap = self.get_snapshot()
        cust_obj = next(c for c in snap["customers"] if c["id"] == cust_id)
        return {"customer": cust_obj, "snapshot": snap}

    def execute_retention_intervention(self, cust_id: str) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT * FROM customers WHERE id = ?", (cust_id,)).fetchone()
            if not row:
                raise ValueError("Customer not found.")
            new_health = min(100, row["health_score"] + 12)
            new_seats = round(min(0.99, row["active_seats_ratio"] + 0.08), 2)
            new_risk = compute_churn_risk(new_health, new_seats)

            conn.execute(
                "UPDATE customers SET health_score = ?, active_seats_ratio = ?, churn_risk = ?, last_contact_at = ? WHERE id = ?",
                (new_health, new_seats, new_risk, today_iso(), cust_id),
            )

            if row["retention_plan_json"]:
                plan = json.loads(row["retention_plan_json"])
                eml_id = f"eml-{int(time.time() * 1000)}"
                conn.execute(
                    """
                    INSERT INTO emails (
                        id, customer_id, customer_name, company_name, customer_email, subject,
                        inbound_body, received_at, category, sentiment, urgency, status,
                        assigned_employee_id, sent_reply, replied_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        eml_id,
                        row["id"],
                        row["contact_name"],
                        row["company_name"],
                        row["contact_email"],
                        plan["outreachSubject"],
                        "[Proactive Retention Check-In Dispatched by Python Retention Engine]",
                        utc_iso(),
                        "Proactive Executive Retention",
                        "Positive",
                        "Medium",
                        "Auto-Replied",
                        row["assigned_employee_id"],
                        plan["outreachBody"],
                        utc_iso(),
                    ),
                )

            self._log_event(
                conn,
                "Customer Retention",
                "RETENTION_INTERVENTION_EXECUTED",
                f"Python retention workflow boosted {row['company_name']} health to {new_health}/100 ({new_risk} Risk).",
                "Python Retention Engine",
            )
            conn.commit()

        snap = self.get_snapshot()
        cust_obj = next(c for c in snap["customers"] if c["id"] == cust_id)
        return {"customer": cust_obj, "snapshot": snap}

    def commit_employee_longevity(self, emp_id: str, plan: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT * FROM employees WHERE id = ?", (emp_id,)).fetchone()
            if not row:
                raise ValueError("Employee not found.")
            new_ret = max(row["retention_score"], int(plan.get("retentionForecast12m", row["retention_score"])))
            conn.execute(
                "UPDATE employees SET retention_score = ?, longevity_plan_json = ? WHERE id = ?",
                (new_ret, json.dumps(plan), emp_id),
            )
            self._log_event(
                conn,
                "Platform Longevity",
                "AI_EMPLOYEE_LONGEVITY_PLAN_BUILT",
                f"Saved 12-month career & burnout roadmap for {row['name']} in SQLite.",
                "Python People Longevity Engine",
            )
            conn.commit()

        snap = self.get_snapshot()
        emp_obj = next(e for e in snap["employees"] if e["id"] == emp_id)
        return {"employee": emp_obj, "snapshot": snap}

    # --- Real-World Authentication, RBAC, Settings, CSV Import & Data Control ---
    def _create_session_for_user(self, conn: sqlite3.Connection, user_row: sqlite3.Row) -> Dict[str, Any]:
        token = secrets.token_urlsafe(32)
        expires_at = int(time.time()) + (30 * 86400)
        conn.execute(
            "INSERT INTO user_sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token, user_row["id"], utc_iso(), expires_at),
        )
        return {
            "token": token,
            "user": {
                "id": user_row["id"],
                "name": user_row["name"],
                "email": user_row["email"],
                "role": user_row["role"],
                "title": user_row["title"],
            },
        }

    def list_users(self) -> List[Dict[str, Any]]:
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                """
                SELECT id, name, email, role, title, created_at
                FROM app_users
                ORDER BY CASE role WHEN 'Admin' THEN 1 WHEN 'HRManager' THEN 2 ELSE 3 END, created_at ASC
                """
            ).fetchall()
            return [
                {
                    "id": r["id"],
                    "name": r["name"],
                    "email": r["email"],
                    "role": r["role"],
                    "title": r["title"],
                    "createdAt": r["created_at"],
                }
                for r in rows
            ]

    def register_specialist_user(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        requested_role = (payload.get("role") or "").strip()
        if requested_role == "Admin":
            raise ValueError(
                "Administrator accounts cannot be registered from the website. "
                "Admin accounts can only be created directly in SQLite (manage_admin.py)."
            )
        name = (payload.get("name") or "").strip()
        email = (payload.get("email") or "").strip().lower()
        password = payload.get("password") or ""
        title = (payload.get("title") or "CRM Account Specialist").strip()

        if not name or not email or "@" not in email or len(password) < 6:
            raise ValueError("Full name, valid work email, and password (min 6 characters) are required.")

        with self._lock, self._connect() as conn:
            existing = conn.execute("SELECT id FROM app_users WHERE email = ?", (email,)).fetchone()
            if existing:
                raise ValueError("An account with this email already exists. Please sign in.")

            uid = f"usr-{int(time.time() * 1000)}"
            pw_hash, salt = hash_password_pbkdf2(password)
            # Website registration is strictly locked to 'Specialist' — never 'Admin'
            conn.execute(
                """
                INSERT INTO app_users (id, name, email, password_hash, salt, role, title, created_at)
                VALUES (?, ?, ?, ?, ?, 'Specialist', ?, ?)
                """,
                (uid, name, email, pw_hash, salt, title, utc_iso()),
            )
            user_row = conn.execute("SELECT * FROM app_users WHERE id = ?", (uid,)).fetchone()
            sess = self._create_session_for_user(conn, user_row)
            self._log_event(
                conn,
                "Settings & Auth",
                "SPECIALIST_REGISTERED",
                f"New Specialist account registered via portal: {name} ({email}).",
                name,
            )
            conn.commit()

        return {**sess, "snapshot": self.get_snapshot()}

    def admin_create_staff_user(self, payload: Dict[str, Any], actor_name: str = "System Admin") -> Dict[str, Any]:
        name = (payload.get("name") or "").strip()
        email = (payload.get("email") or "").strip().lower()
        password = payload.get("password") or ""
        requested_role = (payload.get("role") or "Specialist").strip()

        if requested_role == "Admin":
            raise ValueError(
                "Security Policy: Administrator accounts cannot be created from the web interface. "
                "Provision Admin accounts directly in SQLite using: python3 backend_python/manage_admin.py create-admin"
            )
        if requested_role not in ("HRManager", "Specialist"):
            raise ValueError("Allowed staff roles are HRManager or Specialist.")
        if not name or not email or "@" not in email or len(password) < 6:
            raise ValueError("Valid full name, work email, and password (min 6 characters) are required.")

        default_title = "HR & Payroll Manager" if requested_role == "HRManager" else "CRM Account Specialist"
        title = (payload.get("title") or default_title).strip()

        with self._lock, self._connect() as conn:
            existing = conn.execute("SELECT id FROM app_users WHERE email = ?", (email,)).fetchone()
            if existing:
                raise ValueError("An account with this email already exists.")

            uid = f"usr-{int(time.time() * 1000)}"
            pw_hash, salt = hash_password_pbkdf2(password)
            conn.execute(
                """
                INSERT INTO app_users (id, name, email, password_hash, salt, role, title, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (uid, name, email, pw_hash, salt, requested_role, title, utc_iso()),
            )
            self._log_event(
                conn,
                "Settings & Auth",
                "STAFF_ACCOUNT_PROVISIONED",
                f"Admin {actor_name} provisioned {requested_role} login for {name} ({email}).",
                actor_name,
            )
            conn.commit()

        return {"users": self.list_users(), "snapshot": self.get_snapshot()}

    def admin_reset_user_password(
        self, target_user_id: str, new_password: str, actor_id: str, actor_name: str
    ) -> Dict[str, Any]:
        if len(new_password or "") < 6:
            raise ValueError("New password must be at least 6 characters.")
        with self._lock, self._connect() as conn:
            target = conn.execute("SELECT * FROM app_users WHERE id = ?", (target_user_id,)).fetchone()
            if not target:
                raise ValueError("Target user account not found.")
            if target["role"] == "Admin" and target["id"] != actor_id:
                raise ValueError(
                    "Other Administrator passwords can only be reset directly via database CLI (manage_admin.py)."
                )
            pw_hash, salt = hash_password_pbkdf2(new_password)
            conn.execute(
                "UPDATE app_users SET password_hash = ?, salt = ? WHERE id = ?",
                (pw_hash, salt, target_user_id),
            )
            if target["id"] != actor_id:
                conn.execute("DELETE FROM user_sessions WHERE user_id = ?", (target_user_id,))
            self._log_event(
                conn,
                "Settings & Auth",
                "USER_PASSWORD_RESET",
                f"Admin {actor_name} updated password for {target['email']} ({target['role']}).",
                actor_name,
            )
            conn.commit()
        return {"users": self.list_users(), "snapshot": self.get_snapshot()}

    def admin_delete_user(self, target_user_id: str, actor_id: str, actor_name: str) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            target = conn.execute("SELECT * FROM app_users WHERE id = ?", (target_user_id,)).fetchone()
            if not target:
                raise ValueError("Target user account not found.")
            if target["role"] == "Admin":
                raise ValueError(
                    "Administrator accounts are database-protected and can only be removed via backend_python/manage_admin.py."
                )
            if target["id"] == actor_id:
                raise ValueError("You cannot delete your own active account.")
            conn.execute("DELETE FROM user_sessions WHERE user_id = ?", (target_user_id,))
            conn.execute("DELETE FROM app_users WHERE id = ?", (target_user_id,))
            self._log_event(
                conn,
                "Settings & Auth",
                "STAFF_ACCOUNT_REVOKED",
                f"Admin {actor_name} revoked login access for {target['email']} ({target['role']}).",
                actor_name,
            )
            conn.commit()
        return {"users": self.list_users(), "snapshot": self.get_snapshot()}

    def login_user(self, email: str, password: str) -> Dict[str, Any]:
        clean_email = (email or "").strip().lower()
        with self._lock, self._connect() as conn:
            user_row = conn.execute("SELECT * FROM app_users WHERE email = ?", (clean_email,)).fetchone()
            if not user_row or not verify_password_pbkdf2(password or "", user_row["salt"], user_row["password_hash"]):
                raise ValueError("Invalid email or password.")
            sess = self._create_session_for_user(conn, user_row)
            self._log_event(
                conn,
                "Settings & Auth",
                "USER_SIGNED_IN",
                f"{user_row['name']} ({user_row['role']}) signed in.",
                user_row["name"],
            )
            conn.commit()
        return {**sess, "snapshot": self.get_snapshot()}

    def get_user_by_token(self, token: str) -> Optional[Dict[str, Any]]:
        if not token:
            return None
        now_ts = int(time.time())
        with self._lock, self._connect() as conn:
            sess = conn.execute(
                "SELECT * FROM user_sessions WHERE token = ? AND expires_at > ?",
                (token, now_ts),
            ).fetchone()
            if not sess:
                return None
            u = conn.execute("SELECT * FROM app_users WHERE id = ?", (sess["user_id"],)).fetchone()
            if not u:
                return None
            return {
                "id": u["id"],
                "name": u["name"],
                "email": u["email"],
                "role": u["role"],
                "title": u["title"],
            }

    def logout_user(self, token: str) -> Dict[str, Any]:
        if token:
            with self._lock, self._connect() as conn:
                conn.execute("DELETE FROM user_sessions WHERE token = ?", (token,))
                conn.commit()
        return {"ok": True}

    def update_org_settings(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            cur_code = payload.get("currencyCode") if payload.get("currencyCode") in ("USD", "BDT") else "USD"
            cur_sym = "৳" if cur_code == "BDT" else "$"
            comp_name = (payload.get("companyName") or "Aetheris CRM").strip()
            comp_domain = (payload.get("companyDomain") or "aetheris.io").strip()
            sup_email = (payload.get("supportEmail") or f"support@{comp_domain}").strip()
            comp_addr = (payload.get("companyAddress") or "Dhaka, Bangladesh").strip()
            tax_pct = max(0.0, min(40.0, float(payload.get("defaultTaxRatePct") if payload.get("defaultTaxRatePct") is not None else 10.0)))
            sla_hrs = max(1, int(payload.get("slaTargetHours") or 4))
            auto_wh = 1 if payload.get("autoTriageWebhook", True) else 0

            conn.execute(
                """
                UPDATE org_settings SET
                    company_name = ?,
                    company_domain = ?,
                    support_email = ?,
                    company_address = ?,
                    currency_code = ?,
                    currency_symbol = ?,
                    default_tax_rate_pct = ?,
                    sla_target_hours = ?,
                    auto_triage_webhook = ?
                WHERE id = 1
                """,
                (comp_name, comp_domain, sup_email, comp_addr, cur_code, cur_sym, tax_pct, sla_hrs, auto_wh),
            )
            self._log_event(
                conn,
                "Settings & Auth",
                "ORG_SETTINGS_UPDATED",
                f"Updated organization profile for {comp_name} ({cur_code} {cur_sym}, Tax {tax_pct}%).",
                "Workspace Admin",
            )
            conn.commit()
        return {"snapshot": self.get_snapshot()}

    def reset_workspace_data(self, mode: str, actor_name: str = "Workspace Admin") -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            for tbl in (
                "leave_requests",
                "payroll_records",
                "deals",
                "emails",
                "candidates",
                "customers",
                "employees",
                "domain_events",
            ):
                conn.execute(f"DELETE FROM {tbl}")

            if mode == "restore_demo":
                self._seed_initial_data(conn)
                self._recompute_employee_loads(conn)
                self._seed_payroll_if_empty(conn)
                self._seed_deals_if_empty(conn)
                self._seed_leaves_if_empty(conn)
                self._log_event(
                    conn,
                    "Settings & Auth",
                    "DEMO_DATA_RESTORED",
                    "Restored reference enterprise dataset across CRM, Pipeline, and HR tables.",
                    actor_name,
                )
            else:
                # Start Fresh Workspace: create 1 active founder/specialist record so routing/ownership works immediately
                org_row = conn.execute("SELECT * FROM org_settings WHERE id = 1").fetchone()
                domain = org_row["company_domain"] if org_row else "company.io"
                founder_id = f"emp-{int(time.time() * 1000)}"
                conn.execute(
                    """
                    INSERT INTO employees (
                        id, name, email, role, department, skills_json, employment_status,
                        base_salary_usd, performance_bonus_usd, tax_deduction_usd, attendance_rate_pct, last_paid_period,
                        offboard_reason, offboarded_at, active_accounts_count, max_capacity,
                        csat_score, retention_score, burnout_risk, tenure_months, career_track,
                        joined_at, hired_from_candidate_id, avatar_key, longevity_plan_json, comp_review_json
                    ) VALUES (?, ?, ?, 'Founder & Principal Account Lead', 'Customer Success', ?, 'Active', 6000, 0, 600, 100.0, NULL, NULL, NULL, 0, 8, 99.0, 99, 'Low', 1, 'Executive Track', ?, NULL, 'admin', NULL, NULL)
                    """,
                    (
                        founder_id,
                        actor_name,
                        f"lead@{domain}",
                        json.dumps(["Enterprise Support", "Bengali & English Support", "Sales & Retention"]),
                        today_iso(),
                    ),
                )
                self._log_event(
                    conn,
                    "Settings & Auth",
                    "CLEAN_WORKSPACE_INITIALIZED",
                    f"Cleared sample demo records and initialized clean production workspace for {actor_name}.",
                    actor_name,
                )
            conn.commit()
        return {"snapshot": self.get_snapshot()}

    def import_customers_csv(self, csv_text: str) -> Dict[str, Any]:
        reader = csv.DictReader(io.StringIO((csv_text or "").strip()))
        imported = 0
        with self._lock, self._connect() as conn:
            first_emp = conn.execute(
                "SELECT id FROM employees WHERE employment_status != 'Offboarded' LIMIT 1"
            ).fetchone()
            default_owner = first_emp["id"] if first_emp else "emp-101"

            for idx, row in enumerate(reader):
                norm = {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}
                comp = norm.get("company_name") or norm.get("company") or norm.get("companyname")
                contact = norm.get("contact_name") or norm.get("contact") or norm.get("name") or "Primary Contact"
                c_email = norm.get("contact_email") or norm.get("email")
                if not comp or not c_email:
                    continue
                ind = norm.get("industry") or "Commercial Business"
                try:
                    arr_val = max(0, int(float(norm.get("arr_usd") or norm.get("arr") or norm.get("value") or "24000")))
                except ValueError:
                    arr_val = 24000
                ren = norm.get("renewal_date") or "2027-12-31"
                notes = norm.get("notes") or "Imported via CSV Bulk Onboarding."
                cid = f"cust-imp-{int(time.time() * 1000)}-{idx}"

                conn.execute(
                    """
                    INSERT INTO customers (
                        id, company_name, industry, contact_name, contact_email, arr_usd,
                        health_score, nps_score, active_seats_ratio, churn_risk, renewal_date,
                        assigned_employee_id, last_contact_at, tenure_months, avatar_key, notes, retention_plan_json
                    ) VALUES (?, ?, ?, ?, ?, ?, 84, 8, 0.85, 'Low', ?, ?, ?, 1, 'client', ?, NULL)
                    """,
                    (cid, comp, ind, contact, c_email, arr_val, ren, default_owner, today_iso(), notes),
                )
                imported += 1

            if imported == 0:
                raise ValueError("No valid customer rows found. Required CSV columns: company_name, contact_name, contact_email.")

            self._recompute_employee_loads(conn)
            self._log_event(
                conn,
                "Customer Retention",
                "CSV_CUSTOMERS_IMPORTED",
                f"Bulk-imported {imported} customer account(s) via CSV.",
                "Python CSV Importer",
            )
            conn.commit()
        return {"importedCount": imported, "snapshot": self.get_snapshot()}

    def import_employees_csv(self, csv_text: str) -> Dict[str, Any]:
        reader = csv.DictReader(io.StringIO((csv_text or "").strip()))
        imported = 0
        current_period = datetime.now(timezone.utc).strftime("%Y-%m")
        with self._lock, self._connect() as conn:
            for idx, row in enumerate(reader):
                norm = {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}
                name = norm.get("name") or norm.get("employee_name")
                email = norm.get("email") or norm.get("work_email")
                role = norm.get("role") or "CRM Account Specialist"
                if not name or not email:
                    continue
                dept = norm.get("department") or "Customer Success"
                try:
                    salary = max(500, int(float(norm.get("base_salary_usd") or norm.get("salary") or "4500")))
                except ValueError:
                    salary = 4500
                raw_skills = norm.get("skills") or "Client Retention; Bengali & English Support"
                skills = [s.strip() for s in raw_skills.replace(";", ",").split(",") if s.strip()]
                comp = calculate_kpi_bonus_and_tax(salary, 96.0, 0)
                eid = f"emp-imp-{int(time.time() * 1000)}-{idx}"

                conn.execute(
                    """
                    INSERT INTO employees (
                        id, name, email, role, department, skills_json, employment_status,
                        base_salary_usd, performance_bonus_usd, tax_deduction_usd, attendance_rate_pct, last_paid_period,
                        offboard_reason, offboarded_at, active_accounts_count, max_capacity,
                        csat_score, retention_score, burnout_risk, tenure_months, career_track,
                        joined_at, hired_from_candidate_id, avatar_key, longevity_plan_json, comp_review_json
                    ) VALUES (?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?, 100.0, NULL, NULL, NULL, 0, 5, 96.0, 94, 'Low', 1, 'Specialist Track', ?, NULL, 'candidate', NULL, NULL)
                    """,
                    (
                        eid,
                        name,
                        email,
                        role,
                        dept,
                        json.dumps(skills),
                        comp["baseSalaryUsd"],
                        comp["performanceBonusUsd"],
                        comp["taxDeductionUsd"],
                        today_iso(),
                    ),
                )
                conn.execute(
                    """
                    INSERT INTO payroll_records (
                        id, employee_id, employee_name, role, department, period_month,
                        base_salary_usd, performance_bonus_usd, tax_deduction_usd, net_pay_usd, status, disbursed_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NULL)
                    """,
                    (
                        f"pay-imp-{int(time.time() * 1000)}-{idx}",
                        eid,
                        name,
                        role,
                        dept,
                        current_period,
                        comp["baseSalaryUsd"],
                        comp["performanceBonusUsd"],
                        comp["taxDeductionUsd"],
                        comp["netPayUsd"],
                    ),
                )
                imported += 1

            if imported == 0:
                raise ValueError("No valid employee rows found. Required CSV columns: name, email, role, base_salary_usd.")

            self._log_event(
                conn,
                "HR & Payroll",
                "CSV_EMPLOYEES_IMPORTED",
                f"Bulk-imported {imported} employee(s) and enrolled in payroll via CSV.",
                "Python CSV Importer",
            )
            conn.commit()
        return {"importedCount": imported, "snapshot": self.get_snapshot()}

    def update_customer(self, cust_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT * FROM customers WHERE id = ?", (cust_id,)).fetchone()
            if not row:
                raise ValueError("Customer account not found.")
            comp = (payload.get("companyName") or row["company_name"]).strip()
            ind = (payload.get("industry") or row["industry"]).strip()
            c_name = (payload.get("contactName") or row["contact_name"]).strip()
            c_email = (payload.get("contactEmail") or row["contact_email"]).strip()
            arr_val = max(0, int(payload.get("arrUsd") if payload.get("arrUsd") is not None else row["arr_usd"]))
            health = max(1, min(100, int(payload.get("healthScore") if payload.get("healthScore") is not None else row["health_score"])))
            ren = payload.get("renewalDate") or row["renewal_date"]
            notes = (payload.get("notes") if payload.get("notes") is not None else row["notes"]).strip()
            risk = compute_churn_risk(health, float(row["active_seats_ratio"]))

            conn.execute(
                """
                UPDATE customers SET
                    company_name = ?,
                    industry = ?,
                    contact_name = ?,
                    contact_email = ?,
                    arr_usd = ?,
                    health_score = ?,
                    churn_risk = ?,
                    renewal_date = ?,
                    notes = ?
                WHERE id = ?
                """,
                (comp, ind, c_name, c_email, arr_val, health, risk, ren, notes, cust_id),
            )
            self._log_event(
                conn,
                "Customer Retention",
                "CUSTOMER_ACCOUNT_UPDATED",
                f"Updated account details for {comp} (ARR {arr_val:,}, Health {health}%).",
                "CRM Account Manager",
            )
            conn.commit()
        snap = self.get_snapshot()
        cust_obj = next(c for c in snap["customers"] if c["id"] == cust_id)
        return {"customer": cust_obj, "snapshot": snap}

    def delete_record(self, entity_type: str, record_id: str) -> Dict[str, Any]:
        table_map = {
            "customer": ("customers", "Customer Retention"),
            "deal": ("deals", "Revenue Pipeline"),
            "email": ("emails", "Email Automation"),
            "candidate": ("candidates", "Talent & Interview"),
        }
        if entity_type not in table_map:
            raise ValueError("Unsupported entity type for deletion.")
        tbl, mod = table_map[entity_type]
        with self._lock, self._connect() as conn:
            conn.execute(f"DELETE FROM {tbl} WHERE id = ?", (record_id,))
            self._recompute_employee_loads(conn)
            self._log_event(
                conn,
                mod,
                f"{entity_type.upper()}_DELETED",
                f"Removed {entity_type} record ({record_id}) from workspace.",
                "Workspace Operator",
            )
            conn.commit()
        return {"snapshot": self.get_snapshot()}

