import React, { useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, Building2, Users, LogOut, Moon, Sun, Menu, X, ChevronRight,
} from "lucide-react";

export const AdminLayout = () => {
  const { user, logoutUser, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { path: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { path: "/admin/companies", label: "Companies", icon: Building2 },
    { path: "/admin/developers", label: "Developers", icon: Users },
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
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="brand-text">RESOLVEIT</span>
            <span className="brand-sub">ADMIN PANEL</span>
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
                {user?.name?.[0]?.toUpperCase() || "A"}
              </div>
              <div className="user-details-col">
                <span className="user-name">{user?.name}</span>
                <span className="user-role-badge">{user?.role}</span>
              </div>
            </div>
          ) : (
            <div className="sidebar-user-icon-only" title={`${user?.name} (${user?.role})`}>
              <div className="user-avatar-small">
                {user?.name?.[0]?.toUpperCase() || "A"}
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
          <div className="topbar-left">
            <h2 className="topbar-title">Administration</h2>
          </div>
          <div className="topbar-right">
            <div className="topbar-user">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{user?.role}</span>
            </div>
          </div>
        </header>

        <main className="admin-content">
          {/* Nested routes render here */}
          <React.Suspense fallback={<div className="loading-spinner">Loading...</div>}>
            {/* Outlet renders child routes */}
            <Outlet />
          </React.Suspense>
        </main>
      </div>
    </div>
  );
};

