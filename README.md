# ResolveIT - Multi-Tenant Customer Support & Grievance Redressal Platform (v2.0)

ResolveIT is a multi-tenant customer dispute redressal and support automation web platform built on the MERN stack (MongoDB, Express, React, Node.js). It empowers organizations to host independent, custom-branded public resolution desks with automated topic-based department routing, SLA compliance tracking, real-time single-recipient email dispatch, and customer satisfaction audits.

---

## What's New in Version 2.0

### 1. Topic-Based Automated Department Routing
- **Semantic Domain Matching**: Incoming complaints are automatically analyzed by category (*Finance & Billing, Technical Support, Logistics & Operations, Customer Relations, etc.*) and routed to the corresponding department employee (`user.department`).
- **Load Balancing**: If multiple employees share a department, the system auto-assigns the ticket to the employee with the lowest active caseload.
- **Lead Developer Fallback**: If a company developer has not yet added an employee for a specific department, grievances seamlessly route to the Company Developer triage queue for personal resolution or redirection.

### 2. Isolated Single-Recipient Email Notification System
- **Strictly Isolated Alerts**: When a grievance is filed, the alert email is dispatched **exclusively** to the single responsible department employee — preventing inbox spam across teams.
- **Developer Triage Notice**: When a ticket falls back due to a missing department specialist, the developer alone receives a notification to triage or redirect.
- **Staff Redirection Alerts**: When a developer reassigns a ticket from the portal console, the newly assigned employee receives an immediate alert with direct portal links.
- **Customer Resolution Notification**: When a dispute is marked **Resolved** or **Closed**, the customer automatically receives an email notification with a case recap and direct link to submit their CSAT star rating.

### 3. Customer Privacy & Internal Shielding
- **Client-Safe Clean Interface**: Customers select clean, standard department categories without exposure to internal staffing, developer fallback tags, or employee names.
- **Sanitized Public Audit Ledger**: Public case trackers (`/s/:slug/track/:ticketId`) and customer complaint histories (`/s/:slug/my-complaints`) filter out all internal staff allocations, routing logs, and developer reassignment notes. Customers only see public milestone updates.

### 4. Dedicated Employee Resolution Workspace
- **Personalized Desk**: Role-aware greeting with department badge (e.g. *Technical Support Specialist*) and personal metrics:
  - **Assigned to Me**: Direct caseload count.
  - **My Active Queue**: Open / In-Progress cases requiring response.
  - **My Resolved Cases**: Solved disputes.
  - **Department Open Queue**: Active cases matching the employee's department.
- **Direct Action Table**: Active assigned cases are listed directly on the employee dashboard for immediate action.
- **Ledger Scope Tabs**: Fast switching between *All Company Tickets*, *Assigned to Me*, *My Department Queue*, and *Unassigned Triage*.

### 5. Brand Identity & Theme Studio
- **Dynamic Palette Builder**: Hex color selectors with real-time live preview of the customer resolution desk.
- **Dynamic Inheritance**: Tenant branding colors (`primaryColor`, `accentColor`) dynamically theme the service desk, complaint intake form, ticket tracker, and customer portal.

### 6. Strict Input Validation & Date Safety
- **SLA Target Deadline Picker**: Enforces future dates/times and rejects past dates with validation errors.
- **Incident Date Picker**: Constrained to today's date or earlier, rejecting future dates and dates older than 5 years.
- **Security Validation**: RFC-compliant email regex and 6-character minimum password enforcement across all account creation flows.

---

## User Roles and Access

ResolveIT defines four distinct hierarchical roles:

### 1. Super Admin
- Platform-wide governance and global analytics.
- Onboards and manages companies, slugs, and industry classifications.
- Creates and provisions Company Developer accounts.
- Cross-tenant ticket metrics, resolution rates, and platform volume monitoring.
- **URL**: `/admin`

### 2. Company Developer (Company Lead)
- Configures tenant-specific branding, theme colors, welcome messaging, and taglines.
- Provisions support agents (Employees) with department disciplines (*Finance, Technical Support, Logistics, etc.*).
- Holds full authority to resolve unassigned triage cases or redirect tickets to any employee.
- Manages knowledge base FAQs and monitors company SLA compliance.
- **URL**: `/portal/:companySlug`

