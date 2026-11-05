import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { GoogleSignInButton } from "../../components/common/GoogleSignInButton";
import { SetPasswordModal } from "../../components/common/SetPasswordModal";
import {
  Inbox,
  ArrowLeft,
  Search,
  MessageSquare,
  Star,
  Send,
  AlertCircle,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldCheck,
  ArrowRight
} from "lucide-react";

export const MyComplaints = () => {
  const { slug } = useParams();
  const { user, isAuthenticated, currentRole, apiFetch, loginWithGoogle } = useAuth();

  const [company, setCompany] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Selected Ticket
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedTicketId, setExpandedTicketId] = useState(null);

  // Message reply state
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // CSAT rating state
  const [csatRating, setCsatRating] = useState(5);
  const [csatFeedback, setCsatFeedback] = useState("");
  const [submittingCsat, setSubmittingCsat] = useState(false);

  // Demo sign in modal for guest visitors
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [authModalError, setAuthModalError] = useState("");
  const [isStaffError, setIsStaffError] = useState(false);
  const [staffPortalLink, setStaffPortalLink] = useState("");

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

  const handleDemoLogin = async (demoEmail) => {
    setAuthModalError("");
    setIsStaffError(false);
    const cred = `demo_customer:${demoEmail.trim().toLowerCase()}`;
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

  useEffect(() => {
    fetchCompanyData();
    if (isAuthenticated) {
      fetchMyTickets();
    } else {
      setLoading(false);
    }
  }, [slug, isAuthenticated]);

  const fetchCompanyData = async () => {
    try {
      const res = await fetch(`/api/companies/${slug}/public`);
      if (res.ok) {
        const data = await res.json();
        setCompany(data.company);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const branding = company?.branding || {};
  const primaryColor = branding.primaryColor || "var(--primary)";
  const accentColor = branding.accentColor || "var(--bronze)";

  const fetchMyTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/api/companies/${slug}/tickets/mine`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to retrieve case history.");
      }
      const data = await res.json();
      setTickets(data);
      if (data.length > 0 && !expandedTicketId) {
        setExpandedTicketId(data[0].ticketId);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (ticketId) => {
    if (!replyText.trim()) return;

    try {
      setSendingReply(true);
      const res = await apiFetch(`/api/companies/${slug}/tickets/${ticketId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          text: replyText.trim(),
          isInternal: false,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send message.");
      }

      const newMsg = await res.json();
      // Update local state
      setTickets((prev) =>
        prev.map((t) =>
          t.ticketId === ticketId
            ? { ...t, messages: [...(t.messages || []), newMsg] }
            : t
        )
      );
      setReplyText("");
    } catch (err) {
      alert(err.message);
    } finally {
      setSendingReply(false);
    }
  };

  const handleSubmitCsat = async (ticketId) => {
    try {
      setSubmittingCsat(true);
      const res = await apiFetch(`/api/companies/${slug}/tickets/${ticketId}/csat`, {
        method: "POST",
        body: JSON.stringify({
          rating: csatRating,
          feedback: csatFeedback.trim(),
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to submit CSAT rating.");
      }

      const updated = await res.json();
      setTickets((prev) =>
        prev.map((t) => (t.ticketId === ticketId ? { ...t, csat: updated.csat } : t))
      );
      setCsatFeedback("");
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingCsat(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      Open: { bg: "var(--taupe-light)", color: "var(--taupe)", border: "rgba(105, 98, 88, 0.3)" },
      "In Progress": { bg: "var(--amber-light)", color: "var(--amber)", border: "rgba(142, 98, 35, 0.3)" },
      Escalated: { bg: "var(--brick-light)", color: "var(--brick)", border: "rgba(140, 56, 56, 0.3)" },
      Resolved: { bg: "var(--sage-light)", color: "var(--sage)", border: "rgba(68, 100, 80, 0.3)" },
      Closed: { bg: "var(--bg-surface)", color: "var(--text-muted)", border: "var(--border-color)" },
    };
    const s = map[status] || map["Open"];
    return (
      <span
        style={{
          display: "inline-block",
          padding: "0.2rem 0.55rem",
          borderRadius: "var(--radius-sm)",
          backgroundColor: s.bg,
          color: s.color,
          border: `1px solid ${s.border}`,
          fontWeight: 700,
          fontSize: "0.72rem",
          textTransform: "uppercase",
          letterSpacing: "0.06em"
        }}
      >
        {status}
      </span>
    );
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.ticketId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || t.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

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
            maxWidth: "1100px",
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
              Back to Service Desk
            </Link>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link
              to={`/s/${slug}/complaint`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 0.95rem",
                background: primaryColor,
                color: "#fff",
                borderRadius: "var(--radius-sm)",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "0.85rem",
                boxShadow: `0 2px 6px ${primaryColor}30`
              }}
            >
              + File New Dispute
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main style={{ maxWidth: "1100px", margin: "2rem auto 4rem", padding: "0 1.5rem" }}>
        {/* Unauthenticated State */}
        {!isAuthenticated ? (
          <div
            style={{
              padding: "3.5rem 2rem",
              textAlign: "center",
              background: "var(--bg-card)",
              border: "1px solid var(--border-dark)",
              borderRadius: "var(--radius-lg)",
              maxWidth: "520px",
              margin: "3rem auto"
            }}
          >
            <ShieldCheck size={44} style={{ color: "var(--primary)", margin: "0 auto 1rem" }} />
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.7rem", color: "var(--text-main)", marginBottom: "0.5rem" }}>
              Sign In to View Complaints
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.75rem" }}>
              You must authenticate with your customer credentials to review disputes filed under your profile.
            </p>
            <button
              onClick={() => setShowLoginModal(true)}
              style={{
                padding: "0.65rem 1.6rem",
                background: primaryColor,
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-sm)",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                boxShadow: `0 2px 8px ${primaryColor}30`
              }}
            >
              Customer Sign In
            </button>
          </div>
        ) : (
          <div>
            {/* Header info */}
            <div style={{ marginBottom: "1.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
                <Inbox size={22} style={{ color: accentColor }} />
                <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.9rem", color: primaryColor }}>
                  My Case Dossiers
                </h1>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Logged in as <strong>{user?.name}</strong> ({user?.email}) • Viewing tickets for this tenant.
              </p>
            </div>

            {/* Filters */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                marginBottom: "1.5rem",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              {/* Search */}
              <div style={{ position: "relative", minWidth: "260px", flex: 1, maxWidth: "420px" }}>
                <Search
                  size={16}
                  style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: accentColor }}
                />
                <input
                  type="text"
                  placeholder="Filter by subject or ticket reference..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.85rem 0.55rem 2.4rem",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-card)",
                    color: "var(--text-main)",
                    fontSize: "0.88rem"
                  }}
                />
              </div>

              {/* Status Tabs */}
              <div style={{ display: "flex", gap: "0.4rem" }}>
                {["all", "Open", "In Progress", "Resolved", "Closed"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    style={{
                      padding: "0.4rem 0.8rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-color)",
                      background: statusFilter === st ? primaryColor : "var(--bg-card)",
                      color: statusFilter === st ? "#fff" : "var(--text-body)",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      boxShadow: statusFilter === st ? `0 2px 6px ${primaryColor}25` : "none"
                    }}
                  >
                    {st === "all" ? "All" : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Ticket List */}
            {loading ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
                Loading your complaints...
              </div>
            ) : filteredTickets.length === 0 ? (
              <div
                style={{
                  padding: "3.5rem 2rem",
                  textAlign: "center",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)"
                }}
              >
                <FileText size={36} style={{ color: "var(--text-dim)", margin: "0 auto 0.75rem" }} />
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem", color: "var(--text-main)", marginBottom: "0.35rem" }}>
                  No Active Complaints Found
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "1.25rem" }}>
                  You have not registered any disputes under this organization or no tickets matched your filter.
                </p>
                <Link
                  to={`/s/${slug}/complaint`}
                  style={{
                    display: "inline-block",
                    padding: "0.55rem 1.25rem",
                    background: "var(--primary)",
                    color: "var(--bg-card)",
                    borderRadius: "var(--radius-sm)",
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: "0.85rem"
                  }}
                >
                  File a Dispute Now
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {filteredTickets.map((ticket) => {
                  const isExpanded = expandedTicketId === ticket.ticketId;
                  const isResolvedOrClosed = ["Resolved", "Closed"].includes(ticket.status);

                  return (
                    <div
                      key={ticket.ticketId}
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "var(--radius-md)",
                        overflow: "hidden",
                        boxShadow: "var(--shadow-xs)"
                      }}
                    >
                      {/* Ticket Row Bar */}
                      <div
                        onClick={() => setExpandedTicketId(isExpanded ? null : ticket.ticketId)}
                        style={{
                          padding: "1.1rem 1.35rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                          gap: "1rem"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1 }}>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontWeight: 700,
                              fontSize: "0.95rem",
                              color: "var(--text-main)"
                            }}
                          >
                            {ticket.ticketId}
                          </span>
                          {getStatusBadge(ticket.status)}
                          <div style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-main)" }}>
                            {ticket.subject}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </div>
                          {isExpanded ? (
                            <ChevronUp size={18} style={{ color: "var(--text-dim)" }} />
                          ) : (
                            <ChevronDown size={18} style={{ color: "var(--text-dim)" }} />
                          )}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div
                          style={{
                            padding: "1.35rem",
                            borderTop: "1px solid var(--border-color)",
                            backgroundColor: "var(--bg-surface)"
                          }}
                        >
                          {/* Description */}
                          <div style={{ marginBottom: "1.5rem" }}>
                            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                              Case Description
                            </div>
                            <p style={{ fontSize: "0.92rem", lineHeight: 1.6, color: "var(--text-body)" }}>
                              {ticket.description}
                            </p>
                          </div>

                          {/* Communication Log / Messages */}
                          <div style={{ marginBottom: "1.75rem" }}>
                            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "0.6rem" }}>
                              Correspondence Thread ({ticket.messages?.length || 0})
                            </div>

                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.75rem",
                                maxHeight: "280px",
                                overflowY: "auto",
                                padding: "0.5rem 0",
                                marginBottom: "0.75rem"
                              }}
                            >
                              {ticket.messages && ticket.messages.length > 0 ? (
                                ticket.messages.map((m, mIdx) => {
                                  const isCustomer = m.senderRole === "customer";
                                  return (
                                    <div
                                      key={m._id || mIdx}
                                      style={{
                                        alignSelf: isCustomer ? "flex-end" : "flex-start",
                                        maxWidth: "80%",
                                        padding: "0.75rem 1rem",
                                        borderRadius: "var(--radius-sm)",
                                        background: isCustomer ? primaryColor : "var(--bg-card)",
                                        color: isCustomer ? "#fff" : "var(--text-body)",
                                        border: isCustomer ? "none" : "1px solid var(--border-color)",
                                        boxShadow: "var(--shadow-xs)"
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontSize: "0.72rem",
                                          fontWeight: 700,
                                          marginBottom: "0.2rem",
                                          color: isCustomer ? "rgba(255,255,255,0.85)" : "var(--text-muted)"
                                        }}
                                      >
                                        {m.senderName || (isCustomer ? "You" : "Support Officer")} •{" "}
                                        {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                      </div>
                                      <div style={{ fontSize: "0.88rem", lineHeight: 1.5 }}>
                                        {m.text}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <p style={{ fontSize: "0.85rem", color: "var(--text-dim)", fontStyle: "italic" }}>
                                  No direct messages yet. Representatives review incoming items periodically.
                                </p>
                              )}
                            </div>

                            {/* Reply Input Box */}
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <input
                                type="text"
                                placeholder="Write a response to the support agent..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSendMessage(ticket.ticketId);
                                }}
                                style={{
                                  flex: 1,
                                  padding: "0.6rem 0.85rem",
                                  border: "1px solid var(--border-color)",
                                  borderRadius: "var(--radius-sm)",
                                  background: "var(--bg-card)",
                                  color: "var(--text-main)",
                                  fontSize: "0.88rem"
                                }}
                              />
                              <button
                                onClick={() => handleSendMessage(ticket.ticketId)}
                                disabled={sendingReply || !replyText.trim()}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.4rem",
                                  padding: "0.6rem 1.1rem",
                                  background: primaryColor,
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "var(--radius-sm)",
                                  fontWeight: 600,
                                  fontSize: "0.85rem",
                                  cursor: replyText.trim() ? "pointer" : "default",
                                  opacity: replyText.trim() ? 1 : 0.6,
                                  boxShadow: `0 2px 6px ${primaryColor}25`
                                }}
                              >
                                <Send size={14} /> Send
                              </button>
                            </div>
                          </div>

                          {/* CSAT Rating Block (If Resolved or Closed) */}
                          {isResolvedOrClosed && (
                            <div
                              style={{
                                padding: "1.25rem",
                                background: "var(--bg-card)",
                                border: "1px solid var(--border-color)",
                                borderRadius: "var(--radius-sm)"
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                                <Star size={18} style={{ color: "var(--amber)" }} />
                                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-main)" }}>
                                  Resolution Quality Assessment (CSAT)
                                </span>
                              </div>

                              {ticket.csat?.rating ? (
                                <div style={{ fontSize: "0.88rem", color: "var(--text-body)" }}>
                                  Thank you! You rated this case{" "}
                                  <strong>{ticket.csat.rating} / 5 stars</strong>:
                                  {ticket.csat.feedback && (
                                    <div style={{ fontStyle: "italic", marginTop: "0.3rem", color: "var(--text-muted)" }}>
                                      "{ticket.csat.feedback}"
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                                    This ticket has been settled. Please rate the effectiveness and courteousness of your redressal:
                                  </p>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                                    {[1, 2, 3, 4, 5].map((num) => (
                                      <button
                                        key={num}
                                        type="button"
                                        onClick={() => setCsatRating(num)}
                                        style={{
                                          padding: "0.35rem 0.65rem",
                                          borderRadius: "var(--radius-sm)",
                                          border: csatRating === num ? `2px solid ${accentColor}` : "1px solid var(--border-color)",
                                          background: csatRating === num ? `${accentColor}18` : "var(--bg-surface)",
                                          color: csatRating === num ? accentColor : "var(--text-body)",
                                          fontWeight: 700,
                                          fontSize: "0.85rem",
                                          cursor: "pointer"
                                        }}
                                      >
                                        ★ {num}
                                      </button>
                                    ))}
                                  </div>
                                  <div style={{ display: "flex", gap: "0.5rem" }}>
                                    <input
                                      type="text"
                                      placeholder="Optional remarks on resolution..."
                                      value={csatFeedback}
                                      onChange={(e) => setCsatFeedback(e.target.value)}
                                      style={{
                                        flex: 1,
                                        padding: "0.5rem 0.75rem",
                                        background: "var(--bg-surface)",
                                        border: "1px solid var(--border-color)",
                                        borderRadius: "var(--radius-sm)",
                                        fontSize: "0.85rem",
                                        color: "var(--text-main)"
                                      }}
                                    />
                                    <button
                                      onClick={() => handleSubmitCsat(ticket.ticketId)}
                                      disabled={submittingCsat}
                                      style={{
                                        padding: "0.5rem 1rem",
                                        background: primaryColor,
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "var(--radius-sm)",
                                        fontWeight: 600,
                                        fontSize: "0.85rem",
                                        cursor: "pointer",
                                        boxShadow: `0 2px 6px ${primaryColor}25`
                                      }}
                                    >
                                      {submittingCsat ? "Saving..." : "Submit CSAT"}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
                Customer Verification
              </h3>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              Sign in with Google to view and track all active grievances lodged under your profile:
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
                        window.location.href = staffPortalLink;
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
                Or Demo / Manual Login
              </span>
              <div style={{ flex: 1, height: "1px", background: "var(--border-color)" }} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const emailInput = e.target.elements.email.value;
                if (!emailInput) return;
                handleDemoLogin(emailInput);
              }}
              style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.25rem" }}
            >
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                  Customer Email Address *
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
                  Retrieve Case History
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
          fetchMyTickets();
        }}
      />
    </div>
  );
};
