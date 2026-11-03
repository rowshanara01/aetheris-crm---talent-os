"""
Aetheris CRM & Talent OS — Python 3.10 Microservice Daemon.
Serves relational SQLite3 persistence, PBKDF2 Auth & RBAC, Org Settings, CSV Bulk Import,
Live Outbound SMTP, Revenue Pipeline, HR lifecycle, and Payroll over HTTP on 127.0.0.1:8001.
"""

from __future__ import annotations
import json
import os
import platform
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict
from urllib.parse import urlparse

from database import SQLiteCRMRepository
from domain_engine import rank_employees_for_email

PORT = int(os.environ.get("PYTHON_CRM_PORT", "8001"))
repo = SQLiteCRMRepository()


class CRMRequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:
        return

    def _send_json(self, status_code: int, payload: Dict[str, Any]) -> None:
        raw = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _read_json(self) -> Dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        body = self.rfile.read(length).decode("utf-8")
        return json.loads(body) if body else {}

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        try:
            if parsed.path == "/health":
                self._send_json(
                    200,
                    {
                        "ok": True,
                        "engine": f"Python {platform.python_version()} + SQLite3 (WAL)",
                    },
                )
                return

            if parsed.path == "/snapshot":
                self._send_json(200, repo.get_snapshot())
                return

            if parsed.path == "/admin/users/list":
                self._send_json(200, {"users": repo.list_users()})
                return

            self._send_json(404, {"error": f"Unknown Python GET route: {parsed.path}"})
        except Exception as exc:
            self._send_json(500, {"error": str(exc)})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        try:
            body = self._read_json()

            # --- Authentication & Admin-Only Staff Provisioning ---
            if parsed.path == "/auth/register-specialist":
                self._send_json(201, repo.register_specialist_user(body))
                return

            if parsed.path == "/auth/login":
                self._send_json(200, repo.login_user(body.get("email", ""), body.get("password", "")))
                return

            if parsed.path == "/auth/me":
                user = repo.get_user_by_token(body.get("token", ""))
                if not user:
                    self._send_json(401, {"error": "Session expired or invalid."})
                    return
                self._send_json(200, {"user": user})
                return

            if parsed.path == "/auth/logout":
                self._send_json(200, repo.logout_user(body.get("token", "")))
                return

            if parsed.path == "/admin/users/create":
                self._send_json(
                    201,
                    repo.admin_create_staff_user(
                        body,
                        body.get("actorName", "System Admin"),
                    ),
                )
                return

            if parsed.path == "/admin/users/reset-password":
                self._send_json(
                    200,
                    repo.admin_reset_user_password(
                        body.get("targetUserId", ""),
                        body.get("newPassword", ""),
                        body.get("actorId", ""),
                        body.get("actorName", "System Admin"),
                    ),
                )
                return

            if parsed.path == "/admin/users/delete":
                self._send_json(
                    200,
                    repo.admin_delete_user(
                        body.get("targetUserId", ""),
                        body.get("actorId", ""),
                        body.get("actorName", "System Admin"),
                    ),
                )
                return

            if parsed.path == "/settings/update":
                self._send_json(200, repo.update_org_settings(body))
                return

            if parsed.path == "/workspace/reset":
                self._send_json(
                    200,
                    repo.reset_workspace_data(
                        body.get("mode", "clean_slate"),
                        body.get("actorName", "Workspace Admin"),
                    ),
                )
                return

            if parsed.path == "/import/customers-csv":
                self._send_json(200, repo.import_customers_csv(body.get("csvText", "")))
                return

            if parsed.path == "/import/employees-csv":
                self._send_json(200, repo.import_employees_csv(body.get("csvText", "")))
                return

            if parsed.path == "/customers/update":
                self._send_json(200, repo.update_customer(body["customerId"], body))
                return

            if parsed.path == "/records/delete":
                self._send_json(200, repo.delete_record(body["entityType"], body["recordId"]))
                return

            # --- Revenue Pipeline, Leaves & Workflows ---
            if parsed.path == "/deals":
                self._send_json(201, repo.create_deal(body))
                return

            if parsed.path == "/deals/stage":
                res = repo.update_deal_stage(body["dealId"], body["stage"])
                self._send_json(200, res)
                return

            if parsed.path == "/deals/coaching-commit":
                res = repo.commit_deal_coaching(body["dealId"], body["coaching"])
                self._send_json(200, res)
                return

            if parsed.path == "/leaves":
                self._send_json(201, repo.create_leave_request(body))
                return

            if parsed.path == "/leaves/review":
                res = repo.review_leave_request(body["leaveId"], body["decision"])
                self._send_json(200, res)
                return

            if parsed.path == "/workflows/toggle":
                res = repo.toggle_automation_rule(body["ruleId"])
                self._send_json(200, res)
                return

            if parsed.path == "/workflows/run-sweep":
                res = repo.execute_autonomous_sweep()
                self._send_json(200, res)
                return

            # --- Email Automation ---
            if parsed.path == "/emails":
                self._send_json(201, repo.create_email(body))
                return

            if parsed.path == "/emails/rank-specialists":
                snap = repo.get_snapshot()
                rankings = rank_employees_for_email(
                    body.get("subject", ""),
                    body.get("inboundBody", ""),
                    snap["employees"],
                )
                self._send_json(200, {"rankings": rankings})
                return

            if parsed.path == "/emails/triage-commit":
                res = repo.commit_email_triage(
                    body["emailId"],
                    body["aiResult"],
                    body.get("language", "en"),
                    bool(body.get("autoSend", False)),
                )
                self._send_json(200, res)
                return

            if parsed.path == "/emails/send":
                res = repo.send_email_reply(
                    body["emailId"],
                    body["replyBody"],
                    body.get("assignedEmployeeId"),
                )
                self._send_json(200, res)
                return

            # --- Candidates & Hiring ---
            if parsed.path == "/candidates":
                self._send_json(201, repo.create_candidate(body))
                return

            if parsed.path == "/candidates/turn":
                res = repo.append_interview_turn(
                    body["candidateId"],
                    body["speaker"],
                    body["content"],
                    body.get("competencyFocus"),
                )
                self._send_json(200, res)
                return

            if parsed.path == "/candidates/evaluate-commit":
                res = repo.commit_candidate_evaluation(body["candidateId"], body["evaluation"])
                self._send_json(200, res)
                return

            if parsed.path == "/candidates/hire":
                res = repo.hire_candidate(
                    body["candidateId"],
                    int(body.get("baseSalaryUsd") or 5200),
                    body.get("employmentStatus") or "Probation",
                )
                self._send_json(200, res)
                return

            # --- HR & Payroll ---
            if parsed.path == "/employees/direct-hire":
                self._send_json(201, repo.direct_hire_employee(body))
                return

            if parsed.path == "/employees/compensation":
                res = repo.update_employee_compensation(
                    body["employeeId"],
                    int(body["baseSalaryUsd"]),
                    int(body["performanceBonusUsd"]),
                    body.get("employmentStatus"),
                )
                self._send_json(200, res)
                return

            if parsed.path == "/employees/offboard":
                res = repo.offboard_employee(
                    body["employeeId"],
                    body.get("reason", "Organizational Restructuring"),
                    body.get("handoverEmployeeId"),
                )
                self._send_json(200, res)
                return

            if parsed.path == "/employees/reinstate":
                res = repo.reinstate_employee(body["employeeId"])
                self._send_json(200, res)
                return

            if parsed.path == "/employees/comp-review-commit":
                res = repo.commit_comp_review(body["employeeId"], body["review"])
                self._send_json(200, res)
                return

            if parsed.path == "/payroll/generate":
                res = repo.generate_payroll_batch(body.get("periodMonth", "2026-11"))
                self._send_json(200, res)
                return

            if parsed.path == "/payroll/disburse":
                res = repo.disburse_payroll(
                    body.get("payrollId"),
                    body.get("periodMonth"),
                )
                self._send_json(200, res)
                return

            # --- Customers & Longevity ---
            if parsed.path == "/customers":
                self._send_json(201, repo.create_customer(body))
                return

            if parsed.path == "/customers/assign":
                res = repo.assign_customer(body["customerId"], body["assignedEmployeeId"])
                self._send_json(200, res)
                return

            if parsed.path == "/customers/retention-commit":
                res = repo.commit_retention_plan(body["customerId"], body["plan"])
                self._send_json(200, res)
                return

            if parsed.path == "/customers/execute-retention":
                res = repo.execute_retention_intervention(body["customerId"])
                self._send_json(200, res)
                return

            if parsed.path == "/employees/longevity-commit":
                res = repo.commit_employee_longevity(body["employeeId"], body["plan"])
                self._send_json(200, res)
                return

            self._send_json(404, {"error": f"Unknown Python POST route: {parsed.path}"})
        except ValueError as ve:
            self._send_json(400, {"error": str(ve)})
        except Exception as exc:
            self._send_json(500, {"error": str(exc)})


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), CRMRequestHandler)
    print(f"[Python CRM Engine] Python {platform.python_version()} + SQLite3 listening on http://127.0.0.1:{PORT}", flush=True)
    server.serve_forever()
