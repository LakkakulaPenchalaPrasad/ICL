import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/common/ProtectedRoute";

// Layouts
import { AdminLayout } from "./pages/admin/AdminLayout";
import { PortalLayout } from "./pages/portal/PortalLayout";

// Public pages
import { LandingPage } from "./pages/LandingPage";
import { ServicePage } from "./pages/service/ServicePage";
import { TrackTicket } from "./pages/service/TrackTicket";

// Admin pages
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { CompanyManagement } from "./pages/admin/CompanyManagement";
import { DeveloperManagement } from "./pages/admin/DeveloperManagement";

// Portal pages
import { PortalDashboard } from "./pages/portal/PortalDashboard";
import { TicketList } from "./pages/portal/TicketList";
import { TicketDetail } from "./pages/portal/TicketDetail";
import { EmployeeManagement } from "./pages/portal/EmployeeManagement";
import { ServicePageCustomizer } from "./pages/portal/ServicePageCustomizer";

// Service pages (customer)
import { ComplaintForm } from "./pages/service/ComplaintForm";
import { MyComplaints } from "./pages/service/MyComplaints";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ─── Public Routes ─── */}
          <Route path="/" element={<LandingPage />} />

          {/* Customer Service Pages (company-branded) */}
          <Route path="/s/:slug" element={<ServicePage />} />
          <Route path="/s/:slug/track/:ticketId" element={<TrackTicket />} />
          <Route path="/s/:slug/complaint" element={<ComplaintForm />} />
          <Route path="/s/:slug/my-complaints" element={<MyComplaints />} />

          {/* ─── Super Admin Panel ─── */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["superadmin"]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="companies" element={<CompanyManagement />} />
            <Route path="developers" element={<DeveloperManagement />} />
          </Route>

          {/* ─── Company Portal (Developer + Employees + Super Admin) ─── */}
          <Route
            path="/portal/:slug"
            element={
              <ProtectedRoute roles={["developer", "employee", "superadmin"]}>
                <PortalLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<PortalDashboard />} />
            <Route path="tickets" element={<TicketList />} />
            <Route path="tickets/:ticketId" element={<TicketDetail />} />
            <Route path="employees" element={<EmployeeManagement />} />
            <Route path="customize" element={<ServicePageCustomizer />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
