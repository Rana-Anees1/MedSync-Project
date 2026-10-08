# MedSync – Perioperative Care Continuity System

MedSync is a full-stack web application for a hospital surgical department. It follows each elective surgical patient **before surgery, on the day of surgery and after discharge**:

1. A surgeon (or pre-op nurse) lists a patient for a procedure.
2. MedSync generates a procedure-specific **readiness plan** from the procedure template and the patient’s conditions (e.g. diabetes adds an HbA1c test).
3. Every readiness task has an **owner, deadline, status and priority**.
4. Daily checks mark overdue tasks, **escalate** them (nurse, then surgeon) and **remind** patients.
5. A transparent **rule-based readiness risk estimate** flags cases likely to be cancelled (no AI model is claimed).
6. After discharge, patients submit **recovery check-ins**; red flags and worsening trends create alerts for review.
7. Staff dashboards and **analytics** are computed from the database.

> MedSync supports clinical staff; it does not diagnose. Concerning check-in answers are flagged for review by the surgical team.

---

## 1. Technologies

| Part | Technologies |
|---|---|
| Frontend | React 18, Vite 5, React Router 6, lucide-react icons, plain CSS (design tokens) |
| Backend | Node.js 18+, Express 4, MongoDB with Mongoose 8, JWT (jsonwebtoken), bcryptjs, dotenv, cors, helmet, express-rate-limit, multer (uploads), node-cron |
| Dev tools | nodemon, Vitest (domain unit tests), mongodb-memory-server (zero-install demo mode) |
| AI (planned) | Python FastAPI service boundary in `ai-service/` (returns *501 Not Implemented* until a model exists) |

## 2. Folder structure

```
MedSync/
├── frontend/                 React + Vite application
│   ├── src/
│   │   ├── assets/images/    Provided images (converted to .webp) + index.js
│   │   ├── components/       ui/ (Button, Modal, DataTable, ImageSlider, LoadingState, ErrorState,
│   │   │                     ConfirmationDialog, RiskBadge, …), layout/ (Sidebar, Topbar, NotificationBell),
│   │   │                     case/ (ReadinessChecklist, CaseActions, RecoveryPanel, PatientForm, …),
│   │   │                     auth/ (AuthLayout), common/ (ProtectedRoute, NotificationItem)
│   │   ├── context/          AuthContext (JWT session), StoreContext (API data + actions), ToastContext
│   │   ├── pages/            auth/, staff/, patient/, admin/, common/
│   │   ├── services/         api.js (REST client), workflow.js, planGenerator.js, riskEngine.js (UI previews)
│   │   ├── config/           roles, stages, navigation, Urdu/English patient text
│   │   └── styles/
│   └── .env.example
├── backend/                  Express REST API
│   ├── src/
│   │   ├── config/           env.js, db.js
│   │   ├── models/           User, Patient, ProcedureType, Procedure, ReadinessItem, RecoveryCheckIn,
│   │   │                     RiskAssessment, Notification, AuditLog, Setting
│   │   ├── routes/           auth, users, patients, procedureTypes, procedures, readiness, recovery,
│   │   │                     notifications, analytics, admin, files
│   │   ├── middleware/       auth (JWT + roles), errors, upload
│   │   ├── services/         caseDto, dailyChecks (scheduler), notify/audit, rules, ai/riskProvider
│   │   ├── domain/           pure logic: plan generator, lifecycle state machine, risk rules, recovery scoring
│   │   ├── seed/             DEMO DATA
│   │   ├── app.js, server.js, dev-memory.js
│   ├── scripts/api-smoke-test.js
│   ├── tests/                Vitest unit tests for the domain logic
│   └── .env.example
├── ai-service/               Planned FastAPI service (contract only, no model)
├── README.md
├── .gitignore
└── .env.example
```

## 3. Prerequisites

Install these once:

1. **Node.js 18 or newer** (LTS recommended) – <https://nodejs.org>. Check with `node -v`.
2. **MongoDB**, one of:
   - **MongoDB Community Server** installed locally – <https://www.mongodb.com/try/download/community> (on Windows, install it “as a Service” so it starts automatically), or
   - a free **MongoDB Atlas** cluster – <https://www.mongodb.com/atlas>.
   - Not ready yet? Use **`npm run dev:memory`** (Section 6) – it downloads a temporary MongoDB automatically (needs internet on first run).
