import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Search,
  Shield,
  Calendar,
  Tag,
  ChevronRight,
  AlertCircle
} from "lucide-react";

export const TrackTicket = () => {
  const { slug, ticketId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, currentRole } = useAuth();

  const [company, setCompany] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchCode, setSearchCode] = useState(ticketId || "");

  useEffect(() => {
    fetchCompanyData();
    if (ticketId) {
      fetchTrackData(ticketId);
    }
  }, [slug, ticketId]);

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

  const fetchTrackData = async (idToFetch) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/companies/${slug}/tickets/${encodeURIComponent(idToFetch)}/track`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Ticket not found or invalid identifier.");
      }
      const data = await res.json();
      setTicket(data);
    } catch (err) {
      setError(err.message);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchCode.trim()) {
      navigate(`/s/${slug}/track/${encodeURIComponent(searchCode.trim().toUpperCase())}`);
    }
  };

  // Helper for status badge styling
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
          padding: "0.25rem 0.65rem",
          borderRadius: "var(--radius-sm)",
          backgroundColor: s.bg,
          color: s.color,
          border: `1px solid ${s.border}`,
          fontWeight: 700,
          fontSize: "0.75rem",
          textTransform: "uppercase",
          letterSpacing: "0.06em"
        }}
      >
        {status}
      </span>
    );
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
              Back to Service Desk
            </Link>
          </div>

          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Public Tracking Protocol
          </div>
        </div>
      </header>

      {/* ─── Search Bar ─── */}
      <section style={{ maxWidth: "960px", margin: "2rem auto 0", padding: "0 1.5rem" }}>
        <form
          onSubmit={handleSearch}
          style={{
            display: "flex",
            gap: "0.6rem",
            background: "var(--bg-card)",
            padding: "0.6rem",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-xs)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", paddingLeft: "0.5rem", color: accentColor }}>
            <Search size={18} style={{ color: accentColor }} />
          </div>
          <input
            type="text"
            placeholder="Search ticket code (e.g. TNS-2026-0001)..."
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              color: "var(--text-main)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.95rem",
              outline: "none"
            }}
          />
          <button
            type="submit"
            style={{
              padding: "0.5rem 1.25rem",
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
            Inspect
          </button>
        </form>
      </section>

      {/* ─── Main Content ─── */}
      <main style={{ maxWidth: "960px", margin: "1.5rem auto 3rem", padding: "0 1.5rem" }}>
        {loading && (
          <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem" }}>
              Retrieving case records from organizational ledger...
            </p>
          </div>
        )}

        {error && !loading && (
          <div
            style={{
              padding: "3rem 2rem",
              textAlign: "center",
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)"
            }}
          >
            <AlertCircle size={40} style={{ color: "var(--brick)", margin: "0 auto 0.75rem" }} />
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem", color: "var(--text-main)", marginBottom: "0.5rem" }}>
              Case File Not Found
            </h3>
            <p style={{ color: "var(--text-muted)", maxWidth: "480px", margin: "0 auto 1.5rem", fontSize: "0.9rem" }}>
              No ticket matching <strong>{ticketId}</strong> was located for this tenant. Please verify the code or check with your representative.
            </p>
            <Link
              to={`/s/${slug}`}
              style={{
                display: "inline-block",
                padding: "0.5rem 1.2rem",
                background: primaryColor,
                color: "#fff",
                borderRadius: "var(--radius-sm)",
                textDecoration: "none",
                fontSize: "0.85rem",
                fontWeight: 600
              }}
            >
              Return to Help Desk
            </Link>
          </div>
        )}

        {ticket && !loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Header Card */}
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-dark)",
                borderRadius: "var(--radius-md)",
                padding: "1.75rem",
                boxShadow: "var(--shadow-sm)"
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.35rem" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        fontSize: "1.15rem",
                        color: primaryColor,
                        letterSpacing: "0.04em"
                      }}
                    >
                      {ticket.ticketId}
                    </span>
                    {getStatusBadge(ticket.status)}
                  </div>
                  <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", color: "var(--text-main)", lineHeight: 1.3 }}>
                    {ticket.subject}
                  </h1>
                </div>

                <div
                  style={{
                    padding: "0.75rem 1rem",
                    background: "var(--bg-surface)",
                    border: `1px solid ${accentColor}33`,
                    borderRadius: "var(--radius-sm)",
                    textAlign: "right"
                  }}
                >
                  <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.3rem" }}>
                    <Clock size={12} style={{ color: accentColor }} /> SLA Target
                  </div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-main)" }}>
                    {ticket.slaDeadline ? new Date(ticket.slaDeadline).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Standard"}
                  </div>
                </div>
              </div>

              {/* Meta Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "1rem",
                  paddingTop: "1.25rem",
                  borderTop: "1px solid var(--border-color)"
                }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Category
                  </div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-main)" }}>
                    {ticket.category || "General"}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Priority Grade
                  </div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-main)" }}>
                    {ticket.priority || "Medium"}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Filed On
                  </div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-main)" }}>
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Audit Timeline Card */}
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                padding: "1.75rem",
                boxShadow: "var(--shadow-sm)"
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "1.25rem",
                  color: "var(--text-main)",
                  marginBottom: "1.25rem",
                  borderBottom: "1px solid var(--border-color)",
                  paddingBottom: "0.6rem"
                }}
              >
                Case Audit Ledger & Timeline
              </h2>

              {(() => {
                const publicTimeline = (ticket.timeline || []).filter((event) => {
                  if (event.isInternal) return false;
                  const act = (event.action || "").toLowerCase();
                  const det = (event.details || "").toLowerCase();
                  if (
                    act.includes("specialist") ||
                    act.includes("triage") ||
                    act.includes("developer") ||
                    act.includes("redirect") ||
                    act.includes("internal") ||
                    act.includes("staff")
                  )
                    return false;
                  if (
                    det.includes("auto-routed") ||
                    det.includes("redirected") ||
                    det.includes("triage queue")
                  )
                    return false;
                  return true;
                });

                return publicTimeline.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {publicTimeline.map((event, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          gap: "1rem",
                          position: "relative",
                          paddingBottom: idx === publicTimeline.length - 1 ? 0 : "0.75rem",
                        }}
                      >
                        {/* Timeline indicator */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div
                            style={{
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              background: accentColor,
                              marginTop: "0.35rem",
                            }}
                          />
                          {idx !== publicTimeline.length - 1 && (
                            <div
                              style={{
                                width: "1px",
                                flex: 1,
                                background: "var(--border-color)",
                                marginTop: "0.35rem",
                              }}
                            />
                          )}
                        </div>

                        {/* Event Details */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-main)" }}>
                              {event.action}
                            </span>
                            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                              {event.timestamp ? new Date(event.timestamp).toLocaleString() : ""}
                            </span>
                          </div>
                          <p style={{ fontSize: "0.85rem", color: "var(--text-body)", marginBottom: "0.2rem" }}>
                            {event.details}
                          </p>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                            Logged by: Support Desk
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    No historical entries recorded for this case file yet.
                  </p>
                );
              })()}
            </div>

            {/* Note banner */}
            <div
              style={{
                padding: "1rem 1.25rem",
                background: "var(--bg-subtle)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.82rem",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem"
              }}
            >
              <div>
                Are you the authorized complainant for this ticket? Sign in to review internal correspondence or reply directly.
              </div>
              <Link
                to={`/s/${slug}/my-complaints`}
                style={{
                  color: "var(--primary)",
                  fontWeight: 600,
                  textDecoration: "none",
                  whiteSpace: "nowrap"
                }}
              >
                Go to My Complaints →
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
