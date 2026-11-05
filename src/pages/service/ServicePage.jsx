import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { GoogleSignInButton } from "../../components/common/GoogleSignInButton";
import { SetPasswordModal } from "../../components/common/SetPasswordModal";
import {
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  ShieldCheck,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Sun,
  Moon,
  LogIn,
  LogOut,
  User,
  Inbox,
  AlertCircle,
  Zap,
  Sparkles,
  Key,
  CreditCard,
  Terminal,
  Package,
  Laptop,
  ShoppingBag,
  Car,
  Headphones,
  HeartPulse,
  Building2,
  Briefcase,
  Shield
} from "lucide-react";

export const ServicePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, currentRole, theme, toggleTheme, loginWithGoogle, logoutUser } = useAuth();

  const [company, setCompany] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & FAQ filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Track ticket input
  const [trackId, setTrackId] = useState("");

  // Customer Quick Sign-in Modal for academic testing
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");

  // First-time customer password setup
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [authModalError, setAuthModalError] = useState("");
  const [isStaffError, setIsStaffError] = useState(false);
  const [staffPortalLink, setStaffPortalLink] = useState("");

  useEffect(() => {
    fetchCompanyData();
  }, [slug]);

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/companies/${slug}/public`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Company service page not found");
      }
      const data = await res.json();
      setCompany(data.company);
      setFaqs(data.faqs || []);
      setCategories(data.categories || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = (res) => {
    setAuthModalError("");
    setIsStaffError(false);
    setShowLoginModal(false);
    if (res?.needsPasswordSetup) {
      setShowPasswordModal(true);
    }
  };

  const handleAuthError = (errMsg, res) => {
    setAuthModalError(errMsg);
    if (res?.isStaffAccount) {
      setIsStaffError(true);
      setStaffPortalLink(res.portalPath || "/portal");
    } else {
      setIsStaffError(false);
    }
  };

  const handleEmailLogin = async (email, name) => {
    setAuthModalError("");
    setIsStaffError(false);
    const cred = `customer_email:${email.trim().toLowerCase()}`;
    const result = await loginWithGoogle(cred, slug, "customer");
    if (result.success) {
      setShowLoginModal(false);
      if (result.needsPasswordSetup) {
        setShowPasswordModal(true);
      }
    } else {
      handleAuthError(result.error || "Login failed", result);
    }
  };

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (trackId.trim()) {
      navigate(`/s/${slug}/track/${encodeURIComponent(trackId.trim().toUpperCase())}`);
    }
  };

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat =
      selectedCategory === "all" || faq.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-main)" }}>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: "1.2rem", color: "var(--text-muted)" }}>
          Loading service portal...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-main)", padding: "2rem" }}>
        <div style={{ maxWidth: "480px", textAlign: "center", padding: "2.5rem", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)" }}>
          <AlertCircle size={44} style={{ color: "var(--brick)", margin: "0 auto 1rem" }} />
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", marginBottom: "0.5rem", color: "var(--text-main)" }}>
            Service Page Unavailable
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>{error}</p>
          <Link
            to="/"
            style={{
              display: "inline-block",
              padding: "0.6rem 1.4rem",
              background: "var(--primary)",
              color: "var(--bg-card)",
              borderRadius: "var(--radius-md)",
              textDecoration: "none",
              fontWeight: 600
            }}
          >
            Back to Platform Home
          </Link>
        </div>
      </div>
    );
  }

  const branding = company?.branding || {};
  const primaryColor = branding.primaryColor || "var(--primary)";
  const accentColor = branding.accentColor || "var(--bronze)";

  // Creative Industry Icon Helper
  const getIndustryIcon = (industry = "", customColor = accentColor) => {
    const props = { size: 14, style: { color: customColor, flexShrink: 0 } };
    const ind = (industry || "").toLowerCase();
    if (ind.includes("tech") || ind.includes("software") || ind.includes("it")) {
      return <Laptop {...props} />;
    }
    if (ind.includes("commerce") || ind.includes("retail") || ind.includes("shop") || ind.includes("cart")) {
      return <ShoppingBag {...props} />;
    }
    if (ind.includes("auto") || ind.includes("car") || ind.includes("motor")) {
      return <Car {...props} />;
    }
    if (ind.includes("health") || ind.includes("med") || ind.includes("pharma") || ind.includes("care")) {
      return <HeartPulse {...props} />;
    }
    if (ind.includes("financ") || ind.includes("bank") || ind.includes("pay")) {
      return <CreditCard {...props} />;
    }
    if (ind.includes("service") || ind.includes("consult")) {
      return <Headphones {...props} />;
    }
    return <Building2 {...props} />;
  };

  // Creative Category Icon Helper for FAQ topics
  const getCategoryIcon = (categoryName = "", customColor = accentColor) => {
    const props = { size: 13, style: { color: customColor, flexShrink: 0 } };
    const cat = (categoryName || "").toLowerCase();
    if (cat.includes("account") || cat.includes("login") || cat.includes("access") || cat.includes("password")) {
      return <Key {...props} />;
    }
    if (cat.includes("bill") || cat.includes("invoice") || cat.includes("payment") || cat.includes("refund")) {
      return <CreditCard {...props} />;
    }
    if (cat.includes("tech") || cat.includes("bug") || cat.includes("system") || cat.includes("software")) {
      return <Terminal {...props} />;
    }
    if (cat.includes("order") || cat.includes("delivery") || cat.includes("shipping") || cat.includes("product")) {
      return <Package {...props} />;
    }
    if (cat.includes("feature") || cat.includes("request")) {
      return <Sparkles {...props} />;
    }
    if (cat.includes("security") || cat.includes("privacy")) {
      return <Shield {...props} />;
    }
    return <FileText {...props} />;
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-main)", color: "var(--text-body)" }}>
      {/* ─── Top Bar / Navbar ─── */}
      <header
        style={{
          borderBottom: "1px solid var(--border-color)",
          backgroundColor: "var(--bg-card)",
          position: "sticky",
          top: 0,
          zIndex: 40
        }}
      >
        <div
          style={{
            maxWidth: "1180px",
            margin: "0 auto",
            padding: "0.85rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          {/* Brand & Back Navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link
              to={
                isAuthenticated && currentRole === "superadmin"
                  ? "/admin"
                  : isAuthenticated && (currentRole === "developer" || currentRole === "employee")
                  ? `/portal/${user?.company?.slug || slug}`
                  : "/"
              }
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.42rem 0.85rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-main)",
                color: "var(--text-main)",
                textDecoration: "none",
                fontSize: "0.82rem",
                fontWeight: 600,
                transition: "all var(--transition-fast)",
                whiteSpace: "nowrap"
              }}
              title="Return to Dashboard / Platform"
            >
              <ArrowLeft size={15} />
              {isAuthenticated && currentRole === "superadmin"
                ? "Admin Dashboard"
                : isAuthenticated && (currentRole === "developer" || currentRole === "employee")
                ? "Staff Portal"
                : "Back to Platform"}
            </Link>

            <div style={{ width: "1px", height: "24px", backgroundColor: "var(--border-color)" }} />

            {/* Brand */}
            <Link to={`/s/${slug}`} style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
              {company?.logo ? (
                <img
                  src={company.logo}
                  alt={company.name}
                  style={{ width: "36px", height: "36px", objectFit: "contain", borderRadius: "var(--radius-sm)" }}
                />
              ) : (
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    background: accentColor,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "1rem",
                    fontFamily: "var(--font-display)",
                    borderRadius: "var(--radius-sm)"
                  }}
                >
                  {company?.name?.slice(0, 2).toUpperCase() || "RS"}
                </div>
              )}
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)", letterSpacing: "0.04em" }}>
                  {company?.name}
                </div>
                <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)" }}>
                  Support & Redressal Center
                </div>
              </div>
            </Link>
          </div>

          {/* Right Navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              style={{
                background: "transparent",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-sm)",
                padding: "0.45rem",
                cursor: "pointer",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center"
              }}
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {isAuthenticated ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <Link
                  to={`/s/${slug}/my-complaints`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.45rem 0.9rem",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-main)",
                    textDecoration: "none",
                    fontSize: "0.85rem",
                    fontWeight: 600
                  }}
                >
                  <Inbox size={15} /> My Complaints
                </Link>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {user?.avatar && (
                    <img
                      src={user.avatar}
                      alt={user.name || "User"}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        if (e.currentTarget.nextSibling) {
                          e.currentTarget.nextSibling.style.display = "flex";
                        }
                      }}
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        border: "1px solid var(--border-color)",
                        objectFit: "cover"
                      }}
                    />
                  )}
                  <div
                    style={{
                      display: user?.avatar ? "none" : "flex",
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "var(--primary)",
                      color: "#ffffff",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      border: "1px solid var(--border-color)"
                    }}
                  >
                    {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>
                    {user?.name?.split(" ")[0]}
                  </span>
                  <button
                    onClick={logoutUser}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-dim)",
                      cursor: "pointer",
                      padding: "0.3rem",
                      display: "flex",
                      alignItems: "center"
                    }}
                    title="Logout"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1.1rem",
                  background: primaryColor,
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                <LogIn size={15} /> Customer Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section
        style={{
          borderBottom: "1px solid var(--border-color)",
          background: `radial-gradient(circle at 50% 0%, ${accentColor}18 0%, transparent 65%), linear-gradient(180deg, var(--bg-card) 0%, var(--bg-main) 100%)`,
          padding: "3.5rem 1.5rem"
        }}
      >
        <div style={{ maxWidth: "860px", margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.35rem 0.95rem",
              background: `${accentColor}18`,
              border: `1px solid ${accentColor}44`,
              borderRadius: "var(--radius-full)",
              fontSize: "0.76rem",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: accentColor,
              fontWeight: 700,
              marginBottom: "1.2rem",
              fontFamily: "var(--font-display)",
              boxShadow: `0 2px 8px ${accentColor}15`
            }}
          >
            {getIndustryIcon(company?.industry)}
            <span>
              {company?.industry && company.industry.trim().length > 1
                ? `${company.industry.toUpperCase()} RESOLUTION DESK`
                : "OFFICIAL REDRESSAL DESK"}
            </span>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "2.85rem",
              lineHeight: 1.2,
              fontWeight: 600,
              color: primaryColor,
              marginBottom: "1rem",
              letterSpacing: "-0.01em"
            }}
          >
            {branding.welcomeMessage || `Welcome to ${company?.name} Support`}
          </h1>

          <p
            style={{
              fontSize: "1.1rem",
              color: "var(--text-muted)",
              maxWidth: "640px",
              margin: "0 auto 2.2rem",
              lineHeight: 1.6
            }}
          >
            {branding.tagline ||
              "Prompt, accountable grievance redressal. Search our knowledge base or lodge an official complaint for immediate case handling."}
          </p>

          {/* Quick Action Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.25rem",
              maxWidth: "680px",
              margin: "0 auto"
            }}
          >
            {/* File Complaint CTA */}
            <Link
              to={`/s/${slug}/complaint`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "1.5rem",
                background: "var(--bg-card)",
                border: "1px solid var(--border-dark)",
                borderRadius: "var(--radius-md)",
                textDecoration: "none",
                textAlign: "left",
                boxShadow: "var(--shadow-sm)",
                transition: "transform var(--transition-fast), border-color var(--transition-fast)"
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "var(--radius-md)",
                  background: accentColor,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "0.95rem",
                  boxShadow: `0 4px 12px ${accentColor}33`
                }}
              >
                <FileText size={22} />
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.25rem" }}>
                File a Formal Complaint
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem", flex: 1 }}>
                Submit a new dispute or incident. Auto-assigned with SLA tracking.
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", fontWeight: 600, color: accentColor }}>
                Start Intake Form <ArrowRight size={14} />
              </div>
            </Link>

            {/* Track Complaint Box */}
            <div
              style={{
                padding: "1.5rem",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                textAlign: "left",
                boxShadow: "var(--shadow-sm)"
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "var(--radius-md)",
                  background: `${accentColor}20`,
                  color: accentColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "0.95rem"
                }}
              >
                <Clock size={22} />
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.25rem" }}>
                Track an Existing Ticket
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.85rem" }}>
                Enter your alphanumeric reference code to inspect audit timeline.
              </div>
              <form onSubmit={handleTrackSubmit} style={{ display: "flex", gap: "0.4rem" }}>
                <input
                  type="text"
                  placeholder="e.g. TNS-2026-0001"
                  value={trackId}
                  onChange={(e) => setTrackId(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "0.45rem 0.65rem",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-surface)",
                    color: "var(--text-main)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.85rem"
                  }}
                />
                <button
                  type="submit"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.5rem 1rem",
                    background: primaryColor,
                    color: "#fff",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    boxShadow: `0 2px 6px ${primaryColor}30`
                  }}
                >
                  <Search size={14} />
                  Track
                </button>
              </form>
            </div>
          </div>

          {/* ─── Institutional Trust & Guarantee Badges ─── */}
          <div
            style={{
              marginTop: "3rem",
              paddingTop: "2rem",
              borderTop: "1px dashed var(--border-color)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1.25rem",
              textAlign: "left"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.85rem",
                padding: "0.85rem 1rem",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)"
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "var(--radius-sm)",
                  background: `${accentColor}18`,
                  color: accentColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                <Zap size={18} />
              </div>
              <div>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.2rem" }}>
                  Guaranteed SLA Redressal
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
                  Binding resolution deadlines tracked automatically from triage to final closure.
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.85rem",
                padding: "0.85rem 1rem",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)"
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "var(--radius-sm)",
                  background: `${primaryColor}15`,
                  color: primaryColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                <ShieldCheck size={18} />
              </div>
              <div>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.2rem" }}>
                  100% Confidential & Secure
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
                  Multi-tenant data isolation and immutable audit logs on every customer case.
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.85rem",
                padding: "0.85rem 1rem",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)"
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "var(--radius-sm)",
                  background: `${accentColor}18`,
                  color: accentColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                <Sparkles size={18} />
              </div>
              <div>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.2rem" }}>
                  Verified Redressal Outcomes
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
                  Direct resolution engineering verified by assigned company developers.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Knowledge Base & FAQs Section ─── */}
      <section style={{ maxWidth: "980px", margin: "0 auto", padding: "3.5rem 1.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", color: "var(--text-main)", marginBottom: "0.5rem" }}>
            Frequently Asked Questions
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
            Search through common questions and verified institutional procedures.
          </p>

          {/* Search Input */}
          <div style={{ maxWidth: "560px", margin: "1.5rem auto 1.5rem", position: "relative" }}>
            <Search
              size={18}
              style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: accentColor }}
            />
            <input
              type="text"
              placeholder="Search by keywords, policies, billing..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem 1rem 0.75rem 2.8rem",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-card)",
                color: "var(--text-main)",
                fontSize: "0.95rem"
              }}
            />
          </div>

          {/* Category Filter Chips */}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.5rem" }}>
            <button
              onClick={() => setSelectedCategory("all")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 1rem",
                borderRadius: "var(--radius-full)",
                border: selectedCategory === "all" ? `1px solid ${primaryColor}` : "1px solid var(--border-color)",
                background: selectedCategory === "all" ? primaryColor : "var(--bg-card)",
                color: selectedCategory === "all" ? "#fff" : "var(--text-body)",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all var(--transition-fast)",
                boxShadow: selectedCategory === "all" ? `0 2px 8px ${primaryColor}33` : "none"
              }}
            >
              <Sparkles size={13} style={{ color: selectedCategory === "all" ? "#fff" : accentColor }} />
              All Topics
            </button>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat._id || cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.45rem 1rem",
                    borderRadius: "var(--radius-full)",
                    border: isSelected ? `1px solid ${primaryColor}` : "1px solid var(--border-color)",
                    background: isSelected ? primaryColor : "var(--bg-card)",
                    color: isSelected ? "#fff" : "var(--text-body)",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                    boxShadow: isSelected ? `0 2px 8px ${primaryColor}33` : "none"
                  }}
                >
                  {getCategoryIcon(cat.name, isSelected ? "#fff" : accentColor)}
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* FAQ Accordion List */}
        {filteredFaqs.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)"
            }}
          >
            <HelpCircle size={36} style={{ color: "var(--text-dim)", margin: "0 auto 0.75rem" }} />
            <p style={{ color: "var(--text-muted)" }}>
              No articles found matching your criteria.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {filteredFaqs.map((faq, index) => {
              const isExpanded = expandedFaq === index;
              return (
                <div
                  key={faq._id || index}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderLeft: isExpanded ? `3px solid ${accentColor}` : "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    overflow: "hidden",
                    transition: "border-color var(--transition-fast)"
                  }}
                >
                  <button
                    onClick={() => setExpandedFaq(isExpanded ? null : index)}
                    style={{
                      width: "100%",
                      padding: "1rem 1.25rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "transparent",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      gap: "1rem"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          padding: "0.2rem 0.55rem",
                          borderRadius: "var(--radius-full)",
                          background: `${accentColor}15`,
                          color: accentColor,
                          border: `1px solid ${accentColor}30`
                        }}
                      >
                        {getCategoryIcon(faq.category, accentColor)}
                        {faq.category || "General"}
                      </span>
                      <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-main)" }}>
                        {faq.question}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={18} style={{ color: accentColor, flexShrink: 0 }} />
                    ) : (
                      <ChevronDown size={18} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
                    )}
                  </button>

                  {isExpanded && (
                    <div
                      style={{
                        padding: "0 1.25rem 1.25rem 1.25rem",
                        color: "var(--text-body)",
                        fontSize: "0.92rem",
                        lineHeight: 1.7,
                        borderTop: "1px dashed var(--border-color)",
                        marginTop: "0.25rem",
                        paddingTop: "0.85rem"
                      }}
                    >
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Footer ─── */}
      <footer
        style={{
          borderTop: "1px solid var(--border-color)",
          backgroundColor: "var(--bg-subtle)",
          padding: "2rem 1.5rem",
          textAlign: "center",
          fontSize: "0.82rem",
          color: "var(--text-muted)"
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div>
            <strong>{company?.name}</strong> • Customer Redressal System powered by{" "}
            <Link to="/" style={{ color: "var(--text-main)", fontWeight: 600, textDecoration: "none" }}>
              ResolveIT
            </Link>
          </div>
          <div style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>
            All complaints filed through this portal are immutable, time-stamped, and audited in compliance with organizational SLA policies.
          </div>
        </div>
      </footer>

      {/* ─── Customer Login Modal ─── */}
      {showLoginModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem"
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "440px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-dark)",
              borderRadius: "var(--radius-lg)",
              padding: "2rem",
              boxShadow: "var(--shadow-lg)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
              <ShieldCheck size={26} style={{ color: "var(--primary)" }} />
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", color: "var(--text-main)" }}>
                Customer Verification
              </h3>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              Sign in with your verified Google account to manage your complaints and receive tracking updates:
            </p>

            {/* Error & Staff Account Notice */}
            {authModalError && (
              <div
                style={{
                  padding: "0.85rem 1rem",
                  background: "var(--brick-light)",
                  border: "1px solid var(--brick)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--brick)",
                  fontSize: "0.84rem",
                  marginBottom: "1.25rem",
                  lineHeight: 1.45,
                }}
              >
                <div>{authModalError}</div>
                {isStaffError && (
                  <div style={{ marginTop: "0.6rem" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLoginModal(false);
                        navigate(staffPortalLink);
                      }}
                      style={{
                        padding: "0.45rem 0.9rem",
                        background: "var(--primary)",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Go to Staff Portal &rarr;
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Official Google Sign-In */}
            <div style={{ marginBottom: "1.25rem" }}>
              <GoogleSignInButton
                companySlug={slug}
                portalType="customer"
                onSuccess={handleAuthSuccess}
                onError={handleAuthError}
              />
            </div>

            {/* Custom Input */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem", marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                Or Sign In with Email Address:
              </div>
              <input
                type="text"
                placeholder="Full Name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  marginBottom: "0.4rem",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-main)",
                  fontSize: "0.85rem"
                }}
              />
              <input
                type="email"
                placeholder="customer@example.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-main)",
                  fontSize: "0.85rem"
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              {customEmail && (
                <button
                  onClick={() => handleEmailLogin(customEmail, customName || customEmail.split("@")[0])}
                  style={{
                    flex: 1,
                    padding: "0.6rem",
                    background: "var(--primary)",
                    color: "var(--bg-card)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Continue
                </button>
              )}
              <button
                onClick={() => setShowLoginModal(false)}
                style={{
                  flex: 1,
                  padding: "0.6rem",
                  background: "transparent",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-muted)",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* First-Time Google Customer Password Setup Modal */}
      <SetPasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        userName={user?.name}
        userEmail={user?.email}
        onSuccess={() => {
          setShowPasswordModal(false);
        }}
      />
    </div>
  );
};
