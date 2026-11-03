"""
Aetheris CRM & Talent OS — Python Domain Intelligence, Auth Security, Live SMTP & Payroll Engine.
Implements PBKDF2-SHA256 authentication, real outbound SMTP dispatch, deterministic employee
skill-capacity matching, churn risk calibration, deal commission rules, and KPI payroll in Python 3.
"""

from __future__ import annotations
import hashlib
import os
import secrets
import smtplib
import ssl
from email.message import EmailMessage
from typing import Any, Dict, List, Optional, Tuple


STAGE_DEFAULT_PROBABILITY: Dict[str, int] = {
    "Discovery": 25,
    "Technical Validation": 50,
    "Executive Proposal": 70,
    "Contract Negotiation": 85,
    "Closed Won": 100,
    "Closed Lost": 0,
}


def hash_password_pbkdf2(password: str, salt_hex: Optional[str] = None) -> Tuple[str, str]:
    """Hashes a user password with 120,000 rounds of PBKDF2-HMAC-SHA256."""
    salt = bytes.fromhex(salt_hex) if salt_hex else secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return digest.hex(), salt.hex()


def verify_password_pbkdf2(password: str, salt_hex: str, expected_hash_hex: str) -> bool:
    """Constant-time verification of PBKDF2-HMAC-SHA256 password hash."""
    computed_hash, _ = hash_password_pbkdf2(password, salt_hex)
    return secrets.compare_digest(computed_hash, expected_hash_hex)


def is_smtp_configured() -> bool:
    """Checks whether live outbound SMTP relay environment variables are configured."""
    return bool(os.environ.get("SMTP_HOST", "").strip())


def try_dispatch_smtp_email(
    to_email: str,
    subject: str,
    body: str,
    company_name: str = "Aetheris CRM",
    reply_to_email: str = "support@aetheris.io",
) -> str:
    """
    Dispatches a real outbound email via Python smtplib if SMTP_HOST is configured in environment secrets.
    Gracefully records outbox status if SMTP variables are not yet attached.
    """
    smtp_host = os.environ.get("SMTP_HOST", "").strip()
    if not smtp_host:
        return "Saved in Outbox · Ready for Mail Client / SMTP"

    smtp_port = int(os.environ.get("SMTP_PORT", "587") or "587")
    smtp_user = os.environ.get("SMTP_USER", "").strip()
    smtp_pass = os.environ.get("SMTP_PASS", "").strip()
    smtp_from = os.environ.get("SMTP_FROM", "").strip() or smtp_user or reply_to_email

    msg = EmailMessage()
    msg["Subject"] = subject if subject.lower().startswith("re:") else f"Re: {subject}"
    msg["From"] = f"{company_name} <{smtp_from}>"
    msg["To"] = to_email
    msg["Reply-To"] = reply_to_email
    msg.set_content(body)

    try:
        context = ssl.create_default_context()
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10, context=context) as server:
                if smtp_user and smtp_pass:
                    server.login(smtp_user, smtp_pass)
                server.send_message(msg)
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                server.ehlo()
                try:
                    server.starttls(context=context)
                    server.ehlo()
                except smtplib.SMTPException:
                    pass
                if smtp_user and smtp_pass:
                    server.login(smtp_user, smtp_pass)
                server.send_message(msg)
        return f"Delivered via Live SMTP ({smtp_host})"
    except Exception as exc:
        return f"Saved in CRM Outbox (SMTP Notice: {str(exc)[:60]})"


def compute_burnout_risk(active_accounts: int, max_capacity: int) -> str:
    """Calculates specialist burnout risk tier based on active portfolio ratio."""
    if max_capacity <= 0:
        return "Elevated"
    utilization = active_accounts / max_capacity
    if utilization >= 0.90:
        return "Elevated"
    if utilization >= 0.70:
        return "Moderate"
    return "Low"


def compute_churn_risk(health_score: int, active_seats_ratio: float) -> str:
    """Determines enterprise customer churn risk from health index and seat adoption."""
    composite = (health_score * 0.75) + (active_seats_ratio * 100.0 * 0.25)
    if composite >= 78.0:
        return "Low"
    if composite >= 60.0:
        return "Moderate"
    return "High"


