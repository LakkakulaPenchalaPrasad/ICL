import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Search,
  Filter,
  UserCheck,
  Layers,
  AlertTriangle,
  Clock,
  CheckCircle,
  Inbox,
  User,
  X,
} from "lucide-react";

export const TicketList = () => {
  const { slug } = useParams();
  const { apiFetch, user, currentRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter States initialized from URL search params
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get("priority") || "");
  const [scopeFilter, setScopeFilter] = useState(
    searchParams.get("assignee") === "me"
      ? "me"
      : searchParams.get("scope") === "my-dept"
      ? "my-dept"
      : searchParams.get("assignee") === "unassigned"
      ? "unassigned"
      : "all"
  );

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);

      if (scopeFilter === "me") {
        params.set("assignee", "me");
      } else if (scopeFilter === "unassigned") {
        params.set("assignee", "unassigned");
      } else if (scopeFilter === "my-dept") {
        params.set("scope", "my-dept");
      }

      const res = await apiFetch(`/api/companies/${slug}/tickets?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Keep URL in sync
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter) params.set("status", statusFilter);
    if (priorityFilter) params.set("priority", priorityFilter);
    if (scopeFilter === "me") params.set("assignee", "me");
    if (scopeFilter === "unassigned") params.set("assignee", "unassigned");
    if (scopeFilter === "my-dept") params.set("scope", "my-dept");
    setSearchParams(params, { replace: true });

    fetchTickets();
  }, [slug, statusFilter, priorityFilter, scopeFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTickets();
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPriorityFilter("");
    setScopeFilter("all");
  };

  const isEmployee = currentRole === "employee";
  const hasActiveFilters = Boolean(search || statusFilter || priorityFilter || scopeFilter !== "all");

  return (
    <div className="management-page">
      {/* ─── Header ─── */}
      <div className="page-header" style={{ marginBottom: "1.25rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
            <span className="page-label">DISPUTE REDRESSAL REGISTRY</span>
            {isEmployee && (
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "999px",
                  background: "rgba(140, 106, 70, 0.15)",
                  color: "var(--accent-hover)",
                }}
              >
                {user?.department || "Support"}
              </span>
            )}
          </div>
          <h1>Ticket Ledger ({total})</h1>
        </div>
      </div>

      {/* ─── Scope / Workload Filter Tabs ─── */}
      <div
        style={{
          display: "flex",
          gap: "0.4rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
          paddingBottom: "0.5rem",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <button
          type="button"
          className={`btn btn-sm ${scopeFilter === "all" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setScopeFilter("all")}
          style={{ fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
        >
          <Inbox size={14} /> All Company Tickets
        </button>

        {isEmployee && (
          <>
            <button
              type="button"
              className={`btn btn-sm ${scopeFilter === "me" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setScopeFilter("me")}
              style={{ fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
            >
              <UserCheck size={14} /> Assigned to Me
            </button>

            {user?.department && (
              <button
                type="button"
                className={`btn btn-sm ${scopeFilter === "my-dept" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setScopeFilter("my-dept")}
                style={{ fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
              >
                <Layers size={14} /> My Department Queue ({user.department})
              </button>
            )}
          </>
        )}

        <button
          type="button"
          className={`btn btn-sm ${scopeFilter === "unassigned" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setScopeFilter("unassigned")}
          style={{ fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
        >
          <AlertTriangle size={14} /> Unassigned Triage
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleClearFilters}
            style={{ fontSize: "0.78rem", marginLeft: "auto", color: "var(--text-muted)" }}
          >
            <X size={12} /> Clear all filters
          </button>
        )}
      </div>

      {/* ─── Search and Dropdown Filter Bar ─── */}
      <div className="filter-bar" style={{ marginBottom: "1.25rem" }}>
        <form onSubmit={handleSearch} className="search-form" style={{ flex: 2 }}>
          <Search size={16} />
          <input
            placeholder="Search by ticket ID, subject line, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ flex: 1, minWidth: "140px" }}>
          <option value="">All Statuses</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Escalated">Escalated</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </select>

        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={{ flex: 1, minWidth: "140px" }}>
          <option value="">All Priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
      </div>

      {/* ─── Tickets Table ─── */}
      {loading ? (
        <div className="loading-spinner">Loading tickets...</div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Customer</th>
                <th>Subject</th>
                <th>Category</th>
                <th>Assigned Specialist</th>
                <th>Priority</th>
                <th>Status</th>
                <th>SLA</th>
                <th>Filed</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => {
                const isAssignedToMe = t.assignedTo && (t.assignedTo._id === user?._id || t.assignedTo === user?._id);
                return (
                  <tr
                    key={t.ticketId}
                    className="clickable-row"
                    onClick={() => navigate(`/portal/${slug}/tickets/${t.ticketId}`)}
                  >
                    <td>
                      <code className="ticket-id" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                        {t.ticketId}
                      </code>
                    </td>
                    <td className="font-medium">{t.customer?.name}</td>
                    <td style={{ maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.subject}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: "0.76rem",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--bg-main)",
                          border: "1px solid var(--border-color)",
                          color: "var(--text-main)",
                          fontWeight: 500,
                        }}
                      >
                        {t.category || "General"}
                      </span>
                    </td>
                    <td>
                      {t.assignedTo ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: isAssignedToMe ? "var(--accent-hover)" : "var(--text-main)" }}>
                            {t.assignedTo.name} {isAssignedToMe && "(You)"}
                          </span>
                          {t.assignedTo.department && (
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                              {t.assignedTo.department}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "var(--radius-sm)",
                            background: "rgba(184, 115, 51, 0.12)",
                            color: "#b87333",
                            fontWeight: 600,
                            border: "1px solid rgba(184, 115, 51, 0.3)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <AlertTriangle size={11} /> Unassigned
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge priority-${t.priority?.toLowerCase()}`}>{t.priority}</span>
                    </td>
                    <td>
                      <span className={`badge status-${t.status?.toLowerCase().replace(/\s+/g, "-")}`}>{t.status}</span>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {t.slaHours ? `${t.slaHours}h` : "24h"}
                    </td>
                    <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
              {tickets.length === 0 && (
                <tr>
                  <td colSpan="9" className="empty-state" style={{ padding: "2.5rem 1rem", textAlign: "center" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "0.5rem" }}>
                      No tickets matching the current criteria.
                    </div>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={handleClearFilters}
                      >
                        Reset Filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
