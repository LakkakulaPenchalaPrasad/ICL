import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { GoogleSignInButton } from "../../components/common/GoogleSignInButton";
import { SetPasswordModal } from "../../components/common/SetPasswordModal";
import {
  FileText,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Copy,
  ArrowRight,
  ShieldCheck,
  Phone,
  User,
  Mail,
  HelpCircle,
  Send,
  Calendar,
  Clock,
  Tag,
  UserCheck,
  Layers,
  AlertTriangle,
} from "lucide-react";

export const ComplaintForm = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, currentRole, apiFetch, loginWithGoogle } = useAuth();

  const [company, setCompany] = useState(null);
  const [categories, setCategories] = useState([]);
  const [developerInfo, setDeveloperInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [phone, setPhone] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [category, setCategory] = useState("General Support");
  const [priority, setPriority] = useState("Medium");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [createdTicket, setCreatedTicket] = useState(null);
  const [copied, setCopied] = useState(false);

  // Quick Sign In modal if guest
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [authModalError, setAuthModalError] = useState("");
  const [isStaffError, setIsStaffError] = useState(false);
  const [staffPortalLink, setStaffPortalLink] = useState("");

  useEffect(() => {
    fetchCompanyData();
  }, [slug]);

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

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/companies/${slug}/public`);
      if (res.ok) {
        const data = await res.json();
        setCompany(data.company);
        setCategories(data.categories || []);
        setDeveloperInfo(data.developer || null);
        if (data.categories && data.categories.length > 0) {
          setCategory(data.categories[0].name);
        } else {
          setCategory("General Support");
        }
      }
    } catch (err) {
      console.error("Error fetching company details:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    if (currentRole && currentRole !== "customer") {
      setError("Staff members cannot lodge customer complaints. Please switch to a customer account or return to the Staff Portal.");
      return;
    }

    if (!subject.trim() || subject.trim().length < 3) {
      setError("Please provide a descriptive subject line (at least 3 characters).");
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setError("Please provide at least 10 characters of detailed explanation.");
      return;
    }

    if (incidentDate) {
      const parsedDate = new Date(incidentDate);
      if (isNaN(parsedDate.getTime())) {
        setError("Invalid incident date format.");
        return;
      }
      if (parsedDate > new Date()) {
        setError("Incident date cannot be in the future. Please select the date when the incident occurred.");
        return;
      }
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
      if (parsedDate < fiveYearsAgo) {
        setError("Incident date cannot be older than 5 years.");
        return;
      }
    }

    if (phone.trim()) {
      const cleanPhone = phone.trim().replace(/[\s\-\(\)\+]/g, '');
      if (cleanPhone.length < 7 || cleanPhone.length > 15 || !/^\d+$/.test(cleanPhone)) {
        setError("Please provide a valid contact phone number (at least 7 digits).");
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await apiFetch(`/api/companies/${slug}/tickets`, {
        method: "POST",
        body: JSON.stringify({
          category: category || categories[0]?.name || "General Support",
          priority: priority || "Medium",
          subject: subject.trim(),
          description: description.trim(),
          phone: phone.trim(),
          incidentDate: incidentDate || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit complaint.");
      }

      setCreatedTicket(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyId = () => {
    if (createdTicket?.ticketId) {
      navigator.clipboard.writeText(createdTicket.ticketId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const branding = company?.branding || {};
  const primaryColor = branding.primaryColor || "var(--primary)";
  const accentColor = branding.accentColor || "var(--bronze)";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-main)", color: "var(--text-body)" }}>
      {/* ─── Header ─── */}
      <header
        style={{
          borderBottom: "1px solid var(--border-color)",
          backgroundColor: "var(--bg-card)",
          padding: "1rem 1.5rem"
        }}
      >
        <div
          style={{
            maxWidth: "960px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
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
                gap: "0.4rem",
                padding: "0.35rem 0.7rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-main)",
                color: "var(--text-muted)",
                textDecoration: "none",
                fontSize: "0.82rem",
                fontWeight: 600
              }}
              title="Return to Dashboard / Platform"
            >
              <ArrowLeft size={14} />
              {isAuthenticated && currentRole === "superadmin"
                ? "Admin Dashboard"
                : isAuthenticated && (currentRole === "developer" || currentRole === "employee")
                ? "Staff Portal"
                : "Dashboard"}
            </Link>

            <div style={{ width: "1px", height: "20px", backgroundColor: "var(--border-color)" }} />

            <Link
              to={`/s/${slug}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                textDecoration: "none",
                color: "var(--text-main)",
                fontSize: "0.9rem",
                fontWeight: 600
              }}
            >
              Back to {company?.name || "Service Portal"}
            </Link>
          </div>

          <div
            style={{
              fontSize: "0.76rem",
              color: accentColor,
              background: `${accentColor}18`,
              border: `1px solid ${accentColor}44`,
              padding: "0.25rem 0.65rem",
              borderRadius: "var(--radius-full)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 700
            }}
          >
            Formal Grievance Lodging
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main style={{ maxWidth: "760px", margin: "2.5rem auto 4rem", padding: "0 1.5rem" }}>
        {/* SUCCESS STATE */}
        {createdTicket ? (
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-dark)",
              borderRadius: "var(--radius-lg)",
              padding: "2.5rem",
              textAlign: "center",
              boxShadow: "var(--shadow-md)"
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "var(--sage-light)",
                color: "var(--sage)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.25rem"
              }}
            >
              <CheckCircle size={32} />
            </div>

            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "1.9rem",
                color: "var(--text-main)",
                marginBottom: "0.5rem"
              }}
            >
              Grievance Registered Successfully
            </h1>

            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", maxWidth: "520px", margin: "0 auto 1.75rem" }}>
              Your complaint has been successfully registered in the audit ledger and prioritized according to service level commitments.
            </p>

            {/* Ticket Code Box */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.85rem",
                padding: "0.85rem 1.4rem",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                marginBottom: "2rem"
              }}
            >
              <div>
                <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", textAlign: "left" }}>
                  Case Reference Code
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)" }}>
                  {createdTicket.ticketId}
                </div>
              </div>
              <button
                onClick={handleCopyId}
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
                title="Copy reference code"
              >
                <Copy size={16} />
              </button>
              {copied && <span style={{ fontSize: "0.75rem", color: "var(--sage)", fontWeight: 600 }}>Copied!</span>}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.85rem" }}>
              <Link
                to={`/s/${slug}/track/${createdTicket.ticketId}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.65rem 1.4rem",
                  background: primaryColor,
                  color: "#fff",
                  borderRadius: "var(--radius-sm)",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  boxShadow: `0 2px 8px ${primaryColor}30`
                }}
              >
                Track Live Status <ArrowRight size={15} />
              </Link>
              <Link
                to={`/s/${slug}/my-complaints`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.65rem 1.4rem",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-main)",
                  borderRadius: "var(--radius-sm)",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "0.9rem"
                }}
              >
                View My Complaints
              </Link>
              <button
                onClick={() => {
                  setCreatedTicket(null);
                  setSubject("");
                  setDescription("");
                  setPhone("");
                }}
                style={{
                  padding: "0.65rem 1.2rem",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "0.9rem"
                }}
              >
                Lodge Another Case
              </button>
            </div>
          </div>
        ) : (
          /* FORM STATE */
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              padding: "2.25rem",
              boxShadow: "var(--shadow-sm)"
            }}
          >
            <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "1.25rem", marginBottom: "1.75rem" }}>
              <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.85rem", color: primaryColor, marginBottom: "0.4rem" }}>
                Submit a Formal Dispute
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Provide precise details regarding your issue. Every ticket is subject to verified audit timelines.
              </p>
            </div>

            {error && (
              <div
                style={{
                  padding: "0.85rem 1rem",
                  background: "var(--brick-light)",
                  border: "1px solid var(--brick)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--brick)",
                  fontSize: "0.88rem",
                  marginBottom: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
              >
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Staff Member Session Warning */}
            {isAuthenticated && currentRole !== "customer" && (
              <div
                style={{
                  padding: "1.25rem",
                  background: "var(--amber-light)",
                  border: "1px solid var(--amber)",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: "1.75rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--amber)", fontWeight: 700, fontSize: "0.92rem" }}>
                  <AlertTriangle size={18} />
                  <span>Staff Account Active ({user?.name} &bull; {currentRole?.toUpperCase()})</span>
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-body)", margin: 0, lineHeight: 1.5 }}>
                  Internal staff members cannot lodge customer complaints. Please switch to your customer account, or open the Staff Portal to triage tickets.
                </p>
                <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => navigate(user?.company?.slug ? `/portal/${user.company.slug}` : "/admin")}
                    style={{
                      padding: "0.45rem 0.9rem",
                      background: "var(--primary)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Go to Staff Portal &rarr;
                  </button>
                  <button
                    type="button"
                    onClick={logoutUser}
                    style={{
                      padding: "0.45rem 0.9rem",
                      background: "transparent",
                      color: "var(--text-main)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Sign Out & Use Customer Account
                  </button>
                </div>
              </div>
            )}

            {/* Unauthenticated notice with Direct Google Sign-In */}
            {!isAuthenticated && (
              <div
                style={{
                  padding: "1.25rem",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "1.75rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: "0.85rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-main)", marginBottom: "0.25rem" }}>
                    Sign In to Lodge Grievance
                  </div>
                  <div style={{ fontSize: "0.84rem", color: "var(--text-muted)", maxWidth: "460px" }}>
                    Your complaint will be bound to your verified customer account so you can track SLA deadlines and updates in real time.
                  </div>
                </div>

                {/* Direct Google Button on Banner */}
                <GoogleSignInButton
                  companySlug={slug}
                  portalType="customer"
                  onSuccess={handleAuthSuccess}
                  onError={handleAuthError}
                  width={280}
                />

                <button
                  type="button"
                  onClick={() => setShowLoginModal(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--primary)",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0,
                  }}
                >
                  Or sign in with email address
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.35rem" }}>
              {/* Complainant Identity Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                    <User size={13} style={{ color: accentColor }} /> Complainant Name
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user?.name || ""}
                    placeholder="Sign in above to verify identity"
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-main)",
                      fontSize: "0.9rem"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                    <Mail size={13} style={{ color: accentColor }} /> Registered Email
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user?.email || ""}
                    placeholder="Sign in above to verify registered email"
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-main)",
                      fontSize: "0.9rem"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                    <Phone size={13} style={{ color: accentColor }} /> Contact Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-main)",
                      fontSize: "0.9rem"
                    }}
                  />
                </div>
              </div>

              {/* Classification & Incident Date Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                    <Tag size={13} style={{ color: accentColor }} /> Department / Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-main)",
                      fontSize: "0.9rem",
                      outline: "none"
                    }}
                  >
                    {categories.map((c) => (
                      <option key={c._id || c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    {categories.length === 0 && <option value="General Support">General Support</option>}
                  </select>
                </div>

                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                    <Clock size={13} style={{ color: accentColor }} /> Severity Level *
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-main)",
                      fontSize: "0.9rem",
                      outline: "none"
                    }}
                  >
                    <option value="Low">Low — Non-urgent query (48hr SLA)</option>
                    <option value="Medium">Medium — Standard grievance (24hr SLA)</option>
                    <option value="High">High — Operations affected (12hr SLA)</option>
                    <option value="Critical">Critical — Severe disruption (4hr SLA)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                    <Calendar size={13} style={{ color: accentColor }} /> Date of Incident (Optional)
                  </label>
                  <input
                    type="date"
                    max={new Date().toISOString().split("T")[0]}
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.58rem 0.85rem",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-main)",
                      fontSize: "0.9rem"
                    }}
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                  <FileText size={13} style={{ color: accentColor }} /> Subject Line *
                </label>
                <input
                  type="text"
                  placeholder="Concise summary of the grievance (at least 3 characters)..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.85rem",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-main)",
                    fontSize: "0.95rem"
                  }}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                  <FileText size={13} style={{ color: accentColor }} /> Detailed Grievance Description *
                </label>
                <textarea
                  rows={6}
                  placeholder="Please state what occurred, any transaction IDs, expected vs actual outcomes, and steps already attempted (at least 10 characters)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.75rem 0.85rem",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-main)",
                    fontSize: "0.92rem",
                    lineHeight: 1.6,
                    resize: "vertical"
                  }}
                  required
                />
              </div>

              {/* Submission Button */}
              <div style={{ paddingTop: "1rem", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <Link
                  to={`/s/${slug}`}
                  style={{
                    padding: "0.65rem 1.25rem",
                    background: "transparent",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-muted)",
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: "0.88rem"
                  }}
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.65rem 1.6rem",
                    background: primaryColor,
                    color: "#fff",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.7 : 1,
                    boxShadow: `0 2px 8px ${primaryColor}30`
                  }}
                >
                  <Send size={15} />
                  {submitting ? "Lodging Complaint..." : "Submit Grievance"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

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
              maxWidth: "420px",
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
                Sign In to File Complaint
              </h3>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              Sign in with your verified Google account so your grievance is tied to your customer profile:
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

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1rem 0" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--border-color)" }} />
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                Or Sign In with Email
              </span>
              <div style={{ flex: 1, height: "1px", background: "var(--border-color)" }} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const emailInput = e.target.elements.email.value;
                const nameInput = e.target.elements.name.value;
                if (!emailInput) return;
                handleEmailLogin(emailInput, nameInput);
              }}
              style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.25rem" }}
            >
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                  Your Full Name
                </label>
                <input
                  name="name"
                  type="text"
                  placeholder="e.g. John Doe"
                  required
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-main)",
                    fontSize: "0.9rem"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                  Email Address *
                </label>
                <input
                  name="email"
                  type="email"
                  placeholder="customer@example.com"
                  required
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-main)",
                    fontSize: "0.9rem"
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: "0.65rem",
                    background: "var(--primary)",
                    color: "var(--bg-card)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "0.88rem"
                  }}
                >
                  Verify & Proceed
                </button>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  style={{
                    padding: "0.65rem 1.25rem",
                    background: "transparent",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-muted)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "0.88rem"
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* First-Time Customer Password Setup Modal */}
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
