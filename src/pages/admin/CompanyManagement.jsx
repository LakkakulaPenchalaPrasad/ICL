import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Building2, Plus, X, ExternalLink, Pencil, Trash2, AlertTriangle } from "lucide-react";

export const CompanyManagement = () => {
  const { apiFetch } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", industry: "", ticketPrefix: "" });
  const [error, setError] = useState("");

  // Edit company modal state
  const [editComp, setEditComp] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    industry: "",
    ticketPrefix: "",
    developerId: "",
    status: "active",
  });
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete company modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const [compRes, devRes] = await Promise.all([
        apiFetch("/api/admin/companies"),
        apiFetch("/api/admin/developers"),
      ]);
      if (compRes.ok) setCompanies(await compRes.json());
      if (devRes.ok) setDevelopers(await devRes.json());
    } catch (err) {
      console.error("Failed to load company data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const autoSlug = (name) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || form.name.trim().length < 2) {
      return setError("Company name must be at least 2 characters long.");
    }
    const resolvedSlug = form.slug ? form.slug.trim().toLowerCase() : autoSlug(form.name);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(resolvedSlug)) {
      return setError("Slug must contain lowercase alphanumeric characters and hyphens only (e.g. quickcart).");
    }
    if (form.ticketPrefix && !/^[A-Z0-9]{2,6}$/.test(form.ticketPrefix.trim().toUpperCase())) {
      return setError("Ticket prefix must be 2 to 6 uppercase letters or numbers (e.g., TNS, QC).");
    }

    const res = await apiFetch("/api/admin/companies", {
      method: "POST",
      body: JSON.stringify({
        name: form.name.trim(),
        slug: resolvedSlug,
        industry: form.industry.trim(),
        ticketPrefix: form.ticketPrefix ? form.ticketPrefix.trim().toUpperCase() : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Failed to create company");
    setShowForm(false);
    setForm({ name: "", slug: "", industry: "", ticketPrefix: "" });
    fetchData();
  };

  const openEditModal = (comp) => {
    setEditComp(comp);
    setEditForm({
      name: comp.name || "",
      industry: comp.industry || "",
      ticketPrefix: comp.ticketPrefix || "",
      developerId: comp.developer?._id || comp.developer || "",
      status: comp.status || "active",
    });
    setEditError("");
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editComp) return;
    setEditError("");

    if (!editForm.name.trim() || editForm.name.trim().length < 2) {
      return setEditError("Company name must be at least 2 characters long.");
    }
    if (editForm.ticketPrefix && !/^[A-Z0-9]{2,6}$/.test(editForm.ticketPrefix.trim().toUpperCase())) {
      return setEditError("Ticket prefix must be 2 to 6 uppercase letters or numbers (e.g., TNS, QC).");
    }

    setSavingEdit(true);

    try {
      const payload = {
        name: editForm.name.trim(),
        industry: editForm.industry.trim(),
        ticketPrefix: editForm.ticketPrefix.trim().toUpperCase(),
        developerId: editForm.developerId || "",
        status: editForm.status,
      };

      const res = await apiFetch(`/api/admin/companies/${editComp._id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setEditError(data.error || "Failed to update company");
        setSavingEdit(false);
        return;
      }

      setEditComp(null);
      await fetchData();
    } catch (err) {
      setEditError("Network error while updating company");
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    await apiFetch(`/api/admin/companies/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status: newStatus }),
    });
    fetchData();
  };

  const handleDeletePermanent = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/admin/companies/${deleteTarget._id}?permanent=true`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteTarget(null);
        await fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to remove company");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting company");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="loading-spinner">Loading companies...</div>;

  return (
    <div className="management-page">
      <div className="page-header">
        <div>
          <span className="page-label">PLATFORM ADMINISTRATION</span>
          <h1>Company Management</h1>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add Company</>}
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h3>Register New Company</h3>
          {error && <div className="form-error">{error}</div>}
          <form onSubmit={handleCreateSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Company Name *</label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value, slug: autoSlug(e.target.value) })
                  }
                  required
                  placeholder="e.g., Tata Motors"
                />
              </div>
              <div className="form-group">
                <label>URL Slug *</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  required
                  placeholder="tata-motors"
                />
                <span className="form-hint">Service page: /s/{form.slug || "..."}</span>
              </div>
              <div className="form-group">
                <label>Industry</label>
                <input
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  placeholder="e.g., Automotive"
                />
              </div>
              <div className="form-group">
                <label>Ticket Prefix (Optional)</label>
                <input
                  value={form.ticketPrefix}
                  onChange={(e) => setForm({ ...form, ticketPrefix: e.target.value })}
                  placeholder="e.g., TATA"
                />
              </div>
            </div>
            <button type="submit" className="btn-primary">Create Company</button>
          </form>
        </div>
      )}

      {/* Companies Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Slug</th>
              <th>Industry</th>
              <th>Prefix</th>
              <th>Developer</th>
              <th>Employees</th>
              <th>Tickets</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c._id}>
                <td className="font-medium">{c.name}</td>
                <td><code className="slug-badge">{c.slug}</code></td>
                <td>{c.industry || "General"}</td>
                <td>
                  <code style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "var(--bronze)" }}>
                    {c.ticketPrefix || c.slug.toUpperCase()}
                  </code>
                </td>
                <td>
                  {c.developer?.name ? (
                    <div>
                      <div>{c.developer.name}</div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {c.developer.email}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted" style={{ fontStyle: "italic" }}>
                      Not assigned
                    </span>
                  )}
                </td>
                <td>{c.employeeCount || 0}</td>
                <td>{c.ticketCount || 0}</td>
                <td>
                  <span className={`badge status-${c.status}`}>{c.status}</span>
                </td>
                <td>
                  <div className="action-buttons" style={{ display: "flex", gap: "0.45rem", alignItems: "center" }}>
                    <a
                      href={`/s/${c.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-icon"
                      title="View Public Service Desk"
                    >
                      <ExternalLink size={14} />
                    </a>

                    <button
                      className="btn-sm btn-outline"
                      onClick={() => openEditModal(c)}
                      title="Edit Company Details"
                    >
                      <Pencil size={13} /> Edit
                    </button>

                    <button
                      className={`btn-sm ${c.status === "active" ? "btn-outline" : "btn-success"}`}
                      onClick={() => toggleStatus(c._id, c.status)}
                      title={c.status === "active" ? "Suspend company" : "Activate company"}
                      style={c.status === "active" ? { borderColor: "var(--bronze)", color: "var(--bronze)" } : {}}
                    >
                      {c.status === "active" ? "Suspend" : "Activate"}
                    </button>

                    <button
                      className="btn-sm btn-danger"
                      onClick={() => setDeleteTarget(c)}
                      title="Permanently Remove Company"
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr>
                <td colSpan="9" className="empty-state">No companies registered yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Edit Company Modal ─── */}
      {editComp && (
        <div className="modal-backdrop" onClick={() => !savingEdit && setEditComp(null)}>
          <div className="modal-dialog modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <span className="page-label">ORGANIZATION SETTINGS</span>
                <h3 className="modal-title" style={{ margin: 0, fontSize: "1.35rem" }}>
                  Edit Company: {editComp.name}
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditComp(null)}
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
                    Company Name *
                  </label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                    placeholder="e.g. Tata Motors"
                    style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-main)" }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
                    Industry
                  </label>
                  <input
                    value={editForm.industry}
                    onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                    placeholder="e.g. Technology, Retail, Automotive"
                    style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-main)" }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
                    Ticket Prefix (e.g. TNS, QC, TCS)
                  </label>
                  <input
                    value={editForm.ticketPrefix}
                    onChange={(e) => setEditForm({ ...editForm, ticketPrefix: e.target.value.toUpperCase() })}
                    placeholder="e.g. TNS"
                    style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-main)" }}
                  />
                  <span className="form-hint" style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.25rem", display: "block" }}>
                    Generated tickets will follow this prefix (e.g., {editForm.ticketPrefix || editComp.slug?.toUpperCase()}-2026-0001).
                  </span>
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
                    Assigned Lead Developer
                  </label>
                  <select
                    value={editForm.developerId}
                    onChange={(e) => setEditForm({ ...editForm, developerId: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-main)" }}
                  >
                    <option value="">-- None (Not Assigned) --</option>
                    {developers.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.email}) {d.company ? `— Current: ${d.company.name}` : ""}
                      </option>
                    ))}
                  </select>
                  <span className="form-hint" style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.25rem", display: "block" }}>
                    Grievance alert emails for this company are automatically sent to the assigned developer.
                  </span>
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.35rem", display: "block" }}>
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-main)" }}
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setEditComp(null)}
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
                  PERMANENT REMOVAL
                </span>
                <h3 className="modal-title" style={{ margin: 0, fontSize: "1.35rem" }}>
                  Remove Company
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
                Are you sure you want to permanently delete company <strong>{deleteTarget.name}</strong> (
                <code>/s/{deleteTarget.slug}</code>)?
              </p>
              <p style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                This will delete the company and unassign all linked personnel. This action is irreversible.
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
                {deleting ? "Deleting..." : "Permanently Delete Company"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