def calculate_deal_commission(deal_value_usd: int, deal_type: str) -> int:
    """
    Calculates specialist sales/expansion commission credited to payroll when a deal is Closed Won.
    New Enterprise Logos earn 1.5% instant bonus; Expansion/Renewals earn 0.8%.
    """
    rate = 0.015 if deal_type == "New Enterprise Logo" else 0.008
    return max(150, int(round(deal_value_usd * rate)))


def calculate_kpi_bonus_and_tax(
    base_salary_usd: int,
    csat_score: float,
    managed_arr_usd: int,
    override_bonus: Optional[int] = None,
    unpaid_leave_days: int = 0,
    tax_rate_pct: Optional[float] = None,
) -> Dict[str, int]:
    """
    Computes monthly performance bonus from CSAT excellence + retained ARR portfolio,
    applies pro-rata unpaid leave adjustment if any, and calculates tax deduction.
    """
    daily_rate = base_salary_usd / 30.0
    unpaid_deduction = int(round(daily_rate * max(0, unpaid_leave_days)))
    effective_base = max(0, base_salary_usd - unpaid_deduction)

    if override_bonus is not None:
        bonus = max(0, int(override_bonus))
    else:
        csat_factor = 0.08 if csat_score >= 97.0 else (0.05 if csat_score >= 95.0 else 0.02)
        arr_commission = int(managed_arr_usd * 0.0015)
        bonus = int(round(effective_base * csat_factor)) + arr_commission

    gross = effective_base + bonus
    if tax_rate_pct is not None and tax_rate_pct >= 0:
        tax_rate = min(0.45, tax_rate_pct / 100.0)
    else:
        tax_rate = 0.10 if gross >= 6000 else 0.08
    tax = int(round(gross * tax_rate))
    net_pay = max(0, gross - tax)
    return {
        "baseSalaryUsd": effective_base,
        "performanceBonusUsd": bonus,
        "taxDeductionUsd": tax,
        "netPayUsd": net_pay,
    }


def select_handover_specialist(
    excluded_emp_id: str,
    employees: List[Dict[str, Any]],
) -> Optional[str]:
    """
    Selects the best active CRM specialist to inherit customer accounts or provide SLA leave backup.
    """
    eligible = [
        e
        for e in employees
        if e["id"] != excluded_emp_id and e.get("employmentStatus", "Active") != "Offboarded"
    ]
    if not eligible:
        return None
    eligible.sort(
        key=lambda e: (
            e.get("activeAccountsCount", 0) / max(1, e.get("maxCapacity", 5)),
            -float(e.get("csatScore", 95.0)),
        )
    )
    return eligible[0]["id"]


def rank_employees_for_email(
    inbound_subject: str,
    inbound_body: str,
    employees: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Scores and ranks active (non-offboarded) CRM employees for an inbound email using Python
    lexical skill affinity, CSAT track record, and remaining capacity.
    """
    corpus = f"{inbound_subject} {inbound_body}".lower()
    has_bengali = any("\u0980" <= ch <= "\u09ff" for ch in corpus)

    scored: List[Dict[str, Any]] = []
    for emp in employees:
        if emp.get("employmentStatus", "Active") == "Offboarded":
            continue

        skills: List[str] = emp.get("skills", [])
        active_load = int(emp.get("activeAccountsCount", 0))
        max_cap = max(1, int(emp.get("maxCapacity", 5)))
        csat = float(emp.get("csatScore", 95.0))

        free_ratio = max(0.0, (max_cap - active_load) / max_cap)
        capacity_pts = free_ratio * 35.0

        skill_hits = 0
        for skill in skills:
            tokens = [t.strip().lower() for t in skill.replace("/", " ").split() if len(t) > 2]
            if any(tok in corpus for tok in tokens):
                skill_hits += 1
            if has_bengali and "bengali" in skill.lower():
                skill_hits += 2
        affinity_pts = min(40.0, skill_hits * 14.0)

        csat_pts = (csat / 100.0) * 25.0

        total_score = round(capacity_pts + affinity_pts + csat_pts, 2)
        scored.append(
            {
                "employeeId": emp["id"],
                "name": emp["name"],
                "role": emp["role"],
                "matchScore": total_score,
                "availableSlots": max(0, max_cap - active_load),
            }
        )

    scored.sort(key=lambda item: item["matchScore"], reverse=True)
    return scored
