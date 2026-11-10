# ResolveIT - Multi-Tenant Customer Support & Grievance Redressal Platform

> **Live Demo & Source Code**: Multi-tenant customer support platform built on the MERN stack (MongoDB Atlas, Express.js, React 19, Node.js).

ResolveIT is a modern web application that lets multiple companies run their own completely independent, branded customer help desks from a single codebase and database. Think of it like Zendesk or Freshdesk, but lightweight, fast, and designed with clear boundaries between businesses.

Every company gets its own web link (like `/s/tcs` or `/s/technova`), its own custom brand colors, its own FAQs, its own staff members, and its own support tickets. Company staff can never see tickets from another company, and customers get a clean, simple page where they can submit complaints, track ticket progress in real-time, and rate the resolution when it's done.

---

## How It Works (The Big Picture)

Imagine you run an IT company (like TCS) and you have hundreds of customers using your software. When something breaks:
1. **The customer** goes to `https://yoursite.com/s/tcs`, searches common questions, and if they still need help, logs in with Google and submits a ticket.
2. **The system** automatically inspects the complaint topic (for example, *Technical Support* vs. *Finance & Billing*) and instantly sends it to the right support employee's desk.
3. **The support employee** logs into their internal portal (`/portal/tcs`), sees the ticket with a live countdown timer showing their deadline, chats with the customer, and adds private notes only teammates can read.
4. **The customer** receives an automated email confirmation with their unique tracking number (e.g., `T-2026-0005`) and can check on it anytime without needing a password.
5. **Once fixed**, the ticket is marked *Resolved*, the customer receives a closing email, and they can rate the help they received with 1 to 5 stars.
6. **The Super Admin** watches everything from a master control dashboard (`/admin`), viewing total tickets across all companies, on-time resolution percentages, and company growth.

---

## The Four Roles Explained

Our system is built around four clearly separated roles. Each role has its own portal, its own permissions, and its own user experience.

```
                  ┌─────────────────────────────────┐
                  │    Super Admin (Platform Owner)  │
                  │   - Adds companies & developers │
                  │   - Monitors global platform health│
                  └────────────────┬────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
   ┌──────────────────────┐                  ┌──────────────────────┐
   │ TCS Company Developer│                  │ QuickCart Developer  │
   │ - Sets brand colors  │                  │ - Sets brand colors  │
   │ - Manages employees  │                  │ - Manages employees  │
   │ - Triage queue       │                  │ - Triage queue       │
   └──────────┬───────────┘                  └──────────┬───────────┘
              │                                         │
              ▼                                         ▼
   ┌──────────────────────┐                  ┌──────────────────────┐
   │   TCS Support Staff  │                  │ QuickCart Support    │
   │ (emp1@tcs.com, etc.) │                  │ (marcus@quickcart)   │
   │ - Answers tickets    │                  │ - Answers tickets    │
   │ - Department queue   │                  │ - Department queue   │
   └──────────────────────┘                  └──────────────────────┘
              ▲                                         ▲
              │                                         │
   ┌──────────┴───────────┐                  ┌──────────┴───────────┐
   │ Customer at /s/tcs   │                  │ Customer at /s/qc    │
   │ - Logs in with Google│                  │ - Logs in with Google│
   │ - Files complaints   │                  │ - Files complaints   │
   └──────────────────────┘                  └──────────────────────┘
```

### 1. Super Admin (Platform Owner)
- **Who this is**: The master administrator running the entire ResolveIT service.
- **Where they log in**: `/admin`
- **What they can do**:
  - Add new companies to the platform (name, website slug, industry, ticket prefix like `T-`).
  - Create and link Company Developer accounts for each onboarded business.
  - Suspend or activate companies with a single toggle switch.
  - View executive metrics across all companies: total tickets, overall team members, platform resolution rate, and active caseloads.
  - View every company's live customer desk or jump directly into any company's staff portal.

### 2. Company Developer (Company Lead / Admin)
- **Who this is**: The technical lead or department manager for a specific business (e.g., *Prasad L* managing *TCS*).
- **Where they log in**: `/portal/:companySlug` (e.g., `/portal/tcs`)
- **What they can do**:
  - **Brand Identity & Theme Studio**: Customize the company name, customer welcome heading, tagline, and pick exact brand colors (Primary & Accent) with a live, real-time preview of how the customer page will look.
  - **Employee Management**: Hire new support agents, assign their department (e.g., *Technical Support*, *Logistics & Fulfilment*, *Billing*), and dismiss employees when needed.
  - **Knowledge Base (FAQs)**: Add, edit, reorder, and toggle visibility for frequently asked questions so customers can solve common problems without even opening a ticket.
  - **Complaint Categories**: Choose which categories customers see when filing a dispute.
  - **Developer Triage Queue**: If a customer files a ticket in a category that has no assigned employee yet, the ticket automatically falls back to the Developer's queue so nothing ever gets lost. The developer can answer it or reassign it to any staff member.

