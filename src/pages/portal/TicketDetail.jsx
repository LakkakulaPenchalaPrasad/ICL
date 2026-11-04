import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  ArrowLeft,
  Send,
  AlertTriangle,
  Clock,
  User,
  Mail,
  Phone,
  Copy,
  Check,
  ShieldCheck,
  Tag,
  ExternalLink,
  MessageSquare,
  Lock,
  History,
  CheckCircle,
  Sparkles,
  UserCheck
} from "lucide-react";

export const TicketDetail = () => {
  const { slug, ticketId } = useParams();
  const { apiFetch, user, currentRole } = useAuth();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [message, setMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  const [newStatus, setNewStatus] = useState("");
  const [newPriority, setNewPriority] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [dateError, setDateError] = useState("");
  const [updateSuccessMsg, setUpdateSuccessMsg] = useState("");
  const [updatingTicket, setUpdatingTicket] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [copied, setCopied] = useState(false);

  const toLocalIso = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const fetchTicketAndTeam = async () => {
    try {
      const [ticketRes, empRes] = await Promise.all([
        apiFetch(`/api/companies/${slug}/tickets/${ticketId}`),
        apiFetch(`/api/companies/${slug}/employees`),
      ]);

      if (ticketRes.ok) {
        const data = await ticketRes.json();
        setTicket(data);
        setNewStatus(data.status);
        setNewPriority(data.priority);
        setNewAssignee(data.assignedTo?._id || data.assignedTo || "");
        setNewDeadline(toLocalIso(data.slaDeadline));
      }
      if (empRes.ok) {
        setEmployees(await empRes.json());
      }
    } catch (err) {
      console.error("Failed to load ticket details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketAndTeam();
  }, [slug, ticketId]);

  const handleCopyId = () => {
    if (ticket?.ticketId) {
      navigator.clipboard.writeText(ticket.ticketId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSendingMessage(true);

    try {
      const res = await apiFetch(`/api/companies/${slug}/tickets/${ticketId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text: message.trim(), isInternal }),
      });
      if (res.ok) {
        setMessage("");
        setIsInternal(false);
        fetchTicketAndTeam();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUpdateTicket = async () => {
    setDateError("");
    if (newDeadline) {
      const selected = new Date(newDeadline);
      if (isNaN(selected.getTime())) {
        setDateError("Invalid date/time format for SLA deadline.");
        return;
      }
      if (selected <= new Date()) {
        setDateError("SLA target deadline cannot be set in the past. Please select a future date and time.");
        return;
      }
    }

    setUpdatingTicket(true);
    try {
      const payload = {};
      if (newStatus && newStatus !== ticket.status) payload.status = newStatus;
      if (newPriority && newPriority !== ticket.priority) payload.priority = newPriority;
      const currentAssignedId = ticket.assignedTo?._id || ticket.assignedTo || "";
      if (newAssignee !== currentAssignedId) {
        payload.assignedTo = newAssignee || null;
      }
      if (newDeadline && newDeadline !== toLocalIso(ticket.slaDeadline)) {
        payload.slaDeadline = new Date(newDeadline).toISOString();
      }

      const res = await apiFetch(`/api/companies/${slug}/tickets/${ticketId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        let msg = "Ticket successfully updated.";
        if (payload.assignedTo !== undefined) {
          msg = "Ticket redirected. Staff alert dispatched.";
        }
        if (["Resolved", "Closed"].includes(payload.status)) {
          msg = "Ticket marked as Resolved. Notice dispatched to customer.";
        }
        setUpdateSuccessMsg(msg);
        setTimeout(() => setUpdateSuccessMsg(""), 5000);
        fetchTicketAndTeam();
      } else {
        const errData = await res.json().catch(() => ({}));
        setDateError(errData.error || "Failed to update ticket.");
      }
    } catch (err) {
      console.error(err);
      setDateError("Network error updating ticket.");
    } finally {
      setUpdatingTicket(false);
    }
  };

  const handleEscalate = async () => {
    if (!confirm("Are you sure you want to escalate this ticket to high-priority watch?")) return;
    setEscalating(true);
    try {
      const res = await apiFetch(`/api/companies/${slug}/tickets/${ticketId}/escalate`, {
        method: "POST",
        body: JSON.stringify({ reason: "Escalated by staff member for immediate lead attention." }),
      });
      if (res.ok) {
        fetchTicketAndTeam();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEscalating(false);
    }
  };

  if (loading) return <div className="loading-spinner">Loading ticket record...</div>;
  if (!ticket) return <div className="error-message">Ticket record not found.</div>;

  const hasPendingChanges =
    newStatus !== ticket.status ||
    newPriority !== ticket.priority ||
    newAssignee !== (ticket.assignedTo?._id || ticket.assignedTo || "") ||
    newDeadline !== toLocalIso(ticket.slaDeadline);

  return (
    <div className="ticket-detail-page">
      {/* Top Bar Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => navigate(`/portal/${slug}/tickets`)}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
        >
          <ArrowLeft size={15} /> Back to Ticket Ledger
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <a
            href={`/s/${slug}/track/${ticket.ticketId}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", textDecoration: "none", fontSize: "0.82rem" }}
            title="Inspect public tracking page"
          >
            <ExternalLink size={13} /> Public Customer Tracker
          </a>
        </div>
      </div>

      {/* ─── Ticket Header Card ─── */}
      <div className="card" style={{ padding: "1.75rem 2rem", marginBottom: "1.75rem", border: "1px solid var(--border-dark)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.25rem" }}>
          <div style={{ flex: 1, minWidth: "280px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <code
                style={{
                  fontFamily: "monospace",
                  fontWeight: 700,
                  fontSize: "1.05rem",
                  padding: "0.3rem 0.65rem",
                  background: "var(--bg-main)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-main)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem"
                }}
              >
                {ticket.ticketId}
                <button
                  type="button"
                  onClick={handleCopyId}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "0 0.15rem", display: "inline-flex" }}
                  title="Copy Ticket ID"
                >
                  {copied ? <Check size={14} style={{ color: "var(--sage)" }} /> : <Copy size={14} />}
                </button>
              </code>

              <span className={`badge status-${ticket.status.toLowerCase().replace(/\s+/g, "-")}`} style={{ fontSize: "0.78rem" }}>
                {ticket.status}
              </span>
              <span className={`badge priority-${ticket.priority.toLowerCase()}`} style={{ fontSize: "0.78rem" }}>
                {ticket.priority} Priority
              </span>
            </div>

            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.75rem", fontWeight: 500, color: "var(--text-main)", margin: "0.35rem 0 0.75rem 0", lineHeight: 1.25 }}>
              {ticket.subject}
            </h1>

            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap", fontSize: "0.84rem", color: "var(--text-muted)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Tag size={14} /> {ticket.category || "General Support"}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Clock size={14} /> Target SLA: {ticket.slaHours}h
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <User size={14} /> Customer: <strong>{ticket.customer?.name || "Anonymous"}</strong>
              </span>
              {ticket.assignedTo ? (
                <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--sage)", fontWeight: 600 }}>
                  <UserCheck size={14} /> Assigned to: {ticket.assignedTo.name} ({ticket.assignedTo.department || "Support"})
                </span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "#b87333", fontWeight: 600, background: "rgba(184, 115, 51, 0.12)", padding: "0.15rem 0.5rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(184, 115, 51, 0.25)" }}>
                  <AlertTriangle size={13} /> Unassigned (Developer Triage Queue)
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div
            style={{
              padding: "1rem 1.25rem",
              background: "var(--bg-main)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              minWidth: "260px"
            }}
          >
            <div style={{ fontSize: "0.74rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-muted)" }}>
              Ticket Management & Triage
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                style={{ flex: 1, padding: "0.45rem 0.65rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-main)", fontSize: "0.85rem" }}
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Escalated">Escalated</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>

              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                style={{ flex: 1, padding: "0.45rem 0.65rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-main)", fontSize: "0.85rem" }}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            {/* Assignee select */}
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>
                Assign Support Agent
              </label>
              <select
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
                style={{ width: "100%", padding: "0.45rem 0.65rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-main)", fontSize: "0.85rem" }}
              >
                <option value="">-- Unassigned --</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.department || "Agent"})
                  </option>
                ))}
              </select>
            </div>

            {/* SLA Target Deadline Picker with Past Date Rejection */}
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>
                SLA Target Deadline
              </label>
              <input
                type="datetime-local"
                min={new Date().toISOString().slice(0, 16)}
                value={newDeadline}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewDeadline(val);
                  if (val) {
                    const selected = new Date(val);
                    if (selected <= new Date()) {
                      setDateError("SLA target deadline cannot be set in the past. Please select a future date and time.");
                    } else {
                      setDateError("");
                    }
                  } else {
                    setDateError("");
                  }
                }}
                style={{
                  width: "100%",
                  padding: "0.45rem 0.65rem",
                  borderRadius: "var(--radius-sm)",
                  border: dateError ? "1px solid var(--brick)" : "1px solid var(--border-color)",
                  background: "var(--bg-card)",
                  color: "var(--text-main)",
                  fontSize: "0.85rem"
                }}
              />
              {dateError && (
                <div style={{ color: "var(--brick)", fontSize: "0.72rem", marginTop: "0.25rem", lineHeight: 1.3 }}>
                  {dateError}
                </div>
              )}
              {updateSuccessMsg && (
                <div
                  style={{
                    color: "var(--sage)",
                    background: "rgba(68, 100, 80, 0.12)",
                    border: "1px solid rgba(68, 100, 80, 0.25)",
                    borderRadius: "var(--radius-sm)",
                    padding: "0.3rem 0.5rem",
                    fontSize: "0.74rem",
                    marginTop: "0.35rem",
                    lineHeight: 1.3,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                  }}
                >
                  <CheckCircle size={12} /> {updateSuccessMsg}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleUpdateTicket}
                disabled={!hasPendingChanges || !!dateError || updatingTicket}
                style={{ flex: 1 }}
              >
                {updatingTicket ? "Saving..." : "Apply Updates"}
              </button>

              {ticket.status !== "Escalated" && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handleEscalate}
                  disabled={escalating}
                  style={{ color: "var(--brick)", borderColor: "var(--brick)" }}
                  title="Escalate ticket urgency"
                >
                  <AlertTriangle size={14} /> Escalate
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main 2-Column Split Workspace ─── */}
      <div className="ticket-body-grid">
        {/* Left Workspace: Description + Chat Messages */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          {/* Complaint Description Card */}
          <div className="card" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-muted)" }}>
                Initial Complaint Statement
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Filed on {new Date(ticket.createdAt).toLocaleString()}
              </span>
            </div>

            <div
              style={{
                padding: "1.25rem",
                backgroundColor: "var(--bg-main)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-color)",
                color: "var(--text-body)",
                fontSize: "0.95rem",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap"
              }}
            >
              {ticket.description}
            </div>
          </div>

          {/* Conversation Thread */}
          <div className="card" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <MessageSquare size={16} /> Conversation & Internal Notes ({(ticket.messages || []).length})
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Audit trail preserved
              </span>
            </div>

            {/* Messages Feed */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.75rem" }}>
              {(ticket.messages || []).map((m, idx) => {
                const isInternalNote = m.isInternal;
                const isCustomer = m.senderRole === "customer";

                return (
                  <div
                    key={idx}
                    style={{
                      padding: "1.1rem 1.35rem",
                      borderRadius: "var(--radius-sm)",
                      border: isInternalNote
                        ? "1px solid rgba(140, 106, 70, 0.4)"
                        : "1px solid var(--border-color)",
                      backgroundColor: isInternalNote
                        ? "rgba(140, 106, 70, 0.08)"
                        : isCustomer
                        ? "var(--bg-main)"
                        : "var(--bg-card)",
                      alignSelf: isCustomer ? "flex-start" : isInternalNote ? "center" : "flex-end",
                      width: isInternalNote ? "100%" : "92%",
                      boxShadow: "var(--shadow-sm)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-main)" }}>
                          {m.senderName || "User"}
                        </span>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            textTransform: "uppercase",
                            padding: "0.15rem 0.45rem",
                            borderRadius: "3px",
                            fontWeight: 600,
                            backgroundColor: isCustomer ? "var(--bg-surface)" : "var(--sage-light)",
                            color: isCustomer ? "var(--text-muted)" : "var(--sage)"
                          }}
                        >
                          {m.senderRole}
                        </span>
                        {isInternalNote && (
                          <span
                            style={{
                              fontSize: "0.68rem",
                              textTransform: "uppercase",
                              padding: "0.15rem 0.45rem",
                              borderRadius: "3px",
                              fontWeight: 700,
                              backgroundColor: "var(--amber-light)",
                              color: "var(--amber)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem"
                            }}
                          >
                            <Lock size={10} /> Internal Note (Hidden from Customer)
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {new Date(m.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--text-body)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                      {m.text}
                    </p>
                  </div>
                );
              })}

              {(ticket.messages || []).length === 0 && (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", background: "var(--bg-main)", borderRadius: "var(--radius-sm)", border: "1px dashed var(--border-color)" }}>
                  No messages recorded yet. Type a response or internal note below to communicate.
                </div>
              )}
            </div>

            {/* Reply Composer */}
            <form onSubmit={handleSendMessage} style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1.25rem" }}>
              <div style={{ marginBottom: "0.75rem" }}>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    isInternal
                      ? "Write an internal note for team members (will NOT be visible to customer)..."
                      : "Type a formal reply to the customer..."
                  }
                  rows={3}
                  required
                  style={{
                    width: "100%",
                    padding: "0.85rem",
                    borderRadius: "var(--radius-sm)",
                    border: isInternal ? "1px solid var(--bronze)" : "1px solid var(--border-color)",
                    backgroundColor: isInternal ? "rgba(140, 106, 70, 0.05)" : "var(--bg-main)",
                    color: "var(--text-main)",
                    fontSize: "0.9rem",
                    lineHeight: 1.5,
                    resize: "vertical"
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    color: isInternal ? "var(--bronze)" : "var(--text-muted)"
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    style={{ width: "16px", height: "16px", accentColor: "var(--bronze)", cursor: "pointer" }}
                  />
                  <span>Post as Internal Private Note (Hidden from Customer)</span>
                </label>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={sendingMessage || !message.trim()}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", padding: "0.55rem 1.15rem" }}
                >
                  <Send size={14} />
                  {sendingMessage ? "Posting..." : isInternal ? "Save Internal Note" : "Send Customer Reply"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Sidebar: Customer Dossier + Audit Timeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          {/* Customer Information Card */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-muted)", margin: "0 0 1rem 0" }}>
              Customer Dossier
            </h3>

            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid var(--border-color)" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  background: "var(--primary)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "1.1rem"
                }}
              >
                {ticket.customer?.name?.[0]?.toUpperCase() || "C"}
              </div>
              <div>
                <strong style={{ fontSize: "1rem", color: "var(--text-main)", display: "block" }}>
                  {ticket.customer?.name || "Customer"}
                </strong>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Verified Complainant
                </span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Mail size={15} style={{ color: "var(--text-muted)" }} />
                <a
                  href={`mailto:${ticket.customer?.email}`}
                  style={{ color: "var(--text-main)", textDecoration: "none" }}
                >
                  {ticket.customer?.email || "No email on record"}
                </a>
              </div>

              {ticket.customer?.phone && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <Phone size={15} style={{ color: "var(--text-muted)" }} />
                  <span style={{ color: "var(--text-main)" }}>{ticket.customer.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer Satisfaction (CSAT) Card */}
          {ticket.csat && ticket.csat.rating && (
            <div className="card" style={{ padding: "1.5rem", background: "var(--sage-light)", borderColor: "var(--sage)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--sage)", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.45rem" }}>
                <Sparkles size={16} /> Customer Review & CSAT
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{ color: "#f59e0b", fontSize: "1.2rem" }}>
                  {"★".repeat(ticket.csat.rating)}{"☆".repeat(5 - ticket.csat.rating)}
                </span>
                <span style={{ fontWeight: 700, color: "var(--text-main)" }}>
                  {ticket.csat.rating} / 5
                </span>
              </div>
              {ticket.csat.feedback && (
                <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-body)", fontStyle: "italic" }}>
                  "{ticket.csat.feedback}"
                </p>
              )}
            </div>
          )}

          {/* SLA & Timeline Audit Trail */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "1rem" }}>
              <History size={16} style={{ color: "var(--text-muted)" }} />
              <h3 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-muted)", margin: 0 }}>
                Audit Timeline
              </h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", position: "relative", paddingLeft: "1.25rem", borderLeft: "2px solid var(--border-color)" }}>
              {(ticket.timeline || []).map((t, idx) => (
                <div key={idx} style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "-1.72rem",
                      top: "4px",
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: idx === 0 ? "var(--primary)" : "var(--bronze)",
                      border: "2px solid var(--bg-card)"
                    }}
                  />
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)", lineHeight: 1.3 }}>
                    {t.action}
                  </div>
                  {t.details && (
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.15rem", lineHeight: 1.4 }}>
                      {t.details}
                    </div>
                  )}
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>
                    {t.by ? `${t.by} • ` : ""}{new Date(t.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
