# AI Governance Hub

A full-stack internal tool for tracking, auditing, and governing employee AI project initiatives. Built for the IT/Auditing team and available to Executive leadership in read-only mode.

---

## Tech Stack

| Layer    | Technology                                          |
|----------|-----------------------------------------------------|
| Frontend | React 18, Vite, Tailwind CSS v4, React Router v6   |
| State    | TanStack Query, React Context (Auth)                |
| Charts   | Recharts                                            |
| Backend  | Node.js, Express                                    |
| Database | MongoDB (Mongoose)                                  |
| Auth     | JWT (role-based: `auditor` / `executive`)           |

---

## Roles

| Role        | Permissions                                                     |
|-------------|-----------------------------------------------------------------|
| `auditor`   | Full CRUD on projects, incidents, milestones                    |
| `executive` | Read-only access to all projects and the dashboard              |

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB running locally on `mongodb://localhost:27017`

### 1. Backend

```bash
cd backend
npm install
# Edit .env if needed (MONGO_URI, JWT_SECRET)
npm run seed      # Populate demo data
npm run dev       # Start on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev       # Start on http://localhost:5173
```

---

## Demo Accounts

| Role      | Email                    | Password      |
|-----------|--------------------------|---------------|
| Auditor   | auditor@company.com      | auditor123    |
| Executive | executive@company.com    | executive123  |

---

## Features

- **Dashboard** — KPI stat cards, status pie chart, risk bar chart, top tech stack leaderboard, recent incidents
- **Project Registry** — Searchable, filterable project list with status and risk badges
- **Project Detail** — Full metadata, tech stack chips, milestone tracker with progress bar, incident timeline
- **Incident Logging** — Severity tagging, open/resolved states, one-click resolve
- **Milestone Tracker** — Check off milestones, auto-records completion timestamp
- **Role-based UI** — Auditors see edit/create/delete controls; Executives see clean read-only views
- **Seed Data** — 6 realistic AI projects across all statuses with incidents and milestones

---

## Project Structure

```
ai-governance-hub/
├── backend/
│   └── src/
│       ├── models/       User.js, Project.js
│       ├── routes/       auth.js, projects.js, stats.js
│       ├── middleware/   auth.js (JWT + role guard)
│       ├── index.js      Express entry point
│       └── seed.js       Demo data seeder
└── frontend/
    └── src/
        ├── api/          axios.js (interceptors)
        ├── context/      AuthContext.jsx
        ├── components/   Layout, ProtectedRoute, Cards, Badges, IncidentLog, MilestoneTracker
        └── pages/        Login, Dashboard, Projects, ProjectDetail, ProjectForm
```