### 3. Support Employee (Department Specialist)
- **Who this is**: Frontline support engineers and customer care agents (e.g., `emp1@tcs.com` assigned to *Technical Support*).
- **Where they log in**: `/portal/:companySlug` (e.g., `/portal/tcs`)
- **What they can do**:
  - **Personalized Desk**: See their direct caseload, active department queue, and resolved tickets.
  - **Ledger Scopes**: Easily switch between tabs:
    - *All Company Tickets* (all cases across the company)
    - *Assigned to Me* (cases personally allocated to this agent)
    - *My Department Queue* (all open tickets matching their department)
    - *Unassigned Triage* (tickets waiting for someone to pick them up)
  - **Live Ticket Workspace**:
    - Chat directly with the customer in a public thread.
    - Write private internal team notes (highlighted with yellow borders) that only staff can see — customers never see internal notes.
    - Change ticket status (*Open*, *In Progress*, *Resolved*, *Closed*).
    - Track the dynamic SLA countdown timer (e.g., Critical tickets must be answered in 4 hours).

### 4. Customer (Public User)
- **Who this is**: Any client, user, or consumer who needs help from a specific company.
- **Where they go**: `/s/:companySlug` (e.g., `https://resolveit.com/s/tcs`)
- **What they can do**:
  - **Read FAQs**: Search questions categorized by topic (Billing, Technical, General) without needing to log in.
  - **Sign In with Google**: One-click login using standard Google OAuth 2.0. Their name, email, and avatar are automatically verified.
  - **File a Complaint**: Fill out a clean, validated complaint form:
    - Choose Category & Urgency Priority (Low, Medium, High, Critical)
    - Incident Date (constrained to past or present dates only)
    - Detailed description and optional file attachments
  - **Track Ticket Without Password**: Customers can enter their Ticket ID (e.g., `T-2026-0005`) into the public tracker and view live milestone progress and agent public replies. All internal notes, staff emails, and developer routing logs are shielded from the public for privacy.
  - **My Complaints Dashboard**: Logged-in customers can view their entire complaint history, reply back to support agents, and leave a 1 to 5 star rating once their issue is resolved.

---

## Seeded Login Credentials

Use these verified test accounts to explore each role across the platform:

| Role | Company | Email | Password | Access URL | What to Test |
|---|---|---|---|---|---|
| **Super Admin** | Platform Master | `admin@resolveit.com` | `password123` | `/admin` | Add new companies, create developers, monitor all platform stats |
| **TCS Developer** | TCS | `dev@tcs.com` | `password123` | `/portal/tcs` | Customize TCS brand colors, hire employees, manage FAQs & triage |
| **TCS Employee** | TCS (Tech Support) | `emp1@tcs.com` | `password123` | `/portal/tcs` | View Technical Support queue, reply to tickets, add team notes |
| **TechNova Developer** | TechNova Solutions | `dev@technova.com` | `password123` | `/portal/technova` | TechNova company portal management |
| **QuickCart Developer** | QuickCart E-Commerce | `dev@quickcart.com` | `password123` | `/portal/quickcart` | QuickCart store customer care management |

> **Customer Access**: Customers do not need pre-registered accounts. Simply visit any company's service desk (like `http://localhost:5173/s/tcs`) and click **Customer Sign In** to log in instantly with your Google account or set a local password.

---

## Key Features Under the Hood

### 1. Topic-Based Automated Department Routing
When a customer submits a complaint, they don't pick which employee answers it. Instead, the backend inspects the category:
- A ticket marked *Technical Support* automatically looks for employees whose department is `Technical Support`.
- If multiple employees are in that department, the system assigns the ticket to the employee with the lowest number of active tickets (automatic workload balancing).
- If no employee exists for that department, it routes directly to the Company Developer so the customer is never left waiting.

### 2. Isolated Single-Recipient Email Notifications
Powered by the EmailJS REST engine:
- When a ticket is filed, an alert email goes **only** to the specific assigned employee — no team-wide inbox spam.
- The customer receives an immediate confirmation email containing their ticket tracking link.
- When an employee marks a ticket *Resolved*, the customer gets an email summary inviting them to leave a 1 to 5 star CSAT rating.

### 3. Customer Privacy & Internal Note Shielding
- Customers only ever see clean milestone statuses (*Ticket Lodged*, *Assigned to Specialist*, *Investigation Underway*, *Resolution Complete*).
- Support agents can write private internal notes to discuss solutions with colleagues. These notes are completely stripped out before sending data to public tracker endpoints or customer views.

### 4. Dynamic SLA Compliance Timers
Every ticket has a strict resolution window based on its urgency:
- **Critical**: 4 hours
- **High**: 12 hours
- **Medium**: 24 hours
- **Low**: 48 hours

The system calculates `createdAt + priorityHours` and displays live color-coded countdown bars in agent queues. Tickets approaching their deadline are flagged on high-priority watchlists.

