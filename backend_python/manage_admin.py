#!/usr/bin/env python3
"""
Aetheris CRM & Talent OS — Direct SQLite Database Admin & User Provisioning CLI.

Security Policy:
- Public website registration is disabled.
- Administrator ('Admin') accounts CANNOT be registered or created via any web endpoint.
- Administrator accounts can ONLY be provisioned or modified directly at the database layer
  using this CLI script (or direct SQLite access).

Usage Examples:
  python3 backend_python/manage_admin.py list
  python3 backend_python/manage_admin.py create-admin --email owner@company.com --password "StrongPassword123!" --name "Company Owner"
  python3 backend_python/manage_admin.py create-staff --email hr@company.com --password "StrongPassword123!" --name "HR Lead" --role HRManager
  python3 backend_python/manage_admin.py reset-password --email owner@company.com --password "NewPassword456!"
  python3 backend_python/manage_admin.py delete-user --email oldstaff@company.com
"""

from __future__ import annotations
import argparse
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Ensure sibling modules in backend_python are importable regardless of cwd
THIS_DIR = Path(__file__).resolve().parent
if str(THIS_DIR) not in sys.path:
    sys.path.insert(0, str(THIS_DIR))

from database import SQLiteCRMRepository
from domain_engine import hash_password_pbkdf2


def utc_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def cmd_list(repo: SQLiteCRMRepository) -> int:
    users = repo.list_users()
    print(f"\nProvisioned Accounts in SQLite ({len(users)} total):")
    print("-" * 88)
    print(f"{'ROLE':<12} | {'EMAIL':<30} | {'NAME':<22} | {'TITLE'}")
    print("-" * 88)
    for u in users:
        print(f"{u['role']:<12} | {u['email']:<30} | {u['name']:<22} | {u['title']}")
    print("-" * 88)
    return 0


def cmd_create_user(
    repo: SQLiteCRMRepository,
    email: str,
    password: str,
    name: str,
    role: str,
    title: str,
) -> int:
    clean_email = email.strip().lower()
    clean_name = name.strip()
    if not clean_email or "@" not in clean_email:
        print("Error: A valid email address is required.", file=sys.stderr)
        return 1
    if len(password) < 6:
        print("Error: Password must be at least 6 characters.", file=sys.stderr)
        return 1
    if role not in ("Admin", "HRManager", "Specialist"):
        print("Error: Role must be Admin, HRManager, or Specialist.", file=sys.stderr)
        return 1

    pw_hash, salt = hash_password_pbkdf2(password)
    now = utc_iso()

    with repo._connect() as conn:
        existing = conn.execute(
            "SELECT id, role FROM app_users WHERE email = ?", (clean_email,)
        ).fetchone()
        if existing:
            conn.execute(
                """
                UPDATE app_users
                SET name = ?, password_hash = ?, salt = ?, role = ?, title = ?
                WHERE id = ?
                """,
                (clean_name, pw_hash, salt, role, title.strip(), existing["id"]),
            )
            conn.execute("DELETE FROM user_sessions WHERE user_id = ?", (existing["id"],))
            conn.commit()
            print(f"Updated existing account '{clean_email}' with role '{role}' in SQLite.")
        else:
            uid = f"usr-db-{int(time.time() * 1000)}"
            conn.execute(
                """
                INSERT INTO app_users (id, name, email, password_hash, salt, role, title, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (uid, clean_name, clean_email, pw_hash, salt, role, title.strip(), now),
            )
            conn.commit()
            print(f"Created new '{role}' account '{clean_email}' ({clean_name}) directly in SQLite.")
    return 0


def cmd_reset_password(repo: SQLiteCRMRepository, email: str, password: str) -> int:
    clean_email = email.strip().lower()
    if len(password) < 6:
        print("Error: Password must be at least 6 characters.", file=sys.stderr)
        return 1
    pw_hash, salt = hash_password_pbkdf2(password)
    with repo._connect() as conn:
        row = conn.execute("SELECT id, role FROM app_users WHERE email = ?", (clean_email,)).fetchone()
        if not row:
            print(f"Error: Account '{clean_email}' not found in SQLite.", file=sys.stderr)
            return 1
        conn.execute(
            "UPDATE app_users SET password_hash = ?, salt = ? WHERE id = ?",
            (pw_hash, salt, row["id"]),
        )
        conn.execute("DELETE FROM user_sessions WHERE user_id = ?", (row["id"],))
        conn.commit()
        print(f"Password updated and active sessions revoked for '{clean_email}' ({row['role']}).")
    return 0


def cmd_delete_user(repo: SQLiteCRMRepository, email: str) -> int:
    clean_email = email.strip().lower()
    with repo._connect() as conn:
        row = conn.execute("SELECT id, role FROM app_users WHERE email = ?", (clean_email,)).fetchone()
        if not row:
            print(f"Error: Account '{clean_email}' not found in SQLite.", file=sys.stderr)
            return 1
        if row["role"] == "Admin":
            admin_cnt = conn.execute(
                "SELECT COUNT(*) AS c FROM app_users WHERE role = 'Admin'"
            ).fetchone()["c"]
            if admin_cnt <= 1:
                print(
                    "Error: Cannot delete the last remaining Admin account in the database.",
                    file=sys.stderr,
                )
                return 1
        conn.execute("DELETE FROM user_sessions WHERE user_id = ?", (row["id"],))
        conn.execute("DELETE FROM app_users WHERE id = ?", (row["id"],))
        conn.commit()
        print(f"Deleted account '{clean_email}' ({row['role']}) from SQLite.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Direct SQLite Database Provisioning CLI for Aetheris CRM & Talent OS"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("list", help="List all provisioned accounts in SQLite")

    p_admin = sub.add_parser("create-admin", help="Create or update an Admin account in SQLite")
    p_admin.add_argument("--email", required=True, help="Admin work email")
    p_admin.add_argument("--password", required=True, help="Admin password (min 6 chars)")
    p_admin.add_argument("--name", required=True, help="Admin full name")
    p_admin.add_argument("--title", default="System Administrator", help="Job title")

    p_staff = sub.add_parser("create-staff", help="Create HRManager or Specialist account in SQLite")
    p_staff.add_argument("--email", required=True, help="Staff work email")
    p_staff.add_argument("--password", required=True, help="Staff password (min 6 chars)")
    p_staff.add_argument("--name", required=True, help="Staff full name")
    p_staff.add_argument("--role", choices=["HRManager", "Specialist"], default="Specialist")
    p_staff.add_argument("--title", default="CRM Team Member", help="Job title")

    p_pw = sub.add_parser("reset-password", help="Reset password for an account in SQLite")
    p_pw.add_argument("--email", required=True, help="Target account email")
    p_pw.add_argument("--password", required=True, help="New password (min 6 chars)")

    p_del = sub.add_parser("delete-user", help="Delete an account from SQLite")
    p_del.add_argument("--email", required=True, help="Target account email")

    args = parser.parse_args()
    repo = SQLiteCRMRepository()

    if args.command == "list":
        return cmd_list(repo)
    if args.command == "create-admin":
        return cmd_create_user(repo, args.email, args.password, args.name, "Admin", args.title)
    if args.command == "create-staff":
        return cmd_create_user(repo, args.email, args.password, args.name, args.role, args.title)
    if args.command == "reset-password":
        return cmd_reset_password(repo, args.email, args.password)
    if args.command == "delete-user":
        return cmd_delete_user(repo, args.email)
    return 1


if __name__ == "__main__":
    sys.exit(main())
