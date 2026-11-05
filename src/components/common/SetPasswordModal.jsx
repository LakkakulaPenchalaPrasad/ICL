import React, { useState } from "react";
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const SetPasswordModal = ({ isOpen, onClose, onSuccess, userEmail, userName }) => {
  const { setInitialPassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    try {
      const res = await setInitialPassword(password);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          if (onSuccess) onSuccess();
          if (onClose) onClose();
        }, 1200);
      } else {
        setError(res.error || "Failed to set password. Please try again.");
      }
    } catch (err) {
      setError("Network error while setting password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: "1.25rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "var(--bg-card, #ffffff)",
          border: "1px solid var(--border-dark, #e2e8f0)",
          borderRadius: "1rem",
          padding: "2rem",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          position: "relative",
        }}
      >
        {success ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "var(--sage-light, #e6f4ea)",
                color: "var(--sage, #137333)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.25rem",
              }}
            >
              <CheckCircle size={32} />
            </div>
            <h3
              style={{
                fontFamily: "var(--font-serif, serif)",
                fontSize: "1.5rem",
                color: "var(--text-main, #0f172a)",
                marginBottom: "0.5rem",
              }}
            >
              Password Configured!
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted, #64748b)" }}>
              Your account password has been secured. Next time you sign in with Google, you'll be let in directly.
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  background: "var(--primary-light, #e0e7ff)",
                  color: "var(--primary, #3b82f6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3
                  style={{
                    fontFamily: "var(--font-serif, serif)",
                    fontSize: "1.35rem",
                    color: "var(--text-main, #0f172a)",
                    lineHeight: 1.2,
                  }}
                >
                  Create Account Password
                </h3>
                <span
                  style={{
                    fontSize: "0.74rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--primary, #3b82f6)",
                    fontWeight: 700,
                  }}
                >
                  First-Time Google Sign-In Setup
                </span>
              </div>
            </div>

            <p
              style={{
                fontSize: "0.86rem",
                color: "var(--text-muted, #64748b)",
                marginBottom: "1.25rem",
                lineHeight: 1.5,
              }}
            >
              Welcome, <strong>{userName || userEmail || "Valued Customer"}</strong>! As a new customer signing in with Google, please set a password once. In the future, you will be let in directly to track or file complaints.
            </p>

            {error && (
              <div
                style={{
                  padding: "0.75rem 0.9rem",
                  background: "var(--brick-light, #fee2e2)",
                  border: "1px solid var(--brick, #ef4444)",
                  borderRadius: "0.5rem",
                  color: "var(--brick, #dc2626)",
                  fontSize: "0.85rem",
                  marginBottom: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--text-muted, #64748b)",
                    marginBottom: "0.35rem",
                  }}
                >
                  Create Password (minimum 6 characters)
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter a strong password"
                    required
                    style={{
                      width: "100%",
                      padding: "0.65rem 2.5rem 0.65rem 0.85rem",
                      background: "var(--bg-surface, #f8fafc)",
                      border: "1px solid var(--border-color, #cbd5e1)",
                      borderRadius: "0.5rem",
                      color: "var(--text-main, #0f172a)",
                      fontSize: "0.9rem",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--text-muted, #64748b)",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--text-muted, #64748b)",
                    marginBottom: "0.35rem",
                  }}
                >
                  Confirm Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.85rem",
                    background: "var(--bg-surface, #f8fafc)",
                    border: "1px solid var(--border-color, #cbd5e1)",
                    borderRadius: "0.5rem",
                    color: "var(--text-main, #0f172a)",
                    fontSize: "0.9rem",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    padding: "0.75rem 1.25rem",
                    background: "var(--primary, #2563eb)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "0.5rem",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  <Lock size={16} />
                  {loading ? "Saving Password..." : "Set Password & Proceed"}
                  {!loading && <ArrowRight size={16} />}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
