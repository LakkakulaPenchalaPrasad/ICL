import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
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
  Send
} from "lucide-react";

export const ComplaintForm = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, currentRole, apiFetch, loginWithGoogle } = useAuth();

  const [company, setCompany] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [phone, setPhone] = useState("");
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

  useEffect(() => {
    fetchCompanyData();
  }, [slug]);

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/companies/${slug}/public`);
      if (res.ok) {
        const data = await res.json();
        setCompany(data.company);
        setCategories(data.categories || []);
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

  const handleDemoLogin = async (demoEmail, demoName) => {
    const cred = `demo_customer:${demoEmail}`;
    const result = await loginWithGoogle(cred, slug);
    if (result.success) {
      setShowLoginModal(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    if (!subject.trim() || !description.trim()) {
      setError("Please provide a subject line and detailed explanation.");
      return;
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

          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
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
              Your complaint has been logged in the tenant ledger. An incident response specialist has been allocated according to SLA criteria.
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
                  background: "var(--primary)",
                  color: "var(--bg-card)",
                  borderRadius: "var(--radius-sm)",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "0.9rem"
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
              <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.85rem", color: "var(--text-main)", marginBottom: "0.4rem" }}>
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

            {/* Unauthenticated notice */}
            {!isAuthenticated && (
              <div
                style={{
                  padding: "1rem 1.25rem",
                  background: "var(--amber-light)",
                  border: "1px solid var(--amber)",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: "1.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem"
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--amber)" }}>
                    Authentication Required
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-body)" }}>
                    You must sign in as a customer so this complaint is bound to your profile.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(true)}
                  style={{
                    padding: "0.45rem 1rem",
                    background: "var(--primary)",
                    color: "var(--bg-card)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}
                >
                  Sign In with Google
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.35rem" }}>
              {/* Complainant Identity Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                    Complainant Name
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user?.name || "Guest (Please Sign In)"}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-dim)",
                      fontSize: "0.9rem"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                    Registered Email
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || "No email detected"}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-dim)",
                      fontSize: "0.9rem"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                    Phone Number (Optional)
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

              {/* Classification Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                    Department / Category *
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
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                    Severity Level *
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
              </div>

              {/* Subject */}
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                  Subject Line *
                </label>
                <input
                  type="text"
                  placeholder="Concise summary of the grievance..."
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
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                  Detailed Description *
                </label>
                <textarea
                  rows={6}
                  placeholder="Please state what occurred, any transaction IDs, expected vs actual outcomes, and steps already attempted..."
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
                    background: "var(--primary)",
                    color: "var(--bg-card)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.7 : 1
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
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              To ensure compliance and audit integrity, please sign in with your verified name and email address:
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const emailInput = e.target.elements.email.value;
                const nameInput = e.target.elements.name.value;
                if (!emailInput) return;
                const cred = `demo_customer:${emailInput.trim().toLowerCase()}`;
                const res = await loginWithGoogle(cred, slug);
                if (res.success) setShowLoginModal(false);
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
    </div>
  );
};