3. **VS Code** (recommended) – <https://code.visualstudio.com>.
4. *(Optional, only for the planned AI service)* Python 3.10+.

## 4. Backend installation (Windows / VS Code terminal)

Open the `MedSync` folder in VS Code, then open a terminal (**Terminal → New Terminal**):

```powershell
cd backend
npm install
copy .env.example .env
```

Edit `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/medsync
JWT_SECRET=put-a-long-random-string-here-at-least-16-chars
CLIENT_URL=http://localhost:5173,http://localhost:4173
```

For MongoDB Atlas, use the connection string from Atlas (`mongodb+srv://user:password@cluster.../medsync`) and add your IP address under *Network Access*.

Load the **DEMO DATA** (recommended the first time – it **deletes existing MedSync data** in that database):

```powershell
npm run seed
```

## 5. Frontend installation

In a **second** terminal:

```powershell
cd frontend
npm install
copy .env.example .env
```

`frontend/.env` contains `VITE_API_URL=http://localhost:5000/api` (change it only if the API runs elsewhere).

## 6. Running the application

You need **two terminals** (backend and frontend running at the same time).

**Terminal 1 – backend**

```powershell
cd backend
npm run dev
```

You should see `[db] connected to MongoDB` and `MedSync API listening on http://localhost:5000/api`.

**Zero-install alternative (no MongoDB needed):**

```powershell
cd backend
npm run dev:memory
```

This starts a temporary in-memory MongoDB, loads the demo data and runs the API. Data is lost when you stop it.

**Terminal 2 – frontend**

```powershell
cd frontend
npm run dev
```

Open <http://localhost:5173>.

