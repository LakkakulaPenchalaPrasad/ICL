import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Palette,
  Plus,
  X,
  Eye,
  EyeOff,
  Trash2,
  Save,
  ExternalLink,
  Sparkles,
  HelpCircle,
  Tag,
  CheckCircle,
  AlertCircle
} from "lucide-react";

const PRIMARY_PRESETS = [
  { name: "Obsidian", color: "#141312" },
  { name: "Slate Navy", color: "#1e293b" },
  { name: "Forest Pine", color: "#1b4332" },
  { name: "Deep Indigo", color: "#312e81" },
  { name: "Rich Wine", color: "#4a0e17" },
];

const ACCENT_PRESETS = [
  { name: "Warm Bronze", color: "#8c6a46" },
  { name: "Desert Amber", color: "#d97706" },
  { name: "Emerald", color: "#059669" },
  { name: "Sapphire", color: "#2563eb" },
  { name: "Coral", color: "#e11d48" },
];

export const ServicePageCustomizer = () => {
  const { slug } = useParams();
  const { apiFetch } = useAuth();
  const [company, setCompany] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Branding form
  const [branding, setBranding] = useState({
    primaryColor: "#25221f",
    accentColor: "#8c6a46",
    welcomeMessage: "",
    tagline: "",
  });
  const [companyName, setCompanyName] = useState("");
  const [savingBranding, setSavingBranding] = useState(false);

  // FAQ form
  const [showFaqForm, setShowFaqForm] = useState(false);
  const [faqForm, setFaqForm] = useState({ question: "", answer: "", category: "General" });
  const [addingFaq, setAddingFaq] = useState(false);

  // Category form
  const [showCatForm, setShowCatForm] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", description: "" });
  const [addingCat, setAddingCat] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchAll = async () => {
    try {
      const [compRes, faqRes, catRes] = await Promise.all([
        apiFetch(`/api/companies/${slug}/public`),
        apiFetch(`/api/companies/${slug}/faqs`),
        apiFetch(`/api/companies/${slug}/categories`),
      ]);
      if (compRes.ok) {
        const data = await compRes.json();
        setCompany(data.company);
        setCompanyName(data.company.name || "");
        setBranding({
          primaryColor: data.company.branding?.primaryColor || "#25221f",
          accentColor: data.company.branding?.accentColor || "#8c6a46",
          welcomeMessage: data.company.branding?.welcomeMessage || `Welcome to ${data.company.name || "Support"}`,
          tagline: data.company.branding?.tagline || "We are here to help resolve your inquiries quickly and fairly.",
        });
      }
      if (faqRes.ok) setFaqs(await faqRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch (err) {
      console.error("Customizer fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [slug]);

  const saveBranding = async () => {
    setError("");
    setSuccess("");
    setSavingBranding(true);
    try {
      const res = await apiFetch(`/api/companies/${slug}/branding`, {
        method: "PUT",
        body: JSON.stringify({
          name: companyName.trim(),
          branding,
        }),
      });
      if (res.ok) {
        setSuccess("Branding updated successfully! Live changes are now visible on your customer desk.");
        setTimeout(() => setSuccess(""), 4000);
        fetchAll();
      } else {
        const d = await res.json();
        setError(d.error || "Failed to update branding");
      }
    } catch (err) {
      setError("Network error updating branding");
    } finally {
      setSavingBranding(false);
    }
  };

  const addFaq = async (e) => {
    e.preventDefault();
    setAddingFaq(true);
    try {
      const res = await apiFetch(`/api/companies/${slug}/faqs`, {
        method: "POST",
        body: JSON.stringify(faqForm),
      });
      if (res.ok) {
        setShowFaqForm(false);
        setFaqForm({ question: "", answer: "", category: "General" });
        fetchAll();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingFaq(false);
    }
  };

  const deleteFaq = async (id) => {
    if (!confirm("Delete this FAQ article?")) return;
    await apiFetch(`/api/companies/${slug}/faqs/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const toggleFaqVisibility = async (faq) => {
    await apiFetch(`/api/companies/${slug}/faqs/${faq._id}`, {
      method: "PUT",
      body: JSON.stringify({ isVisible: !faq.isVisible }),
    });
    fetchAll();
  };

  const addCategory = async (e) => {
    e.preventDefault();
    setAddingCat(true);
    try {
      const res = await apiFetch(`/api/companies/${slug}/categories`, {
        method: "POST",
        body: JSON.stringify(catForm),
      });
      if (res.ok) {
        setShowCatForm(false);
        setCatForm({ name: "", description: "" });
        fetchAll();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingCat(false);
    }
  };

  const deleteCategory = async (id) => {
    if (!confirm("Delete this complaint category?")) return;
    await apiFetch(`/api/companies/${slug}/categories/${id}`, { method: "DELETE" });
    fetchAll();
  };

  if (loading) return <div className="loading-spinner">Loading customizer studio...</div>;

  const initials = (companyName || company?.name || "Company")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="customizer-page">
      {/* Page Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <span className="page-label">BRANDING & SERVICE PAGE CONFIGURATION</span>
          <h1 style={{ margin: "0.2rem 0" }}>Customize Service Page</h1>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.95rem" }}>
            Design your company's customer-facing portal, adjust brand colors, and manage FAQs.
          </p>
        </div>
        <a
          href={`/s/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-outline btn-sm"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", textDecoration: "none" }}
        >
          <ExternalLink size={14} /> Preview Live Service Page
        </a>
      </div>

      {error && (
        <div className="form-error" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="form-success" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {/* ─── Branding Block: 2-Column Responsive Studio ─── */}
      <div className="customizer-section">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <Palette size={18} style={{ color: "var(--bronze)" }} />
          <h2 className="section-title" style={{ margin: 0 }}>
            BRAND IDENTITY & THEME STUDIO
          </h2>
        </div>

        <div className="branding-studio-grid">
          {/* Left Column: Form Controls */}
          <div className="card" style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h3 style={{ fontSize: "1.1rem", margin: 0, color: "var(--text-main)", fontWeight: 600 }}>
              Brand Details & Messaging
            </h3>

            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
                Company Display Name
              </label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., TechNova Solutions"
                style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-main)" }}
              />
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
                Customer Welcome Heading
              </label>
              <input
                value={branding.welcomeMessage || ""}
                onChange={(e) => setBranding({ ...branding, welcomeMessage: e.target.value })}
                placeholder="e.g., Welcome to TechNova Support"
                style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-main)" }}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem", display: "block" }}>
                Displayed as the hero headline on your public help page.
              </span>
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
                Portal Tagline & Subtitle
              </label>
              <textarea
                value={branding.tagline || ""}
                onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
                placeholder="e.g., Innovation meets resolution — we are here to help."
                rows={2}
                style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-main)" }}
              />
            </div>

            {/* Color Palette Controls */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1.25rem" }}>
              <h4 style={{ fontSize: "0.95rem", margin: "0 0 1rem 0", color: "var(--text-main)" }}>
                Color Palette
              </h4>

              {/* Primary Color */}
              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                  <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Primary Brand Color</label>
                  <code style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{branding.primaryColor}</code>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                  <input
                    type="color"
                    value={branding.primaryColor || "#25221f"}
                    onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                    style={{ width: "42px", height: "38px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", cursor: "pointer", background: "transparent" }}
                  />
                  <input
                    type="text"
                    value={branding.primaryColor || ""}
                    onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                    placeholder="#25221f"
                    style={{ flex: 1, padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-main)", fontSize: "0.88rem" }}
                  />
                </div>
                {/* Presets */}
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  {PRIMARY_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setBranding({ ...branding, primaryColor: p.color })}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        padding: "0.25rem 0.55rem",
                        borderRadius: "var(--radius-sm)",
                        border: branding.primaryColor === p.color ? "2px solid var(--text-main)" : "1px solid var(--border-color)",
                        background: "var(--bg-main)",
                        fontSize: "0.74rem",
                        cursor: "pointer",
                        color: "var(--text-main)"
                      }}
                    >
                      <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: p.color }} />
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                  <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Accent / Highlight Color</label>
                  <code style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{branding.accentColor}</code>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                  <input
                    type="color"
                    value={branding.accentColor || "#8c6a46"}
                    onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                    style={{ width: "42px", height: "38px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", cursor: "pointer", background: "transparent" }}
                  />
                  <input
                    type="text"
                    value={branding.accentColor || ""}
                    onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                    placeholder="#8c6a46"
                    style={{ flex: 1, padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-main)", fontSize: "0.88rem" }}
                  />
                </div>
                {/* Presets */}
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  {ACCENT_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setBranding({ ...branding, accentColor: p.color })}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        padding: "0.25rem 0.55rem",
                        borderRadius: "var(--radius-sm)",
                        border: branding.accentColor === p.color ? "2px solid var(--text-main)" : "1px solid var(--border-color)",
                        background: "var(--bg-main)",
                        fontSize: "0.74rem",
                        cursor: "pointer",
                        color: "var(--text-main)"
                      }}
                    >
                      <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: p.color }} />
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1.25rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={saveBranding}
                disabled={savingBranding}
                style={{ width: "100%", padding: "0.75rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}
              >
                <Save size={15} />
                {savingBranding ? "Saving Changes..." : "Save Branding Changes"}
              </button>
            </div>
          </div>

          {/* Right Column: Live Interactive Preview */}
          <div className="card" style={{ padding: "1.75rem", display: "flex", flexDirection: "column", background: "var(--bg-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, color: "var(--bronze)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Sparkles size={14} /> Live Customer Portal Preview
              </span>
              <span className="badge badge-primary" style={{ fontSize: "0.7rem", background: "var(--sage-light)", color: "var(--sage)" }}>
                Real-Time
              </span>
            </div>

            {/* Mock Service Page Browser Frame */}
            <div
              style={{
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-dark)",
                overflow: "hidden",
                background: "var(--bg-card)",
                boxShadow: "var(--shadow-sm)"
              }}
            >
              {/* Mock Browser Topbar */}
              <div
                style={{
                  padding: "0.6rem 0.85rem",
                  background: "var(--bg-surface)",
                  borderBottom: "1px solid var(--border-color)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: branding.accentColor || "#8c6a46",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.78rem",
                      fontWeight: 700
                    }}
                  >
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)", lineHeight: 1.1 }}>
                      {companyName || "Your Company"}
                    </div>
                    <div style={{ fontSize: "0.65rem", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                      Support Center
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", padding: "0.2rem 0.5rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}>
                  Sign In
                </div>
              </div>

              {/* Mock Hero Section */}
              <div
                style={{
                  padding: "2.25rem 1.25rem",
                  textAlign: "center",
                  background: `linear-gradient(180deg, var(--bg-card) 0%, var(--bg-main) 100%)`,
                  borderBottom: "1px solid var(--border-color)"
                }}
              >
                <div
                  style={{
                    display: "inline-block",
                    padding: "0.2rem 0.6rem",
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.65rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--text-muted)",
                    marginBottom: "0.75rem"
                  }}
                >
                  Resolution Desk
                </div>

                <h4
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "1.45rem",
                    color: branding.primaryColor || "var(--text-main)",
                    margin: "0 0 0.5rem 0",
                    fontWeight: 600,
                    lineHeight: 1.25
                  }}
                >
                  {branding.welcomeMessage || `Welcome to ${companyName || "Support"}`}
                </h4>

                <p
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-muted)",
                    margin: "0 auto",
                    maxWidth: "380px",
                    lineHeight: 1.5
                  }}
                >
                  {branding.tagline || "We are here to help resolve your inquiries quickly and fairly."}
                </p>
              </div>

              {/* Mock Quick Action Cards */}
              <div style={{ padding: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div style={{ padding: "0.75rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", background: "var(--bg-main)" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.2rem" }}>
                    File Complaint
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                    Submit ticket with SLA tracking
                  </div>
                </div>

                <div style={{ padding: "0.75rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", background: "var(--bg-main)" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.2rem" }}>
                    Track Ticket
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                    Inspect audit timeline
                  </div>
                </div>
              </div>
            </div>

            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "1rem", lineHeight: 1.45 }}>
              * Changes saved here dynamically update the customer portal at <code>/s/{slug}</code> and all associated grievance communications.
            </p>
          </div>
        </div>
      </div>

      {/* ─── FAQ Section ─── */}
      <div className="customizer-section" style={{ marginTop: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <HelpCircle size={18} style={{ color: "var(--bronze)" }} />
            <h2 className="section-title" style={{ margin: 0 }}>
              FREQUENTLY ASKED QUESTIONS ({faqs.length})
            </h2>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowFaqForm(!showFaqForm)}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            {showFaqForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add FAQ Article</>}
          </button>
        </div>

        {showFaqForm && (
          <form className="card" onSubmit={addFaq} style={{ padding: "1.75rem", marginBottom: "1.5rem", border: "1px solid var(--border-dark)" }}>
            <h3 style={{ margin: "0 0 1.25rem 0", fontSize: "1.1rem", color: "var(--text-main)" }}>
              Create New Knowledge Base FAQ
            </h3>
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
                Question *
              </label>
              <input
                value={faqForm.question}
                onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                required
                placeholder="e.g., How do I request a refund?"
                style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-main)" }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
                Detailed Answer *
              </label>
              <textarea
                value={faqForm.answer}
                onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                required
                rows={4}
                placeholder="Step-by-step guidance for customers..."
                style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-main)" }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: "1.25rem" }}>
              <label style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
                Category
              </label>
              <input
                value={faqForm.category}
                onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                placeholder="e.g., Billing, Account, Technical"
                style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-main)" }}
              />
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={addingFaq}>
                {addingFaq ? "Saving..." : "Publish FAQ"}
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowFaqForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {faqs.map((faq) => (
            <div
              key={faq._id}
              className="card"
              style={{
                padding: "1.35rem 1.6rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "1.5rem",
                opacity: faq.isVisible ? 1 : 0.65,
                background: faq.isVisible ? "var(--bg-card)" : "var(--bg-subtle)"
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.45rem", flexWrap: "wrap" }}>
                  <span className="badge badge-primary" style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem" }}>
                    {faq.category || "General"}
                  </span>
                  {!faq.isVisible && (
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                      (Hidden from public view)
                    </span>
                  )}
                </div>
                <h4 style={{ margin: "0 0 0.4rem 0", fontSize: "1.05rem", color: "var(--text-main)", fontWeight: 600 }}>
                  {faq.question}
                </h4>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
                  {faq.answer}
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => toggleFaqVisibility(faq)}
                  title={faq.isVisible ? "Hide FAQ from public" : "Make FAQ visible"}
                >
                  {faq.isVisible ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => deleteFaq(faq._id)}
                  title="Delete FAQ"
                  style={{ color: "var(--brick)" }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}

          {faqs.length === 0 && (
            <div className="card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
              No FAQ articles published yet. Click "+ Add FAQ Article" above to create common self-serve answers for customers.
            </div>
          )}
        </div>
      </div>

      {/* ─── Complaint Categories Section ─── */}
      <div className="customizer-section" style={{ marginTop: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Tag size={18} style={{ color: "var(--bronze)" }} />
            <h2 className="section-title" style={{ margin: 0 }}>
              GRIEVANCE CATEGORIES ({categories.length})
            </h2>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowCatForm(!showCatForm)}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            {showCatForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add Category</>}
          </button>
        </div>

        {showCatForm && (
          <form className="card" onSubmit={addCategory} style={{ padding: "1.75rem", marginBottom: "1.5rem", border: "1px solid var(--border-dark)" }}>
            <h3 style={{ margin: "0 0 1.25rem 0", fontSize: "1.1rem", color: "var(--text-main)" }}>
              Create Complaint Category
            </h3>
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
                  Category Name *
                </label>
                <input
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  required
                  placeholder="e.g., Billing & Invoices"
                  style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-main)" }}
                />
              </div>
              <div className="form-group" style={{ flex: 2 }}>
                <label style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
                  Description (Optional)
                </label>
                <input
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  placeholder="Brief guidance on what belongs here"
                  style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-main)" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={addingCat}>
                {addingCat ? "Saving..." : "Add Category"}
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowCatForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
          {categories.map((cat) => (
            <div
              key={cat._id}
              className="card"
              style={{
                padding: "1.25rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "0.75rem"
              }}
            >
              <div>
                <strong style={{ fontSize: "0.95rem", color: "var(--text-main)", display: "block", marginBottom: "0.25rem" }}>
                  {cat.name}
                </strong>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.4, display: "block" }}>
                  {cat.description || "General grievance category."}
                </span>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => deleteCategory(cat._id)}
                title="Remove Category"
                style={{ color: "var(--brick)", flexShrink: 0 }}
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="card" style={{ gridColumn: "1 / -1", padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
              No categories configured yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
