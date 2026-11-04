import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Shield,
  Building2,
  ArrowRight,
  LogIn,
  Search,
  CheckCircle,
  Clock,
  Lock,
  ExternalLink,
  Users,
  BarChart3,
  FileText,
  Sparkles,
  Sun,
  Moon,
  ChevronRight,
  ShieldCheck,
  Briefcase,
  AlertTriangle
} from "lucide-react";

const DEFAULT_COMPANIES = [
  {
    name: "TechNova Solutions",
    slug: "technova",
    industry: "Technology",
    ticketPrefix: "TNS",
    status: "active",
    branding: {
      primaryColor: "#25221f",
      welcomeMessage: "Welcome to TechNova Support",
      tagline: "Software and cloud support. Read helpful FAQs, report technical bugs, manage subscriptions, or submit an urgent ticket to support engineers."
    }
  },
  {
    name: "QuickCart E-Commerce",
    slug: "quickcart",
    industry: "E-Commerce",
    ticketPrefix: "QC",
    status: "active",
    branding: {
      primaryColor: "#8c6a46",
      welcomeMessage: "Welcome to QuickCart Support",
      tagline: "Customer shopping assistance. Track package deliveries, request refunds, report missing items, and review order satisfaction."
    }
  }
];

export const LandingPage = () => {
  const { isAuthenticated, currentRole, user, loginUser, logoutUser, theme, toggleTheme, apiFetch } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [docketSearch, setDocketSearch] = useState("");
  const [companies, setCompanies] = useState(DEFAULT_COMPANIES);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchCompanies = async () => {
      try {
        // Try public active companies list
        const res = await fetch("/api/companies");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0 && isMounted) {
            setCompanies(data);
            return;
          }
        }

        // If user is superadmin and server hasn't been restarted, fallback to /api/admin/companies
        if (isAuthenticated && currentRole === "superadmin") {
          const adminRes = await apiFetch("/api/admin/companies");
          if (adminRes.ok) {
            const adminData = await adminRes.json();
            if (Array.isArray(adminData) && adminData.length > 0 && isMounted) {
              setCompanies(adminData);
              return;
            }
          }
        }
      } catch (err) {
        console.warn("Failed to load dynamic companies, using default fallback:", err);
      } finally {
        if (isMounted) setLoadingCompanies(false);
      }
    };
    fetchCompanies();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, currentRole, apiFetch]);

  const params = new URLSearchParams(location.search);
  const redirectUrl = params.get("redirect");

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);
    const result = await loginUser(email, password);
    setLoading(false);

    if (result.success) {
      setShowLogin(false);
      const u = result.user;
      if (redirectUrl) {
        navigate(redirectUrl);
      } else if (u.role === "superadmin") {
        navigate("/admin");
      } else if (u.role === "developer" || u.role === "employee") {
        const companySlug = u.company?.slug;
        if (companySlug) {
          navigate(`/portal/${companySlug}`);
        } else {
          navigate("/admin");
        }
      } else if (u.role === "customer") {
        const defaultSlug = companies[0]?.slug || "technova";
        navigate(`/s/${defaultSlug}/my-complaints`);
      }
    } else {
      setError(result.error || "Authentication failed");
    }
  };

  const handleGoToPanel = () => {
    if (currentRole === "superadmin") {
      navigate("/admin");
    } else if (currentRole === "developer" || currentRole === "employee") {
      const slug = user?.company?.slug;
      if (slug) navigate(`/portal/${slug}`);
      else navigate("/admin");
    } else if (currentRole === "customer") {
      const defaultSlug = companies[0]?.slug || "technova";
      navigate(`/s/${defaultSlug}/my-complaints`);
    }
  };

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (!docketSearch.trim()) return;
    const clean = docketSearch.trim().toUpperCase();
    const matched = companies.find(
      (c) =>
        (c.ticketPrefix && clean.startsWith(c.ticketPrefix)) ||
        clean.toLowerCase().includes(c.slug.toLowerCase())
    );
    if (matched) {
      navigate(`/s/${matched.slug}/track/${encodeURIComponent(clean)}`);
    } else if (clean.startsWith("TNS")) {
      navigate(`/s/technova/track/${encodeURIComponent(clean)}`);
    } else if (clean.startsWith("QC")) {
      navigate(`/s/quickcart/track/${encodeURIComponent(clean)}`);
    } else {
      const fallback = companies[0]?.slug || "technova";
      navigate(`/s/${fallback}/track/${encodeURIComponent(clean)}`);
    }
  };

  return (
    <div className="app-layout" style={{ minHeight: "100vh", backgroundColor: "var(--bg-main)" }}>
      {/* ─── Institutional Top Navbar ─── */}
      <header className="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-brand" style={{ textDecoration: "none" }}>
            <div className="brand-text">
              <span className="brand-title">
                Resolve<span className="brand-highlight">IT</span>
              </span>
              <span className="brand-badge">Customer Support</span>
            </div>
          </Link>

          <nav className="nav-links">
            <a href="#tenants" className="nav-link">
              Companies
            </a>
            <a href="#features" className="nav-link">
              Features
            </a>
            <a href="#track" className="nav-link">
              Track Ticket
            </a>
            <a href="#tenants" className="nav-link">
              Help Centers
            </a>
          </nav>

          <div className="nav-actions">
            <button
              className="icon-btn"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to Linen Light" : "Switch to Slate Dark"}
              style={{ border: "1px solid var(--border-color)" }}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {isAuthenticated ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.4rem 0.85rem",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)"
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "var(--sage)"
                    }}
                  />
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>
                    {user?.name}
                  </span>
                  <span style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "var(--text-muted)", marginLeft: "0.25rem" }}>
                    ({user?.role})
                  </span>
                </div>

                {currentRole === "customer" ? (
                  <button className="btn btn-primary btn-sm" onClick={handleGoToPanel}>
                    <FileText size={14} /> My Complaints
                  </button>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={handleGoToPanel}>
                    Open Dashboard <ArrowRight size={14} />
                  </button>
                )}

                <button className="btn btn-outline btn-sm" onClick={logoutUser}>
                  Sign Out
                </button>
              </div>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={() => setShowLogin(true)}>
                <LogIn size={15} /> Staff Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─── Main Content Container ─── */}
      <main className="main-content">
        {/* ─── Editorial Masthead Hero ─── */}
        <section className="editorial-masthead">
          <div className="masthead-top-bar">
            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="hero-pulse-dot" /> Live Multi-Company Customer Support Platform
            </span>
            <span>Fast SLA Resolution • 100% Tenant Isolation</span>
          </div>

          <div className="hero-two-col">
            {/* Left Column: Value Prop + Tracker Search */}
            <div className="hero-left-col">
              <div className="masthead-headline-wrap">
                <h1 className="masthead-title" style={{ fontSize: "3.2rem", lineHeight: 1.15 }}>
                  Customer Support & Ticket Management Made Simple
                </h1>
                <p className="masthead-lead">
                  ResolveIT helps companies resolve customer issues quickly and fairly. Give every business a branded help center, ticket tracking, employee dashboards, and verified customer reviews.
                </p>
              </div>

              {/* Quick Ticket Search Bar */}
              <div id="track" className="masthead-search-row">
                <form onSubmit={handleTrackSubmit} className="masthead-search-form">
                  <input
                    type="text"
                    className="masthead-search-input"
                    value={docketSearch}
                    onChange={(e) => setDocketSearch(e.target.value)}
                    placeholder="Enter your Ticket ID to check status (e.g., TNS-2026-0001)..."
                    autoComplete="off"
                  />
                  <button type="submit" className="btn btn-primary" style={{ whiteSpace: "nowrap" }}>
                    <Search size={16} /> Track Ticket
                  </button>
                </form>

                <div className="masthead-tags-row">
                  <span style={{ fontWeight: 600, textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: "0.08em" }}>
                    Quick Links:
                  </span>
                  {companies && companies.length > 0 ? (
                    companies.slice(0, 3).map((comp) => (
                      <Link key={comp.slug} to={`/s/${comp.slug}`} className="masthead-tag-btn" style={{ textDecoration: "none" }}>
                        {comp.name} Help Desk
                      </Link>
                    ))
                  ) : (
                    <>
                      <Link to="/s/technova" className="masthead-tag-btn" style={{ textDecoration: "none" }}>
                        TechNova Help Desk
                      </Link>
                      <Link to="/s/quickcart" className="masthead-tag-btn" style={{ textDecoration: "none" }}>
                        QuickCart Help Desk
                      </Link>
                    </>
                  )}
                  <button
                    type="button"
                    className="masthead-tag-btn"
                    onClick={() => setDocketSearch("TNS-2026-0001")}
                  >
                    Sample: TNS-2026-0001
                  </button>
                  <button
                    type="button"
                    className="masthead-tag-btn"
                    onClick={() => setDocketSearch("QC-2026-0001")}
                  >
                    Sample: QC-2026-0001
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Live Interactive Ticket Preview Showcase */}
            <div className="hero-right-col">
              <div className="hero-showcase-card">
                <div className="hero-showcase-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span className="hero-showcase-badge">
                      <span className="hero-pulse-dot" /> Live Ticket
                    </span>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.9rem", color: "var(--text-main)" }}>
                      #TNS-2026-0001
                    </span>
                  </div>
                  <span className="badge priority-critical" style={{ fontSize: "0.72rem", padding: "0.2rem 0.55rem" }}>
                    Critical Priority
                  </span>
                </div>

                <div className="hero-showcase-body">
                  <div>
                    <div style={{ fontSize: "0.76rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                      TechNova Solutions Desk • Technical Support
                    </div>
                    <div style={{ fontWeight: 600, fontSize: "1.05rem", color: "var(--text-main)" }}>
                      Production API Gateway Timeout (504 Errors)
                    </div>
                  </div>

                  {/* SLA Target Clock */}
                  <div className="hero-sla-progress-wrap">
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>Target Resolution Window</span>
                      <span style={{ color: "var(--sage)", fontWeight: 700 }}>1h 24m remaining</span>
                    </div>
                    <div className="hero-sla-bar-bg">
                      <div className="hero-sla-bar-fill" />
                    </div>
                  </div>

                  {/* Live Agent Message Bubble */}
                  <div className="hero-chat-bubble">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "var(--primary)", color: "var(--bg-main)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700 }}>SJ</span>
                        <strong style={{ fontSize: "0.82rem", color: "var(--text-main)" }}>Sarah Jenkins</strong>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Lead Engineer</span>
                      </div>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>2m ago</span>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-body)" }}>
                      "We’ve routed traffic around the failing node in us-east and restarted the gateway worker cluster. Monitoring latency now."
                    </p>
                  </div>

                  {/* Customer Rating & Interactive Button */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.5rem", borderTop: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ color: "#f59e0b", fontSize: "0.95rem" }}>★★★★★</span>
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)" }}>5.0 Rating</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("/s/technova/track/TNS-2026-0001")}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem" }}
                    >
                      Track Live Ticket <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tri-Stat Balance Ledger */}
          <div className="masthead-stats-bar">
            <div className="stat-item">
              <div className="stat-value">2.4h</div>
              <div className="stat-caption">Average Resolution Time</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">98.6%</div>
              <div className="stat-caption">On-Time Response Rate</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">100%</div>
              <div className="stat-caption">Secure & Isolated Portals</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">4.9 ★</div>
              <div className="stat-caption">Customer Satisfaction</div>
            </div>
          </div>
        </section>

        {/* ─── Active Companies Directory ─── */}
        <section id="tenants" style={{ marginBottom: "3.5rem" }}>
          <div style={{ marginBottom: "1.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <span className="section-tag">Explore Portals</span>
              <h2 className="page-title" style={{ fontSize: "1.9rem" }}>
                Company Help Centers
              </h2>
              <p className="page-subtitle" style={{ fontSize: "0.95rem" }}>
                Each company has its own public help page, support categories, staff members, and response timers.
              </p>
            </div>

            {isAuthenticated && currentRole === "superadmin" && (
              <button
                onClick={() => navigate("/admin/companies")}
                className="btn btn-outline btn-sm"
              >
                + Add New Company
              </button>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.75rem" }}>
            {companies && companies.length > 0 ? (
              companies.map((c) => {
                const initials = (c.name || "Company")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                const primaryColor = c.branding?.primaryColor || "var(--primary)";
                const prefix = c.ticketPrefix || c.slug?.toUpperCase() || "TKT";

                return (
                  <div
                    key={c.slug}
                    className="card"
                    style={{ padding: "2rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div
                            style={{
                              width: "42px",
                              height: "42px",
                              background: primaryColor,
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontFamily: "var(--font-display)",
                              fontWeight: 700,
                              fontSize: "1.1rem",
                              borderRadius: "var(--radius-sm)"
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "0.15rem" }}>
                              {c.name}
                            </h3>
                            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                              {c.industry || "General"} • Prefix: {prefix}
                            </span>
                          </div>
                        </div>
                        <span className="badge badge-primary" style={{ background: "var(--sage-light)", color: "var(--sage)" }}>
                          {c.status === "active" ? "Active" : c.status}
                        </span>
                      </div>

                      <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                        {c.branding?.tagline ||
                          c.branding?.welcomeMessage ||
                          "Official customer support desk. File complaints, browse FAQs, track ticket progress, and check resolution times."}
                      </p>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", borderTop: "1px solid var(--border-color)", paddingTop: "1.25rem" }}>
                      <Link
                        to={`/s/${c.slug}`}
                        className="btn btn-primary btn-sm"
                        style={{ textDecoration: "none", width: "100%", textAlign: "center" }}
                      >
                        Open Help Center <ExternalLink size={14} />
                      </Link>

                      {isAuthenticated && (currentRole === "developer" || currentRole === "employee") && user?.company?.slug === c.slug ? (
                        <Link
                          to={`/portal/${c.slug}`}
                          className="btn btn-outline btn-sm"
                          style={{ width: "100%", textAlign: "center", textDecoration: "none" }}
                        >
                          <Briefcase size={14} /> Open Staff Portal
                        </Link>
                      ) : isAuthenticated && currentRole === "superadmin" ? (
                        <Link
                          to={`/portal/${c.slug}`}
                          className="btn btn-outline btn-sm"
                          style={{ width: "100%", textAlign: "center", textDecoration: "none" }}
                        >
                          <Briefcase size={14} /> Inspect Company Portal
                        </Link>
                      ) : (
                        <Link
                          to={`/s/${c.slug}/complaint`}
                          className="btn btn-outline btn-sm"
                          style={{ width: "100%", textAlign: "center", textDecoration: "none" }}
                        >
                          <FileText size={14} /> File Grievance / Ticket
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                No active companies found.
              </div>
            )}

            {/* Super Admin Control Room - Protected & Restricted to Super Admin */}
            {isAuthenticated && currentRole === "superadmin" && (
              <div
                className="card"
                style={{
                  padding: "2rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  background: "linear-gradient(180deg, var(--bg-card) 0%, var(--bg-subtle) 100%)",
                  borderColor: "var(--border-dark)"
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div
                        style={{
                          width: "42px",
                          height: "42px",
                          background: "var(--bronze)",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "var(--radius-sm)"
                        }}
                      >
                        <ShieldCheck size={22} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "0.15rem" }}>
                          Super Admin Panel
                        </h3>
                        <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                          Platform Administration
                        </span>
                      </div>
                    </div>
                    <span className="badge badge-primary">Admin</span>
                  </div>

                  <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                    Complete system control: register new companies, manage company lead logins, check overall ticket volume, and view response times.
                  </p>
                </div>

                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1.25rem" }}>
                  <button
                    onClick={() => navigate("/admin")}
                    className="btn btn-primary btn-sm"
                    style={{ width: "100%" }}
                  >
                    <Lock size={14} /> Open Super Admin Panel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ─── 3 Architectural Pillars ─── */}
        <section id="features" style={{ marginBottom: "3.5rem" }}>
          <div style={{ marginBottom: "1.75rem" }}>
            <span className="section-tag">Key Features</span>
            <h2 className="page-title" style={{ fontSize: "1.9rem" }}>
              Everything You Need for Customer Support
            </h2>
          </div>

          <div className="grid-cards-3">
            <div className="feature-card">
              <div>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--primary-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1.25rem",
                    color: "var(--primary)"
                  }}
                >
                  <Building2 size={24} />
                </div>
                <h3>Dedicated Company Help Desks</h3>
                <p>
                  Every company gets its own branded customer portal (like <code>/s/technova</code>) with custom FAQs, ticket categories, and an internal workspace for support staff.
                </p>
              </div>
              <a href="#tenants" className="card-link" style={{ textDecoration: "none" }}>Explore Companies →</a>
            </div>

            <div className="feature-card">
              <div>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--amber-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1.25rem",
                    color: "var(--amber)"
                  }}
                >
                  <Shield size={24} />
                </div>
                <h3>Clear Team Roles & Access</h3>
                <p>
                  Four straightforward roles: Super Admins manage the platform, Company Leads manage settings and staff, Agents answer tickets, and Customers submit issues.
                </p>
              </div>
              <a href="#tenants" className="card-link" style={{ textDecoration: "none" }}>View Team Roles →</a>
            </div>

            <div className="feature-card">
              <div>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--sage-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1.25rem",
                    color: "var(--sage)"
                  }}
                >
                  <BarChart3 size={24} />
                </div>
                <h3>Fast Deadlines & Star Ratings</h3>
                <p>
                  Set clear target response times based on urgency (Urgent, High, Normal). When an issue is resolved, customers can rate their experience from 1 to 5 stars.
                </p>
              </div>
              <a href="#track" className="card-link" style={{ textDecoration: "none" }}>Track Tickets →</a>
            </div>
          </div>
        </section>

        {/* ─── How It Works Stepper & Info ─── */}
        <section className="home-grid-layout" style={{ marginBottom: "4rem" }}>
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">How Support Tickets Work</h3>
                <p className="panel-subtitle">A simple 4-step path from problem to resolution</p>
              </div>
            </div>
            <div className="panel-body">
              <div className="sla-stepper">
                <div className="sla-step">
                  <div className="step-badge">1</div>
                  <div className="step-info">
                    <h4>1. Submit a Request</h4>
                    <p>Customers report an issue on the company help desk and receive an instant tracking ID.</p>
                  </div>
                </div>

                <div className="sla-step">
                  <div className="step-badge">2</div>
                  <div className="step-info">
                    <h4>2. Assigned to an Agent</h4>
                    <p>The ticket is assigned to a team member with a target deadline based on priority.</p>
                  </div>
                </div>

                <div className="sla-step">
                  <div className="step-badge">3</div>
                  <div className="step-info">
                    <h4>3. Real-Time Chat & Internal Notes</h4>
                    <p>Agents reply directly to customers while leaving private notes for colleagues to solve issues faster.</p>
                  </div>
                </div>

                <div className="sla-step">
                  <div className="step-badge">4</div>
                  <div className="step-info">
                    <h4>4. Resolved & Customer Rating</h4>
                    <p>Once resolved, the customer receives an update and can leave a 1-to-5 star satisfaction review.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">SLA Standards & Commitments</h3>
                <p className="panel-subtitle">Guaranteed resolution targets for fast and fair dispute handling</p>
              </div>
            </div>
            <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ padding: "1rem", background: "var(--bg-main)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "0.6rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Target Resolution Windows</span>
                  <span style={{ color: "var(--sage)", fontWeight: 700, fontSize: "0.72rem" }}>ACTIVE MONITORING</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem", textAlign: "center" }}>
                  <div style={{ padding: "0.6rem 0.4rem", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: "0.68rem", color: "var(--brick)", fontWeight: 700, letterSpacing: "0.06em" }}>CRITICAL</div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-main)", marginTop: "0.15rem" }}>&lt; 4h</div>
                  </div>
                  <div style={{ padding: "0.6rem 0.4rem", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: "0.68rem", color: "var(--bronze)", fontWeight: 700, letterSpacing: "0.06em" }}>HIGH</div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-main)", marginTop: "0.15rem" }}>&lt; 12h</div>
                  </div>
                  <div style={{ padding: "0.6rem 0.4rem", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: "0.68rem", color: "var(--sage)", fontWeight: 700, letterSpacing: "0.06em" }}>NORMAL</div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-main)", marginTop: "0.15rem" }}>&lt; 24h</div>
                  </div>
                </div>
              </div>

              <div style={{ padding: "1rem", background: "var(--bg-main)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                  Automated Grievance Dispatch
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-main)" }}>
                  Instant Lead Engineer Notification
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.25rem", lineHeight: 1.5 }}>
                  Every new ticket instantly routes an automated email alert to the company's assigned developer to trigger immediate resolution.
                </div>
              </div>

              <div className="emergency-box" style={{ borderColor: "var(--border-color)", background: "var(--bg-subtle)" }}>
                <strong style={{ color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Sparkles size={15} style={{ color: "var(--bronze)" }} /> 100% Customer Satisfaction Guarantee
                </strong>
                <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.82rem", color: "var(--text-body)", lineHeight: 1.5 }}>
                  Every resolved ticket includes verified customer ratings and feedback history, ensuring constant quality across all company support portals.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer
        style={{
          borderTop: "1px solid var(--border-color)",
          backgroundColor: "var(--bg-card)",
          padding: "2.5rem 3.5rem",
          fontSize: "0.85rem",
          color: "var(--text-muted)"
        }}
      >
        <div
          style={{
            maxWidth: "1680px",
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1.5rem"
          }}
        >
          <div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-main)", letterSpacing: "0.08em" }}>
              ResolveIT
            </span>{" "}
            • Customer Support & Ticket Management Platform
          </div>

          <div style={{ display: "flex", gap: "1.5rem" }}>
            <Link to="/s/technova" style={{ color: "var(--text-main)", textDecoration: "none" }}>
              TechNova Help Desk
            </Link>
            <Link to="/s/quickcart" style={{ color: "var(--text-main)", textDecoration: "none" }}>
              QuickCart Help Desk
            </Link>
            <button
              onClick={() => setShowLogin(true)}
              style={{ background: "none", border: "none", color: "var(--text-main)", cursor: "pointer", fontSize: "0.85rem", padding: 0 }}
            >
              Staff Sign In
            </button>
          </div>
        </div>
      </footer>

      {/* ─── Staff Sign In Modal ─── */}
      {showLogin && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1.5rem"
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "460px",
              padding: "2.5rem",
              boxShadow: "var(--shadow-lg)",
              background: "var(--bg-card)",
              border: "1px solid var(--border-dark)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <Lock size={22} style={{ color: "var(--primary)" }} />
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", color: "var(--text-main)" }}>
                Staff Sign In
              </h2>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem", lineHeight: 1.5 }}>
              Sign in to manage your company help desk, view customer tickets, and reply to inquiries.
            </p>

            {error && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  background: "var(--brick-light)",
                  border: "1px solid var(--brick)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--brick)",
                  fontSize: "0.85rem",
                  marginBottom: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
              >
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@resolveit.com"
                  required
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.85rem",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-main)",
                    color: "var(--text-main)",
                    fontSize: "0.9rem"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.85rem",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-main)",
                    color: "var(--text-main)",
                    fontSize: "0.9rem"
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: "0.65rem" }}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogin(false)}
                  className="btn btn-outline"
                  style={{ padding: "0.65rem 1rem" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
