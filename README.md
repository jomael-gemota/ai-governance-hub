# AI Governance Hub

A full-stack internal tool for tracking, auditing, and governing employee AI project initiatives. Access is restricted to **invited** users with `@outdoorequipped.com` or `@channelprecision.com` Google accounts.

---

## Tech Stack

| Layer    | Technology                                          |
|----------|-----------------------------------------------------|
| Frontend | React 18, Vite, Tailwind CSS v4, React Router v6   |
| State    | TanStack Query, React Context                       |
| Charts   | Recharts                                            |
| Backend  | Node.js, Express                                    |
| Database | MongoDB (Mongoose)                                  |
| Auth     | Google Sign-In + JWT (invite-only, domain-locked)   |
| Email    | Nodemailer (SMTP)                                   |

---

## Roles

| Role       | Permissions                                                                |
|------------|----------------------------------------------------------------------------|
| `auditor`  | Full access: projects (CRUD), incidents, milestones, **and invitations**  |
| `creator`  | Can register and edit projects                                             |

---

## How access works

1. The first user is bootstrapped via the `BOOTSTRAP_AUDITOR_EMAIL` env var. The first time this email signs in with Google, it is auto-granted the `auditor` role.
2. From then on, **any new user must be invited** from the Invitations page (auditors only).
3. When invited, the system creates a pending invitation and emails the user a sign-in link (if SMTP is configured).
4. When the invited user signs in with their Google account (same email), they are auto-provisioned with the assigned role.
5. Any user from an allowed domain who **isn't invited** will see a "not qualified — invitation required" message on login.

---

## Setup

### Prerequisites

- Node.js 18+
- MongoDB Atlas cluster (or local Mongo)
- Google Cloud OAuth 2.0 Client ID (with `http://localhost:5173` as an authorized origin)
- (Optional) SMTP credentials for sending invitation emails

### 1. Backend

```bash
cd backend
npm install
# Fill in backend/.env (see below)
npm run seed       # Loads sample AI projects
npm run dev        # http://localhost:5000
```

`backend/.env`:
```
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=change-me
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
ALLOWED_DOMAINS=outdoorequipped.com,channelprecision.com
APP_URL=http://localhost:5173
BOOTSTRAP_AUDITOR_EMAIL=your-email@outdoorequipped.com

# SMTP (optional — invitations log to console if blank)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=invites@yourdomain.com
SMTP_PASS=xxxx
SMTP_FROM=AI Governance Hub <invites@yourdomain.com>
```

### 2. Frontend

```bash
cd frontend
npm install
# Fill in frontend/.env
npm run dev        # http://localhost:5173
```

`frontend/.env`:
```
VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
```

---

## Features

- **Google-only sign-in** with domain allowlist (`@outdoorequipped.com`, `@channelprecision.com`)
- **Invitation-only access** — auditors invite users with a role assignment
- **Dashboard** — KPI cards, status & risk charts, top tech stack, recent incidents
- **Project Registry** — search, filter, and paginate AI initiatives
- **Project Detail** — full metadata, tech stack chips, milestone tracker, incident timeline
- **Incident Logging** — severity tagging, open/resolved states
- **Milestone Tracker** — progress bar, completion timestamps
- **Invitations page** (auditor only) — send, resend, revoke invites with email notification

---

## Folder Structure

```
ai-governance-hub/
├── backend/
│   └── src/
│       ├── models/        User.js, Project.js, Invitation.js
│       ├── routes/        auth.js, projects.js, stats.js, invitations.js
│       ├── middleware/    auth.js (JWT + role guard)
│       ├── utils/         mailer.js (nodemailer)
│       ├── index.js
│       └── seed.js
└── frontend/
    └── src/
        ├── api/           axios.js
        ├── context/       AuthContext.jsx
        ├── components/    Layout, ProtectedRoute, Cards, Badges, IncidentLog, MilestoneTracker
        └── pages/         Login, Dashboard, Projects, ProjectDetail, ProjectForm, Invitations
```