Production build of the frontend: `npm run build`, then `npm run preview` (serves on <http://localhost:4173>).

> macOS/Linux: use `cp` instead of `copy`.

## 7. Demo accounts (DEMO DATA)

Available after `npm run seed` or `npm run dev:memory`. **All people and records are fictional.** Password for every account: **`Demo@1234`**

| Role | E-mail |
|---|---|
| Surgeon | surgeon@medsync.demo (also sana@medsync.demo) |
| Anaesthetist | anaesthetist@medsync.demo |
| Nurse / Pre-op Coordinator | nurse@medsync.demo |
| Patient (preparing for surgery) | patient@medsync.demo |
| Patient (recovering at home) | recovery@medsync.demo |
| Administrator | admin@medsync.demo |
| Pending staff account (cannot sign in until approved) | pending@medsync.demo |

**Signing up**

- **Patient:** choose *I am a patient* and enter the hospital MRN and the mobile number on the hospital record (demo example: MRN `MS-1004`, mobile `0312-5550421`).
- **Staff:** choose *Hospital staff*; the account stays pending until the administrator approves it in **Users & roles**.
- Administrator accounts cannot be self-registered.

## 8. Roles and access

| Role | Can do |
|---|---|
| Surgeon | List patients, readiness board, case detail, consent, operation, discharge, recovery triage, patients, analytics |
| Anaesthetist | Assessment queue, record assessment, clear/defer cases, analytics |
| Nurse / Pre-op Coordinator | Readiness tasks, verify patient uploads, confirm OT list, cancellations, patients, analytics |
| Patient | Own preparation timeline (Urdu/English), upload reports, confirm attendance, recovery check-ins, messages |
| Administrator | Users and approvals, procedure templates, rules, audit log, run daily checks, analytics |

Routes are protected in the frontend **and** every API route checks the JWT and role.

## 9. Case stages

`Listed → Preparation → Ready → Scheduled → Completed → Discharged → Recovery → Recovered`, with side stages **Deferred** and **Cancelled**. Transitions are guarded by a state machine (`backend/src/domain/workflow.js`), e.g. a case becomes *Ready* only when the anaesthetist has recorded the assessment and all required tasks are complete.

## 10. API overview

All responses are JSON: `{ "success": true, "data": … }` or `{ "success": false, "error": { "message": … } }`. Send `Authorization: Bearer <token>`.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | /api/auth/register | Patient (MRN + mobile) or staff (pending approval) signup |
| POST | /api/auth/login | Login, returns JWT |
| GET | /api/users/me | Current user |
| GET | /api/users/directory | Staff names (all signed-in users) |
| GET/POST/PATCH | /api/users, /api/users/:id | Admin: list, create, activate/approve |
| GET/POST | /api/patients | Search (`?q=`) / register patient (staff) |
| GET/PUT | /api/patients/:id | Patient with surgical history / update |
| GET | /api/patients/me | Patient’s own record |
| GET/POST/PUT | /api/procedure-types | Procedure templates (admin edits) |
| GET/POST | /api/procedures | List (role-scoped) / create procedure + readiness plan |
| GET/PUT | /api/procedures/:id | Procedure detail / change date and staff |
| POST | /api/procedures/:id/transitions/:action | clear, defer, resume, confirm, cancel, operate, discharge, recover |
| PUT | /api/procedures/:id/assessment | Pre-anaesthesia assessment |
| POST | /api/procedures/:id/messages | Messages between staff and patient |
| POST | /api/procedures/:id/confirm-attendance | Patient confirms attendance |
| PUT | /api/procedures/:id/alerts/:alertId | Respond to a recovery alert |
| GET | /api/procedures/:id/risk | Readiness risk (AI service if configured, else rule-based) |
| GET | /api/readiness/:procedureId | Readiness tasks |
| POST | /api/readiness | Add a task |
| PUT | /api/readiness/:id | start, complete, return, not_required, reopen, edit |
| POST | /api/readiness/:id/submission | Patient completes a task / uploads a report (multipart `file`) |
| POST | /api/recovery | Patient recovery check-in (multipart, optional `photo`) |
| GET | /api/recovery/:patientId | Check-in history |
| GET | /api/notifications | Notifications for the user / role |
| PUT | /api/notifications/:id/read, /api/notifications/read-all | Mark as read |
| GET | /api/analytics | Dashboard figures computed from MongoDB |
| GET/PUT | /api/settings/rules | Reminder, escalation, risk and recovery rules |
| GET | /api/audit | Audit log (admin) |
| POST | /api/admin/daily-checks | Run the daily checks now (admin) |
| GET | /api/files/:name | Download an uploaded file (staff or owning patient) |
| GET | /api/health | Health check |

## 11. Testing

```powershell
cd backend
npm test            # 26 unit tests of the domain logic (Vitest)
npm run test:api    # 40 end-to-end API checks; run while the backend is running with DEMO DATA
```

## 12. Risk analysis: implemented vs planned

| | Status |
|---|---|
| Readiness (cancellation) risk | **Implemented – rule-based.** Weighted, explainable factors (overdue tasks, open required tasks close to surgery, not yet cleared, patient not responding, comorbidities, abnormal results, previous missed visit). Labelled “rule-based (not a machine-learning model)” in the UI and API. |
| Complication risk at discharge | **Implemented – rule-based.** Chooses the recovery monitoring plan (check-in frequency, alert threshold, duration). |
| Trained AI models | **Planned.** `ai-service/` defines the FastAPI contract. Set `AI_SERVICE_URL` in `backend/.env`; the API uses the service only when it returns a prediction with `model.type = "ml"`. Until then the rule-based estimate is used. |

## 13. Notes

- Daily checks run automatically every day at 07:00 (`DAILY_CHECK_CRON`) and can be run manually by the administrator.
- Uploaded files are stored in `backend/uploads/` (max 5 MB; JPG, PNG, WEBP or PDF) and are served only to clinical staff or the owning patient.
- Notifications are in-app; no SMS/WhatsApp/e-mail service is used.
- Never commit `.env` files. Use a long random `JWT_SECRET` outside development.

## 14. Troubleshooting

| Problem | Fix |
|---|---|
| `Missing required environment variable MONGO_URI` | Create `backend/.env` from `.env.example`. |
| `MongooseServerSelectionError` / `ECONNREFUSED 27017` | MongoDB is not running. Start the MongoDB service, check the Atlas URI/IP access list, or use `npm run dev:memory`. |
| Frontend shows “Cannot reach the MedSync server” | Start the backend; check `VITE_API_URL` in `frontend/.env`, then restart `npm run dev`. |
| CORS error in the browser console | Add the frontend address to `CLIENT_URL` in `backend/.env` and restart the backend. |
| Port 5000 already in use | Change `PORT` in `backend/.env` and `VITE_API_URL` in `frontend/.env`. |
| Sign-in fails for demo accounts | Run `npm run seed` (or use `npm run dev:memory`). |