### 3. Support Employee (Department Specialist)
- Dedicated resolution workspace filtered to tickets auto-assigned to their department.
- Live customer messaging thread and private internal notes visible only to staff.
- Updates case status (*Open, In Progress, Resolved, Closed*) and tracks SLA countdowns.
- **URL**: `/portal/:companySlug`

### 4. Customer
- Accesses tenant public resolution desks (`/s/:companySlug`).
- Searches verified knowledge base FAQs by category.
- Signs in via Google authentication or email to lodge formal complaints.
- Tracks audit timelines using case reference IDs (e.g. `TNS-2026-0001`).
- Submits 1–5 star Customer Satisfaction (CSAT) ratings upon case resolution.

---

## Tech Stack

### Frontend
- **React 19** with **Vite**
- **React Router v7**
- **Lucide React** (icons with dynamic color inheritance)
- **Vanilla CSS Design System** (responsive, light/dark mode support)

### Backend
- **Node.js** & **Express.js** (REST API)
- **MongoDB Atlas** with **Mongoose ODM**
- **JSON Web Tokens (JWT)** for secure session management
- **Google OAuth 2.0** (`google-auth-library`) for customer sign-in
- **EmailJS REST API** for role-specific transactional email alerts
- **bcryptjs** for credential hashing

---

## Project Structure

```
ICL-Project/
├── api/
│   └── index.js            # Vercel serverless handler wrapping the Express app
├── server/
│   ├── config/             # MongoDB connection and environment configuration
│   ├── data/               # Reference seed data
│   ├── middleware/         # JWT auth, role validation, and tenant scoping
│   ├── models/             # Mongoose schemas (User, Company, Ticket, Category, Article)
│   ├── routes/             # Scoped Express routers:
│   │   ├── admin.js        # Platform administration endpoints
│   │   ├── auth.js         # JWT staff login & Google customer authentication
│   │   ├── companies.js    # Public tenant info, branding, dashboard analytics & employee management
│   │   └── tickets.js      # Grievance filing, topic auto-routing, tracking & messaging
│   ├── utils/
│   │   └── email.js        # EmailJS integration for isolated role notifications
│   ├── app.js              # Express app initialization and global middleware
│   ├── index.js            # Server entry point (port 5000)
│   ├── seedData.js         # Automated initial data seeder
│   └── resetDb.js          # Clean database wipe and re-seed script
├── src/
│   ├── components/         # Shared UI components and ProtectedRoute wrapper
│   ├── context/            # AuthContext (state, JWT tokens, theme toggle)
│   ├── pages/
│   │   ├── admin/          # Super Admin dashboard, company and developer managers
│   │   ├── portal/         # Tenant staff portal (Dashboard, Ticket Ledger, Ticket Detail, Employees, Theme Studio)
│   │   ├── service/        # Public customer desks (ServicePage, ComplaintForm, TrackTicket, MyComplaints)
│   │   └── LandingPage.jsx # Platform home page
│   ├── App.jsx             # React routing setup
│   └── index.css           # Global stylesheet and responsive design system
├── .env.example            # Environment variables template
├── package.json            # NPM dependencies and scripts
├── vercel.json             # Production rewrites for API + SPA routes
└── vite.config.js          # Vite build configuration
```

---

## Getting Started

### Prerequisites
- Node.js **v20 or higher** (`package.json` requires `>=20.0.0`)
- npm
- MongoDB Atlas cluster or local MongoDB instance

### 1. Clone the repository
```bash
git clone https://github.com/tellapallyakhil/ICL-Project.git
cd ICL-Project
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in the project root based on `.env.example`:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
GOOGLE_CLIENT_ID=your_google_oauth_client_id
APP_URL=http://localhost:5173

# Optional: EmailJS Transactional Alerts
EMAILJS_SERVICE_ID=your_emailjs_service_id
EMAILJS_TEMPLATE_ID=your_emailjs_template_id
EMAILJS_PUBLIC_KEY=your_emailjs_public_key
EMAILJS_PRIVATE_KEY=your_emailjs_private_key
DEV_NOTIFICATION_OVERRIDE=your_email@gmail.com
```

