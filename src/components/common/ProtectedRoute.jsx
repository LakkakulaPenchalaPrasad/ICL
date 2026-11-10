import React from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ShieldAlert, LayoutDashboard, ArrowLeft } from "lucide-react";

/**
 * Route guard that checks authentication and role.
 * Usage: <ProtectedRoute roles={["superadmin"]}><AdminLayout /></ProtectedRoute>
 */
export const ProtectedRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, currentRole, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const isRoot = location.pathname === "/" || location.pathname === "";
    return <Navigate to={isRoot ? "/" : `/?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (roles.length > 0 && !roles.includes(currentRole)) {
    const getTargetDashboard = () => {
      if (currentRole === "superadmin") return { path: "/admin", label: "Super Admin Platform" };
      if (currentRole === "developer" || currentRole === "employee") {
        const slug = user?.company?.slug;
        return { path: slug ? `/portal/${slug}` : "/admin", label: "Your Company Portal" };
      }
      if (currentRole === "customer") return { path: "/s/technova/my-complaints", label: "My Grievances" };
      return { path: "/", label: "Home" };
    };

    const target = getTargetDashboard();

    return (
      <div className="access-denied-page">
        <div className="access-denied-card">
          <div className="access-denied-icon">
            <ShieldAlert size={36} />
          </div>
          <span className="page-label" style={{ color: "var(--brick)", marginBottom: "0.25rem" }}>
            RESTRICTED ACCESS
          </span>
          <h1>Access Denied</h1>
          <p>You do not have permission to access this administration page.</p>
          <div className="role-info-box">
            <div>Your Active Role: <strong>{currentRole}</strong></div>
            <div>Required Role: <strong>{roles.join(" or ")}</strong></div>
          </div>
          <div className="access-denied-actions">
            <Link
              to={target.path}
              className="btn-primary btn-sm"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", textDecoration: "none" }}
            >
              <LayoutDashboard size={14} /> Go to {target.label}
            </Link>
            <Link
              to="/"
              className="btn-outline btn-sm"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", textDecoration: "none" }}
            >
              <ArrowLeft size={14} /> Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
};
