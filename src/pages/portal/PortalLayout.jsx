import React, { useState } from "react";
import { Outlet, useNavigate, useLocation, useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, TicketCheck, Users, Palette, LogOut, Moon, Sun, Menu, X, ChevronRight, ArrowLeft, ExternalLink,
} from "lucide-react";

export const PortalLayout = () => {
  const { user, logoutUser, theme, toggleTheme, currentRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const basePath = `/portal/${slug}`;

  const navItems = [
    { path: basePath, label: "Dashboard", icon: LayoutDashboard, exact: true },
    { path: `${basePath}/tickets`, label: "Tickets", icon: TicketCheck },
    // Developer-only items
    ...(currentRole === "developer"
      ? [
          { path: `${basePath}/employees`, label: "Employees", icon: Users },
          { path: `${basePath}/customize`, label: "Customize", icon: Palette },
        ]
      : []),
  ];

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  const handleLogout = () => {
    logoutUser();
    navigate("/");
  };

  return (
    <div className={`admin-layout ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
      {/* Sidebar */}
      <aside className="admin-sidebar portal-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="brand-text">RESOLVEIT</span>
            <span className="brand-sub">COMPANY PORTAL</span>
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.path}
              className={`sidebar-nav-item ${isActive(item) ? "active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <item.icon size={18} />
              {sidebarOpen && <span>{item.label}</span>}
              {sidebarOpen && isActive(item) && <ChevronRight size={14} className="nav-arrow" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {sidebarOpen ? (
            <div className="sidebar-user-card">
              <div className="user-avatar-small">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="user-details-col">
                <span className="user-name">{user?.name}</span>
                <span className="user-role-badge">{currentRole}</span>
              </div>
            </div>
          ) : (
            <div className="sidebar-user-icon-only" title={`${user?.name} (${currentRole})`}>
              <div className="user-avatar-small">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
            </div>
          )}
          <button className="sidebar-nav-item" onClick={toggleTheme}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            {sidebarOpen && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
          </button>
          <button className="sidebar-nav-item logout" onClick={handleLogout}>
            <LogOut size={18} />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="topbar-left" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              onClick={() => navigate(currentRole === "superadmin" ? "/admin" : "/")}
              className="btn-sm btn-outline"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.82rem" }}
              title="Return to Dashboard"
            >
              <ArrowLeft size={14} /> {currentRole === "superadmin" ? "Admin Panel" : "Platform Home"}
            </button>

            <div style={{ width: "1px", height: "22px", backgroundColor: "var(--border-color)" }} />

            <div>
              <h2 className="topbar-title">{slug}</h2>
              <span className="topbar-subtitle">Company Portal</span>
            </div>
          </div>
          <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <a
              href={`/s/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="btn-sm btn-ghost"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", textDecoration: "none", fontSize: "0.82rem" }}
              title="Open public service desk"
            >
              <ExternalLink size={13} /> View Service Desk
            </a>
            <div className="topbar-user">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{currentRole}</span>
            </div>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