### 4. Seed sample data
Populate the database with sample companies (*TechNova Solutions*, *QuickCart E-Commerce*), developers, department employees, categories, FAQs, and tickets:

```bash
node server/seedData.js
```

### 5. Start development servers
Run both backend and frontend concurrently:
```bash
npm start
```

Or start individually:
- **Backend API**: `npm run server` (runs on `http://localhost:5000`)
- **Frontend Client**: `npm run dev` (runs on `http://localhost:5173`)

---

## Seeded Login Credentials

| Role | Email | Password | Access Path |
|---|---|---|---|
| Super Admin | `admin@resolveit.com` | `password123` | Platform Control (`/admin`) |
| TechNova Lead (Developer) | `dev@technova.com` | `password123` | TechNova Portal (`/portal/technova`) |
| TechNova Tech Agent (Employee) | `devon@technova.com` | `password123` | TechNova Portal (`/portal/technova`) |
| TechNova Logistics Agent (Employee) | `elena@technova.com` | `password123` | TechNova Portal (`/portal/technova`) |
| QuickCart Lead (Developer) | `dev@quickcart.com` | `password123` | QuickCart Portal (`/portal/quickcart`) |
| QuickCart Billing Agent (Employee) | `marcus@quickcart.com` | `password123` | QuickCart Portal (`/portal/quickcart`) |

*Customers sign in via Google Authentication directly from any public service desk (`/s/:slug`).*

---

## Core Scoped API Endpoints

### Authentication
- `POST /api/auth/login` — Staff credential login (JWT)
- `POST /api/auth/google` — Customer Google OAuth authentication
- `GET /api/auth/me` — Inspect active user session

### Super Admin Control
- `GET /api/admin/stats` — Platform cross-tenant analytics
- `GET /api/admin/companies` — List all registered companies
- `POST /api/admin/companies` — Register new tenant company
- `PUT /api/admin/companies/:id` — Update company settings or status
- `GET /api/admin/developers` — List company developers
- `POST /api/admin/developers` — Create and link company developer

### Tenant Portal & Operations
- `GET /api/companies/:slug/public` — Public service desk info & department routing evaluation
- `GET /api/companies/:slug/dashboard` — Role-aware metrics (Employee desk vs Developer triage)
- `PUT /api/companies/:slug/branding` — Update theme palette, welcome headers, and taglines
- `GET /api/companies/:slug/employees` — List active support agents
- `POST /api/companies/:slug/employees` — Add support agent with department discipline
- `PUT /api/companies/:slug/employees/:id` — Update agent name or department

### Grievances & Redressal
- `GET /api/companies/:slug/tickets` — List company tickets (scope by `assignee=me`, `scope=my-dept`, status, priority)
- `GET /api/companies/:slug/tickets/mine` — Customer-scoped complaint history (internal logs shielded)
- `POST /api/companies/:slug/tickets` — File grievance (triggers topic auto-routing and single-recipient email)
- `GET /api/companies/:slug/tickets/:ticketId` — Scoped ticket detail (scoped by role)
- `GET /api/companies/:slug/tickets/:ticketId/track` — Public tracking ledger (internal notes shielded)
- `PUT /api/companies/:slug/tickets/:ticketId` — Update status, SLA deadline, or reassign/redirect agent
- `POST /api/companies/:slug/tickets/:ticketId/messages` — Add customer response or private team note
- `POST /api/companies/:slug/tickets/:ticketId/rating` — Submit 1–5 star CSAT review

---

## Deployment

The app is configured for **Vercel**:

- Frontend is served as a Vite SPA.
- `/api/*` requests are rewritten to `api/index.js`, which forwards them to the Express app.
- Set the same environment variables from `.env.example` in the Vercel project settings (use a production `MONGODB_URI` and a strong `JWT_SECRET`).

---

## Contributing

This is a completed team project. Small documentation and setup fixes are welcome:

1. Fork the repo or work on a branch if you already have collaborator access.
2. Keep README and `.env.example` in sync with the actual scripts and config.
3. Open a pull request against `version-2` (or push directly if the team agrees).
