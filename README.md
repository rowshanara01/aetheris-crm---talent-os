---
title: Aetheris CRM & Talent OS
emoji: 🏢
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

#### Aetheris CRM & Talent OS

**Aetheris CRM & Talent OS** is an enterprise full-stack Customer Retention, Commercial Pipeline, AI Email Routing, 4-Axis Candidate Interviewing, and Workforce Payroll platform powered by a **Node.js Express Gateway**, a **Python 3 SQLite (WAL) Domain Engine**, **Google Gemini AI**, and a **React 19 + TypeScript** frontend.

---

#### Key Features
- **Public Corporate Portal & Interactive Tour:** Multi-page public website (`Home`, `Solutions`, `Careers`, `Pricing`, `Contact`, `Login`, `Register`) with a built-in 60-second animated walkthrough (`ProductVideoTourModal`) and live platform sandbox.
- **Commercial Deal Pipeline & Client Retention:** Track enterprise contracts, health scores, churn signals, and 36-month client longevity forecasting (`BDT ৳` / `USD $` and `বাংলা` / `English`).
- **AI Email Auto-Reply & Specialist Routing:** Classifies incoming inquiries, drafts contextual replies, and routes tickets to the right department specialist.
- **4-Axis AI Candidate Interview & Hiring Studio:** Evaluates applicants across structured technical, communication, cultural, and domain rubrics.
- **Workforce HR, Payroll & Printable Vouchers:** Automates salary computation, allowances, deductions, and printable commercial invoices/payslips, plus live outbound SMTP alerts (`smtplib`).
- **Role-Based Security Governance:** Public web registration only provisions `Specialist` accounts; privileged `Admin` credentials are never exposed in client UI and are provisioned strictly via CLI (`backend_python/manage_admin.py`) or container Secrets.

---

#### Hybrid Architecture (Node.js + Python 3)
1. **React 19 + Vite SPA (`src/`):** Serves the public marketing pages, interactive video walkthrough, and authenticated CRM/HR workspace.
2. **Node.js Express Gateway (`server.ts` & `server/`):** Handles port binding (`3000` locally / `7860` on Hugging Face), CORS headers, JWT/session authentication, Gemini AI orchestration, and spawns/monitors the Python engine.
3. **Python 3 SQLite3 WAL Microservice (`backend_python/`):** Runs on internal `127.0.0.1:8001` and communicates with Node.js over local HTTP JSON payloads (`PythonBridge.ts`), managing ACID persistence, financial math, and SMTP dispatch.

---

#### Issues Faced & How They Were Fixed

#### 1. Hugging Face Spaces Non-Root SQLite Permission Error (`uid=1000`)
- **Issue:** Hugging Face Docker Spaces execute containers as a non-root user (`uid=1000`). SQLite in Write-Ahead Logging (`WAL`) mode requires creating `.db-wal` and `.db-shm` lock files in the database directory, which fails with `readonly database` errors if `/app/data` is owned solely by `root`.
- **Fix:** Updated `Dockerfile` to pre-create `/app/data` with `chmod -R 777 /app/data` and added a configurable `SQLITE_DATA_DIR` environment override in `backend_python/database.py`.

#### 2. Dual-Port & Split-Deployment Compatibility (`3000` vs `7860` / Monorepo vs Split Repo)
- **Issue:** AI Studio previews require port `3000`, Hugging Face Spaces requires `7860`, Render assigns a dynamic `$PORT`, and split deployments (Frontend on Vercel + Backend on Hugging Face) failed CORS preflight checks or crashed when `dist/index.html` wasn't present on a backend-only container.
- **Fix:** Updated `server.ts` to bind `Number(process.env.PORT) || 3000`, added configurable CORS preflight handling (`CORS_ALLOWED_ORIGIN`), added a conditional `fs.existsSync` check for `dist/index.html` (falling back to JSON API health responses in backend-only mode), and added `VITE_API_BASE_URL` + `resolveApiUrl()` on the frontend (`src/services/crmApi.ts`).

#### 3. Node.js ↔ Python Subprocess Startup Race Condition
- **Issue:** On cold container starts, incoming HTTP requests could hit Express before the spawned Python 3 HTTP microservice finished initializing the SQLite schema and listening on `127.0.0.1:8001`.
- **Fix:** Built `PythonBackendSupervisor` (`server/persistence/PythonBridge.ts`) with a singleton `ensureStarted()` promise that polls `/health` (`100ms` intervals up to 3s) before forwarding any API request, and added a public `GET /api/health` endpoint reporting both gateway and Python engine health.

### 4. Interactive Video Tour Not Visible in Disabled-HMR Preview Iframes
- **Issue:** Initially, the 60-second walkthrough was triggered only from a single Hero button modal, and with HMR disabled in preview iframes, users on other views could not easily locate or launch the walkthrough.
- **Fix:** Refactored `ProductVideoTourModal.tsx` to export an always-visible inline `EmbeddedProductVideoPlayer` directly on the Home page plus a persistent `FloatingVideoTourButton` (`bottom-4 right-4`) across both public and authenticated views, alongside a dedicated executive banner launcher in `OverviewView.tsx`.

### 5. Admin Privilege Escalation & Credential Exposure Risk
- **Issue:** Allowing self-registration for `Admin` roles or embedding default Admin credentials in frontend quick-login buttons introduces a critical privilege-escalation risk in public deployments.
- **Fix:** Locked public registration (`/api/auth/register`) strictly to `Specialist` accounts, removed all Admin credential hints from the UI, and implemented CLI provisioning (`backend_python/manage_admin.py`) plus startup synchronization from `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` environment Secrets.

---

## Hugging Face Spaces & Cloud Deployment Configuration
- **SDK:** `docker`
- **Port:** `7860` (set automatically in `Dockerfile`; AI Studio local preview defaults to `3000`)
- **Required & Optional Secrets** (**Settings → Variables and secrets**):
  - `GEMINI_API_KEY`: Your Google Gemini API Key for AI triage, coaching, and rubric evaluation
  - `INITIAL_ADMIN_EMAIL`: Primary administrator login email
  - `INITIAL_ADMIN_PASSWORD`: Primary administrator login password (minimum 6 characters)
  - `CORS_ALLOWED_ORIGIN`: `*` or your frontend domain (e.g. `https://your-app.vercel.app`)
  - `VITE_API_BASE_URL`: Set on Vercel when hosting the frontend separately (e.g. `https://username-spacename.hf.space`)