---

## Tech Stack

### Frontend
- **React 19** with **Vite** for fast client-side rendering
- **React Router v7** for nested routes, public company slugs, and role-based route guards (`ProtectedRoute`)
- **Lucide React** for consistent, dynamic icons
- **Vanilla CSS Design System** with CSS custom properties supporting Linen Light and Slate Dark modes

### Backend
- **Node.js** & **Express.js** REST API
- **MongoDB Atlas** with **Mongoose ODM**
- **JSON Web Tokens (JWT)** for stateless 24-hour staff authentication
- **Google OAuth 2.0** (`@react-oauth/google` & `google-auth-library`) for customer identity verification
- **EmailJS REST API** for transactional email delivery
- **bcryptjs** for salted password hashing

---

## Project Folder Structure

```
ICL-Project/
├── api/
│   └── index.js            # Vercel serverless entry point wrapping the Express application
├── server/
│   ├── config/             # MongoDB Atlas connection & environment setup
│   ├── middleware/         # JWT auth guard, role validation, and tenant scoping
│   ├── models/             # Mongoose schemas:
│   │   ├── User.js         # Super admins, developers, employees, and customers
│   │   ├── Company.js      # Company settings, branding palette, slugs, and prefixes
│   │   ├── Ticket.js       # Complaints, message threads, internal notes, CSAT ratings
│   │   ├── Article.js      # Knowledge base FAQs
│   │   └── Category.js     # Complaint categories
│   ├── routes/             # Scoped REST API route controllers:
│   │   ├── admin.js        # Platform-wide company and developer management
│   │   ├── auth.js         # Staff credential authentication & customer Google login
│   │   ├── companies.js    # Public desk info, dashboard metrics, and employee roster
│   │   └── tickets.js      # Ticket lodging, topic routing, public tracking, and replies
│   ├── templates/          # HTML email templates for customers and staff
│   ├── utils/
│   │   └── email.js        # EmailJS notification dispatch helper
│   ├── app.js              # Express app initialization and global middleware
│   ├── index.js            # Local server entry point (port 5000)
│   ├── seedData.js         # Database seeder script
│   └── resetDb.js          # Database cleanup script
├── src/
│   ├── components/         # Shared UI components, modals, and route guards
│   ├── context/            # AuthContext (user session, JWT storage, theme toggle)
│   ├── pages/
│   │   ├── admin/          # Super Admin dashboard, company manager, developer manager
│   │   ├── portal/         # Company staff workspace (Dashboard, Tickets, Employees, Customizer)
│   │   ├── service/        # Public customer desks (ServicePage, ComplaintForm, TrackTicket, MyComplaints)
│   │   └── LandingPage.jsx # Main platform landing page with live ticket showcase
│   ├── App.jsx             # Client routing configuration
│   └── index.css           # Global stylesheet and responsive design system
├── .env.example            # Environment variable template
├── package.json            # Dependencies and scripts
├── vercel.json             # Vercel deployment rewrites
└── vite.config.js          # Vite build configuration
```

---

## Setup & Installation

### Prerequisites
- Node.js **v20 or higher**
- npm
- A MongoDB Atlas connection string (or local MongoDB)

### 1. Clone the Repository
```bash
git clone https://github.com/tellapallyakhil/ICL-Project.git
cd ICL-Project
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the project root based on `.env.example`:

```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secret_jwt_key
NODE_ENV=development
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
APP_URL=http://localhost:5173

# Optional: Transactional Email Notifications (EmailJS)
EMAILJS_SERVICE_ID=your_emailjs_service_id
EMAILJS_TEMPLATE_ID=your_emailjs_template_id
EMAILJS_PUBLIC_KEY=your_emailjs_public_key
EMAILJS_PRIVATE_KEY=your_emailjs_private_key
DEV_NOTIFICATION_OVERRIDE=your_email@gmail.com
```

### 4. Seed Demo Data
To populate the database with default companies, admin accounts, and sample tickets:

```bash
node server/seedData.js
```

### 5. Run the Application
Run both backend and frontend concurrently:

```bash
npm start
```

Or run them individually in separate terminals:
- **Backend API Server**: `npm run server` (runs on `http://localhost:5000`)
- **Frontend Client**: `npm run dev` (runs on `http://localhost:5173`)

Open `http://localhost:5173` in your browser.

---

## Key URLs Quick Reference

- **Platform Homepage**: `http://localhost:5173/`
- **Super Admin Console**: `http://localhost:5173/admin`
- **TCS Public Support Desk**: `http://localhost:5173/s/tcs`
- **TCS Staff Portal**: `http://localhost:5173/portal/tcs`
- **TechNova Public Support Desk**: `http://localhost:5173/s/technova`
- **TechNova Staff Portal**: `http://localhost:5173/portal/technova`
- **Sample Ticket Tracking**: `http://localhost:5173/s/tcs/track/T-2026-0001`
