import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Building2, Users, TicketCheck, TrendingUp, ExternalLink, ArrowRight } from "lucide-react";

export const AdminDashboard = () => {
  const { apiFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await apiFetch("/api/admin/dashboard");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [apiFetch]);

  if (loading) return <div className="loading-spinner">Loading dashboard...</div>;
  if (!data) return <div className="error-message">Failed to load dashboard data.</div>;

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <span className="page-label">EXECUTIVE OVERSIGHT</span>
        <h1>Platform Dashboard</h1>
        <p>Platform-wide metrics across all companies, teams, and resolution pipelines.</p>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">TOTAL COMPANIES</span>
            <Building2 size={18} />
          </div>
          <div className="stat-value">{data.totalCompanies}</div>
          <div className="stat-footer">Active on platform</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">TOTAL TICKETS</span>
            <TicketCheck size={18} />
          </div>
          <div className="stat-value">{data.totalTickets}</div>
          <div className="stat-footer">Across all companies</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">TEAM MEMBERS</span>
            <Users size={18} />
          </div>
          <div className="stat-value">{data.totalEmployees}</div>
          <div className="stat-footer">Developers + Employees</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">RESOLUTION RATE</span>
            <TrendingUp size={18} />
          </div>
          <div className="stat-value">{data.resolutionRate}%</div>
          <div className="stat-footer">Resolved or Closed</div>
        </div>
      </div>

      {/* Company Breakdown */}
      <div className="dashboard-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 className="section-title" style={{ margin: 0 }}>
            COMPANIES ON PLATFORM ({data.companyAgg?.length || 0})
          </h2>
          <Link
            to="/admin/companies"
            className="btn-ghost"
            style={{ fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.4rem", textDecoration: "none" }}
          >
            Manage All Companies <ArrowRight size={14} />
          </Link>
        </div>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Slug</th>
                <th>Industry</th>
                <th>Developer</th>
                <th>Employees</th>
                <th>Tickets</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.companyAgg && data.companyAgg.length > 0 ? (
                data.companyAgg.map((c) => (
                  <tr key={c.slug}>
                    <td className="font-medium">{c.name}</td>
                    <td><code className="slug-badge">/s/{c.slug}</code></td>
                    <td>{c.industry || "General"}</td>
                    <td>{c.developer || "Not assigned"}</td>
                    <td>{c.employeeCount ?? 0}</td>
                    <td>
                      <span style={{ fontWeight: 700 }}>{c.ticketCount ?? c.count ?? 0}</span>
                    </td>
                    <td>
                      <span className={`badge status-${(c.status || "active").toLowerCase()}`}>
                        {c.status || "active"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.45rem", alignItems: "center" }}>
                        <a
                          href={`/s/${c.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-sm btn-ghost"
                          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                          title="Open public service page"
                        >
                          <ExternalLink size={13} /> Service
                        </a>
                        <Link
                          to={`/portal/${c.slug}`}
                          className="btn-sm btn-outline"
                          style={{ textDecoration: "none" }}
                          title="Open internal company portal"
                        >
                          Portal
                        </Link>
                        <Link
                          to="/admin/companies"
                          className="btn-sm btn-ghost"
                          style={{ textDecoration: "none" }}
                          title="Manage company details"
                        >
                          Manage
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "2rem" }}>
                    No companies registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Tickets */}
      {data.recentTickets && data.recentTickets.length > 0 && (
        <div className="dashboard-section">
          <h2 className="section-title">RECENT TICKETS</h2>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Subject</th>
                  <th>Company</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTickets.map((t) => (
                  <tr key={t.ticketId}>
                    <td><code className="ticket-id">{t.ticketId}</code></td>
                    <td className="font-medium">{t.subject}</td>
                    <td>{t.company?.name || "—"}</td>
                    <td><span className={`badge priority-${t.priority.toLowerCase()}`}>{t.priority}</span></td>
                    <td><span className={`badge status-${t.status.toLowerCase().replace(/\s+/g, "-")}`}>{t.status}</span></td>
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
