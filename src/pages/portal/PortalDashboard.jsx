import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  TicketCheck,
  TrendingUp,
  Clock,
  AlertTriangle,
  Users,
  UserCheck,
  CheckCircle,
  ArrowRight,
  Inbox,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

export const PortalDashboard = () => {
  const { slug } = useParams();
  const { apiFetch, user, currentRole } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await apiFetch(`/api/companies/${slug}/dashboard`);
        if (res.ok) setData(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [slug, apiFetch]);

  if (loading) return <div className="loading-spinner">Loading portal dashboard...</div>;
  if (!data) return <div className="error-message">Failed to load portal dashboard.</div>;

  const isEmployee = currentRole === "employee";
  const isDeveloper = currentRole === "developer" || currentRole === "superadmin";
  const myMetrics = data.myMetrics;
  const devMetrics = data.developerMetrics;

  return (
    <div className="dashboard-page">
      {/* ─── Role-Aware Welcome Header ─── */}
      <div className="page-header" style={{ marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span className="page-label">
                {isEmployee ? "EMPLOYEE RESOLUTION DESK" : "OPERATIONS & SLA OVERSIGHT"}
              </span>
              {isEmployee && user?.department && (
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    padding: "0.2rem 0.55rem",
                    borderRadius: "999px",
                    background: "rgba(140, 106, 70, 0.15)",
                    color: "var(--accent-hover)",
                    border: "1px solid rgba(140, 106, 70, 0.3)",
                  }}
                >
                  {user.department} Specialist
                </span>
              )}
            </div>
            <h1>
              {isEmployee ? `Welcome back, ${user?.name || "Agent"}` : "Company Dashboard"}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", marginTop: "0.25rem" }}>
              {isEmployee
                ? "Here is your active workload, personal department queue, and dispute redressal progress."
                : "Real-time metrics on dispute intake, team load balancing, and SLA compliance."}
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {isEmployee && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate(`/portal/${slug}/tickets?assignee=me`)}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
              >
                <UserCheck size={14} /> My Assigned Tickets
              </button>
            )}
            <button
              className="btn btn-outline btn-sm"
              onClick={() => navigate(`/portal/${slug}/tickets`)}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
            >
              <TicketCheck size={14} /> All Company Tickets ({data.total})
            </button>
          </div>
        </div>
      </div>

      {/* ─── Developer Notice: Unassigned Triage Queue Alert ─── */}
      {isDeveloper && devMetrics?.unassignedCount > 0 && (
        <div
          style={{
            padding: "1rem 1.25rem",
            marginBottom: "1.75rem",
            borderRadius: "var(--radius-sm)",
            background: "rgba(184, 115, 51, 0.08)",
            border: "1px solid rgba(184, 115, 51, 0.35)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "rgba(184, 115, 51, 0.2)",
                color: "#b87333",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertTriangle size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text-main)" }}>
                {devMetrics.unassignedCount} Grievance{devMetrics.unassignedCount > 1 ? "s" : ""} in Developer Triage Queue
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Complaints where no matching department employee was found. You can solve directly or redirect to any employee.
              </div>
            </div>
          </div>
          <button
            className="btn btn-sm"
            onClick={() => navigate(`/portal/${slug}/tickets?assignee=unassigned`)}
            style={{
              background: "#b87333",
              color: "#fff",
              border: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontWeight: 600,
              fontSize: "0.82rem",
            }}
          >
            Triage & Reassign <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* ─── EMPLOYEE PERSONAL WORKSPACE METRICS ─── */}
      {isEmployee && myMetrics && (
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
              YOUR PERSONAL DESK STATS
            </span>
          </div>

          <div className="stat-grid">
            <div
              className="stat-card clickable-card"
              onClick={() => navigate(`/portal/${slug}/tickets?assignee=me`)}
              style={{ cursor: "pointer", transition: "transform 0.15s ease" }}
            >
              <div className="stat-header">
                <span className="stat-label">ASSIGNED TO ME</span>
                <UserCheck size={18} style={{ color: "var(--accent-hover)" }} />
              </div>
              <div className="stat-value">{myMetrics.assignedTotal}</div>
              <div className="stat-footer" style={{ color: "var(--accent-hover)" }}>
                Click to inspect your ledger
              </div>
            </div>

            <div
              className="stat-card clickable-card"
              onClick={() => navigate(`/portal/${slug}/tickets?assignee=me&status=In+Progress`)}
              style={{ cursor: "pointer" }}
            >
              <div className="stat-header">
                <span className="stat-label">ACTIVE CASES</span>
                <Clock size={18} style={{ color: "var(--gold)" }} />
              </div>
              <div className="stat-value">{myMetrics.myActiveCount}</div>
              <div className="stat-footer">In Progress or Open</div>
            </div>

            <div
              className="stat-card clickable-card"
              onClick={() => navigate(`/portal/${slug}/tickets?assignee=me&status=Resolved`)}
              style={{ cursor: "pointer" }}
            >
              <div className="stat-header">
                <span className="stat-label">MY RESOLVED CASES</span>
                <CheckCircle size={18} style={{ color: "var(--sage)" }} />
              </div>
              <div className="stat-value">{myMetrics.myResolvedCount}</div>
              <div className="stat-footer">Closed / Solved by you</div>
            </div>

            <div
              className="stat-card clickable-card"
              onClick={() => navigate(`/portal/${slug}/tickets?scope=my-dept`)}
              style={{ cursor: "pointer" }}
            >
              <div className="stat-header">
                <span className="stat-label">{user?.department ? user.department.toUpperCase() : "DEPARTMENT"} QUEUE</span>
                <Layers size={18} style={{ color: "var(--slate)" }} />
              </div>
              <div className="stat-value">{myMetrics.departmentQueueCount}</div>
              <div className="stat-footer">Open in your department</div>
            </div>
          </div>
        </div>
      )}

      {/* ─── COMPANY OVERALL PERFORMANCE OVERVIEW ─── */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          COMPANY SLA & VOLUME SNAPSHOT
        </span>
      </div>

      <div className="stat-grid" style={{ marginBottom: "2rem" }}>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">TOTAL TICKETS</span>
            <TicketCheck size={18} />
          </div>
          <div className="stat-value">{data.total}</div>
          <div className="stat-footer">Across all departments</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">RESOLUTION RATE</span>
            <TrendingUp size={18} />
          </div>
          <div className="stat-value">{data.resolutionRate}%</div>
          <div className="stat-footer">Target: &gt; 85%</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">SLA COMPLIANCE</span>
            <Clock size={18} />
          </div>
          <div className="stat-value">{data.slaCompliance}%</div>
          <div className="stat-footer">{data.slaBreached} breached target</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">AVG CSAT</span>
            <TrendingUp size={18} />
          </div>
          <div className="stat-value">{data.avgCsat}</div>
          <div className="stat-footer">Customer rating out of 5.0</div>
        </div>
      </div>

      {/* ─── ACTIONABLE CASES TABLE FOR EMPLOYEE ─── */}
      {isEmployee && myMetrics?.recentAssigned && myMetrics.recentAssigned.length > 0 && (
        <div className="dashboard-section" style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h2 className="section-title" style={{ margin: 0 }}>
              <UserCheck size={16} /> MY ACTIVE ASSIGNED CASES ({myMetrics.recentAssigned.length})
            </h2>
            <Link
              to={`/portal/${slug}/tickets?assignee=me`}
              style={{ fontSize: "0.82rem", color: "var(--accent-hover)", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
            >
              View all my cases <ArrowRight size={13} />
            </Link>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Customer</th>
                  <th>Subject</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {myMetrics.recentAssigned.map((t) => (
                  <tr key={t.ticketId} className="clickable-row" onClick={() => navigate(`/portal/${slug}/tickets/${t.ticketId}`)}>
                    <td>
                      <code className="ticket-id">{t.ticketId}</code>
                    </td>
                    <td className="font-medium">{t.customer?.name}</td>
                    <td>{t.subject}</td>
                    <td>
                      <span className={`badge priority-${t.priority.toLowerCase()}`}>{t.priority}</span>
                    </td>
                    <td>
                      <span className={`badge status-${t.status.toLowerCase().replace(/\s+/g, "-")}`}>{t.status}</span>
                    </td>
                    <td>
                      <button
                        className="btn-sm btn-outline"
                        style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/portal/${slug}/tickets/${t.ticketId}`);
                        }}
                      >
                        Resolve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── DEVELOPER ACTION: UNASSIGNED CASES TABLE ─── */}
      {isDeveloper && devMetrics?.unassignedTickets && devMetrics.unassignedTickets.length > 0 && (
        <div className="dashboard-section" style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h2 className="section-title" style={{ margin: 0, color: "#b87333" }}>
              <AlertTriangle size={16} /> UNASSIGNED CASES REQUIRING TRIAGE ({devMetrics.unassignedTickets.length})
            </h2>
            <Link
              to={`/portal/${slug}/tickets?assignee=unassigned`}
              style={{ fontSize: "0.82rem", color: "#b87333", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
            >
              Inspect all unassigned <ArrowRight size={13} />
            </Link>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Customer</th>
                  <th>Category</th>
                  <th>Subject</th>
                  <th>Priority</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {devMetrics.unassignedTickets.map((t) => (
                  <tr key={t.ticketId} className="clickable-row" onClick={() => navigate(`/portal/${slug}/tickets/${t.ticketId}`)}>
                    <td>
                      <code className="ticket-id">{t.ticketId}</code>
                    </td>
                    <td className="font-medium">{t.customer?.name}</td>
                    <td>{t.category}</td>
                    <td>{t.subject}</td>
                    <td>
                      <span className={`badge priority-${t.priority.toLowerCase()}`}>{t.priority}</span>
                    </td>
                    <td>
                      <button
                        className="btn-sm btn-primary"
                        style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/portal/${slug}/tickets/${t.ticketId}`);
                        }}
                      >
                        Assign / Solve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Status Distribution ─── */}
      <div className="dashboard-section" style={{ marginBottom: "2rem" }}>
        <h2 className="section-title">STATUS DISTRIBUTION</h2>
        <div className="status-pills">
          {Object.entries(data.byStatus || {}).map(([status, count]) => (
            <div
              key={status}
              className={`status-pill status-${status.toLowerCase().replace(/\s+/g, "-")}`}
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/portal/${slug}/tickets?status=${encodeURIComponent(status)}`)}
              title={`Filter by ${status}`}
            >
              <span className="pill-count">{count}</span>
              <span className="pill-label">{status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Escalation Watchlist ─── */}
      {data.escalationWatch && data.escalationWatch.length > 0 && (
        <div className="dashboard-section">
          <h2 className="section-title">
            <AlertTriangle size={16} /> HIGH PRIORITY ESCALATION WATCH ({data.escalationWatch.length})
          </h2>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>SLA Window</th>
                </tr>
              </thead>
              <tbody>
                {data.escalationWatch.map((t) => (
                  <tr key={t.ticketId} className="clickable-row" onClick={() => navigate(`/portal/${slug}/tickets/${t.ticketId}`)}>
                    <td>
                      <code className="ticket-id">{t.ticketId}</code>
                    </td>
                    <td className="font-medium">{t.subject}</td>
                    <td>{t.category}</td>
                    <td>
                      <span className={`badge priority-${t.priority.toLowerCase()}`}>{t.priority}</span>
                    </td>
                    <td>
                      <span className={`badge status-${t.status.toLowerCase().replace(/\s+/g, "-")}`}>{t.status}</span>
                    </td>
                    <td>{t.slaHours}h target</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
