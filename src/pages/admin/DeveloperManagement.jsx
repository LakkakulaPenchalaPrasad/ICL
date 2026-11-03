import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Plus, X, Pencil, Trash2, CheckCircle, AlertTriangle, Building2 } from "lucide-react";

export const DeveloperManagement = () => {
  const { apiFetch } = useAuth();
  const [developers, setDevelopers] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", companyId: "" });
  const [error, setError] = useState("");

  // Edit developer modal state
  const [editDev, setEditDev] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", password: "", companyId: "", status: "active" });
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete developer modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const [devRes, compRes] = await Promise.all([
        apiFetch("/api/admin/developers"),
        apiFetch("/api/admin/companies"),
      ]);
      if (devRes.ok) setDevelopers(await devRes.json());
      if (compRes.ok) {
        const comps = await compRes.json();
        setAllCompanies(comps);
      }
    } catch (err) {
      console.error("Failed to load developer data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter companies available for new developer assignment (companies without developer)
  const availableForNew = allCompanies.filter((c) => !c.developer);

  // Filter companies available when editing (companies without developer + the developer's current company)
  const getAvailableForEdit = (currentCompId) => {
    return allCompanies.filter((c) => {
      if (!c.developer) return true;
      const devCompanyId = typeof c.developer === "object" ? c.developer._id : c.developer;
      return c._id === currentCompId || devCompanyId === editDev?._id;
    });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const res = await apiFetch("/api/admin/developers", {
      method: "POST",
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Failed to create developer");
    setShowForm(false);
    setForm({ name: "", email: "", password: "", companyId: "" });
    fetchData();
  };

  const openEditModal = (dev) => {
    setEditDev(dev);
    setEditForm({
      name: dev.name || "",
      email: dev.email || "",
      password: "",
      companyId: dev.company?._id || dev.company || "",
      status: dev.status || "active",
    });
    setEditError("");
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editDev) return;
    setEditError("");
    setSavingEdit(true);

    try {
      const payload = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        status: editForm.status,
        companyId: editForm.companyId || null,
      };
      if (editForm.password && editForm.password.trim().length > 0) {
        payload.password = editForm.password.trim();
      }

      const res = await apiFetch(`/api/admin/developers/${editDev._id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setEditError(data.error || "Failed to update developer");
        setSavingEdit(false);
        return;
      }

      setEditDev(null);
      await fetchData();
    } catch (err) {
      setEditError("Network error while saving changes");
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const action = currentStatus === "active" ? "dismissed" : "activate";
    await apiFetch(`/api/admin/developers/${id}?action=${action}`, { method: "DELETE" });
    fetchData();
  };

  const handleDeletePermanent = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/admin/developers/${deleteTarget._id}?permanent=true`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteTarget(null);
        await fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete developer");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting developer");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="loading-spinner">Loading developers...</div>;

  return (
    <div className="management-page">
      <div className="page-header">
        <div>
          <span className="page-label">PLATFORM ADMINISTRATION</span>
          <h1>Developer Management</h1>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add Developer</>}
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h3>Create Developer Account</h3>
          {error && <div className="form-error">{error}</div>}
          <form onSubmit={handleCreateSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="John Doe"
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value.replace(/,([a-zA-Z]+)$/, '.$1') })}
                  onBlur={(e) => setForm({ ...form, email: e.target.value.replace(/,/g, '.') })}
                  required
                  placeholder="dev@company.com"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  placeholder="••••••••"
                />
              </div>
              <div className="form-group">
                <label>Assign to Company *</label>
                <select
                  value={form.companyId}
                  onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                  required
                >
                  <option value="">Select a company...</option>
                  {availableForNew.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.slug})
                    </option>
                  ))}
                </select>
                {availableForNew.length === 0 && (
                  <span className="form-hint">All companies already have developers assigned.</span>
                )}
              </div>
            </div>
            <button type="submit" className="btn-primary">Create Developer</button>
          </form>
        </div>
      )}

      {/* Developers Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Assigned Company</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {developers.map((d) => (
              <tr key={d._id}>
                <td className="font-medium">{d.name}</td>
                <td>
                  <span style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>{d.email}</span>
                </td>
                <td>
                  {d.company ? (
                    <span>
                      {d.company.name} <code className="slug-badge">{d.company.slug}</code>
                    </span>
                  ) : (
                    <span className="text-muted" style={{ fontStyle: "italic" }}>
                      Not assigned
                    </span>
                  )}
                </td>
                <td>
                  <span className={`badge status-${d.status}`}>{d.status}</span>
                </td>
                <td>
                  <div className="action-buttons" style={{ display: "flex", gap: "0.45rem", alignItems: "center" }}>
                    <button
                      className="btn-sm btn-outline"
                      onClick={() => openEditModal(d)}
                      title="Edit Developer Details & Email"
                    >
                      <Pencil size={13} /> Edit
                    </button>

                    {d.status === "active" ? (
                      <button
                        className="btn-sm btn-outline"
                        onClick={() => toggleStatus(d._id, "active")}
                        title="Deactivate Account"
                        style={{ borderColor: "var(--bronze)", color: "var(--bronze)" }}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        className="btn-sm btn-success"
                        onClick={() => toggleStatus(d._id, "dismissed")}
                        title="Reactivate Account"
                      >
                        Activate
                      </button>
                    )}

                    <button
                      className="btn-sm btn-danger"
                      onClick={() => setDeleteTarget(d)}
                      title="Permanently Remove Developer"
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {developers.length === 0 && (
              <tr>
                <td colSpan="5" className="empty-state">
                  No developers created yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Edit Developer Modal ─── */}
      {editDev && (
        <div className="modal-backdrop" onClick={() => !savingEdit && setEditDev(null)}>
          <div className="modal-dialog modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <span className="page-label">DEVELOPER SETTINGS</span>
                <h3 className="modal-title" style={{ margin: 0, fontSize: "1.35rem" }}>
                  Edit Developer Details
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditDev(null)}
                disabled={savingEdit}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {editError && <div className="form-error">{editError}</div>}

                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
                    Full Name *
                  </label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                    placeholder="e.g. John Doe"
                    style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-main)" }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
                    Email Address * (Used for grievance alerts)
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        email: e.target.value.replace(/,([a-zA-Z]+)$/, '.$1'),
                      })
                    }
                    onBlur={(e) =>
                      setEditForm({
                        ...editForm,
                        email: e.target.value.replace(/,/g, '.'),
                      })
                    }
                    required
                    placeholder="e.g. developer@company.com"
                    style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-main)" }}
                  />
                  <span className="form-hint" style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.25rem", display: "block" }}>
                    Automated email notifications for new complaints will be delivered here.
                  </span>
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
                    Assigned Company
                  </label>
                  <select
                    value={editForm.companyId}
                    onChange={(e) => setEditForm({ ...editForm, companyId: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-main)" }}
                  >
                    <option value="">-- None (Unassigned) --</option>
                    {getAvailableForEdit(editForm.companyId).map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.slug})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
                    Account Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-main)" }}
                  >
                    <option value="active">Active</option>
                    <option value="dismissed">Deactivated / Dismissed</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
                    Reset Password (Optional)
                  </label>
                  <input
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="Leave blank to keep current password"
                    style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-main)" }}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setEditDev(null)}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={savingEdit}>
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal-dialog modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <span className="page-label" style={{ color: "var(--brick)" }}>
                  PERMANENT DELETION
                </span>
                <h3 className="modal-title" style={{ margin: 0, fontSize: "1.35rem" }}>
                  Remove Developer
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.6, color: "var(--text-main)" }}>
                Are you sure you want to permanently delete <strong>{deleteTarget.name}</strong> (
                <code>{deleteTarget.email}</code>)?
              </p>
              <p style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                This will delete their login credentials and unassign them from any linked company. This action cannot be undone.
              </p>
            </div>

            <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleDeletePermanent}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Permanently Delete Developer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
