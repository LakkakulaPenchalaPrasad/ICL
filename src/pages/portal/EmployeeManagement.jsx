import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  UserPlus,
  Plus,
  X,
  Edit2,
  Check,
  ShieldCheck,
  Layers,
  HelpCircle,
} from "lucide-react";

const SUGGESTED_DEPARTMENTS = [
  "Finance & Billing",
  "Technical Support",
  "Customer Relations",
  "Logistics & Fulfillment",
  "Account & Security",
];

export const EmployeeManagement = () => {
  const { slug } = useParams();
  const { apiFetch } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", department: "" });
  const [error, setError] = useState("");

  // Edit employee state
  const [editingId, setEditingId] = useState(null);
  const [editDept, setEditDept] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchEmployees = async () => {
    try {
      const res = await apiFetch(`/api/companies/${slug}/employees`);
      if (res.ok) setEmployees(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [slug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || form.name.trim().length < 2) {
      return setError("Employee name must be at least 2 characters long.");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      return setError("Please enter a valid email address.");
    }
    if (!form.password || form.password.trim().length < 6) {
      return setError("Employee password must be at least 6 characters long.");
    }

    const res = await apiFetch(`/api/companies/${slug}/employees`, {
      method: "POST",
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);

    setShowForm(false);
    setForm({ name: "", email: "", password: "", department: "" });
    fetchEmployees();
  };

  const handleStartEdit = (emp) => {
    setEditingId(emp._id);
    setEditDept(emp.department || "");
  };

  const handleSaveEdit = async (id) => {
    setSavingEdit(true);
    try {
      const res = await apiFetch(`/api/companies/${slug}/employees/${id}`, {
        method: "PUT",
        body: JSON.stringify({ department: editDept.trim() }),
      });
      if (res.ok) {
        setEditingId(null);
        fetchEmployees();
      }
    } catch (err) {
      console.error("Failed to update employee department:", err);
    } finally {
      setSavingEdit(false);
    }
  };

  const dismissEmployee = async (id) => {
    if (!confirm("Are you sure you want to dismiss this employee? Their active tickets will be unassigned for triage.")) return;
    await apiFetch(`/api/companies/${slug}/employees/${id}`, { method: "DELETE" });
    fetchEmployees();
  };

  const reinstateEmployee = async (id) => {
    await apiFetch(`/api/companies/${slug}/employees/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status: "active" }),
    });
    fetchEmployees();
  };

  if (loading) return <div className="loading-spinner">Loading employees...</div>;

  return (
    <div className="management-page">
      <div className="page-header" style={{ marginBottom: "1.25rem" }}>
        <div>
          <span className="page-label">TEAM & DEPARTMENT DIRECTORY</span>
          <h1>Employee Management</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginTop: "0.25rem" }}>
            Add staff members and assign their departments. Customer complaints are automatically routed to the responsible department employee.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add Employee</>}
        </button>
      </div>

      {/* ─── Informational Routing Callout ─── */}
      <div
        style={{
          padding: "0.85rem 1.15rem",
          marginBottom: "1.5rem",
          borderRadius: "var(--radius-sm)",
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          fontSize: "0.85rem",
          color: "var(--text-body)",
        }}
      >
        <Layers size={18} style={{ color: "var(--accent-hover)", flexShrink: 0 }} />
        <div>
          <strong>Topic-Based Auto-Routing Engine:</strong> Incoming complaints (e.g. <em>Finance, Billing, Tech, Logistics</em>) are automatically assigned to the employee whose department matches that topic. If no employee has that department, tickets fall back to your developer triage queue to solve or redirect.
        </div>
      </div>

      {/* ─── Add Employee Form ─── */}
      {showForm && (
        <div className="form-card" style={{ marginBottom: "1.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0 }}>Add New Employee</h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
            >
              <X size={16} />
            </button>
          </div>

          {error && <div className="form-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Sarah Connor"
                  required
                />
              </div>
              <div className="form-group">
                <label>Company Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value.replace(/,([a-zA-Z]+)$/, '.$1') })}
                  onBlur={(e) => setForm({ ...form, email: e.target.value.replace(/,/g, '.') })}
                  placeholder="e.g. sarah@company.com"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Initial Password *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>
              <div className="form-group">
                <label>Department / Discipline *</label>
                <input
                  list="dept-suggestions"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="e.g. Finance & Billing"
                  required
                />
                <datalist id="dept-suggestions">
                  {SUGGESTED_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Quick preset department pills */}
            <div style={{ marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>
                Quick Department Presets:
              </span>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {SUGGESTED_DEPARTMENTS.map((dept) => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setForm({ ...form, department: dept })}
                    style={{
                      fontSize: "0.74rem",
                      padding: "0.2rem 0.55rem",
                      borderRadius: "999px",
                      background: form.department === dept ? "var(--accent-hover)" : "var(--bg-main)",
                      color: form.department === dept ? "#fff" : "var(--text-main)",
                      border: "1px solid var(--border-color)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="btn-primary">
              Create Employee Profile
            </button>
          </form>
        </div>
      )}

      {/* ─── Employees Directory Table ─── */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Active Tickets</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => {
              const isEditing = editingId === e._id;
              return (
                <tr key={e._id}>
                  <td className="font-medium">{e.name}</td>
                  <td>{e.email}</td>
                  <td>
                    {isEditing ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <input
                          list="dept-suggestions"
                          value={editDept}
                          onChange={(ev) => setEditDept(ev.target.value)}
                          style={{
                            padding: "0.25rem 0.5rem",
                            fontSize: "0.82rem",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--border-color)",
                            background: "var(--bg-card)",
                            color: "var(--text-main)",
                            width: "160px",
                          }}
                        />
                        <button
                          type="button"
                          className="btn-sm btn-primary"
                          onClick={() => handleSaveEdit(e._id)}
                          disabled={savingEdit}
                          style={{ padding: "0.25rem 0.45rem", fontSize: "0.75rem" }}
                          title="Save department"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          type="button"
                          className="btn-sm btn-ghost"
                          onClick={() => setEditingId(null)}
                          style={{ padding: "0.25rem 0.45rem", fontSize: "0.75rem" }}
                          title="Cancel"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                        <span
                          style={{
                            fontSize: "0.78rem",
                            padding: "0.2rem 0.55rem",
                            borderRadius: "var(--radius-sm)",
                            background: "var(--bg-main)",
                            border: "1px solid var(--border-color)",
                            fontWeight: 500,
                          }}
                        >
                          {e.department || "General Support"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(e)}
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "0.1rem" }}
                          title="Edit department"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{e.assignedTickets || 0}</span>
                  </td>
                  <td>
                    <span className={`badge status-${e.status}`}>{e.status}</span>
                  </td>
                  <td>
                    {e.status === "active" ? (
                      <button className="btn-sm btn-danger" onClick={() => dismissEmployee(e._id)}>
                        Dismiss
                      </button>
                    ) : (
                      <button className="btn-sm btn-success" onClick={() => reinstateEmployee(e._id)}>
                        Reinstate
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {employees.length === 0 && (
              <tr>
                <td colSpan="6" className="empty-state" style={{ padding: "2rem 1rem", textAlign: "center" }}>
                  No employees added yet. Add employees with departments like "Finance", "Technical Support", or "Logistics" to enable automated grievance routing.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
