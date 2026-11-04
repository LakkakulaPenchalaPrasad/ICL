import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/common/ProtectedRoute";

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-stone-500">
    <div className="w-8 h-8 border-3 border-stone-300 border-t-stone-800 rounded-full animate-spin mb-3"></div>
    <span className="text-xs font-mono tracking-wider uppercase">Loading ResolveIT...</span>
  </div>
);

// Layouts
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout").then(m => ({ default: m.AdminLayout })));
const PortalLayout = lazy(() => import("./pages/portal/PortalLayout").then(m => ({ default: m.PortalLayout })));

// Public pages
const LandingPage = lazy(() => import("./pages/LandingPage").then(m => ({ default: m.LandingPage })));
const ServicePage = lazy(() => import("./pages/service/ServicePage").then(m => ({ default: m.ServicePage })));
const TrackTicket = lazy(() => import("./pages/service/TrackTicket").then(m => ({ default: m.TrackTicket })));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const CompanyManagement = lazy(() => import("./pages/admin/CompanyManagement").then(m => ({ default: m.CompanyManagement })));
const DeveloperManagement = lazy(() => import("./pages/admin/DeveloperManagement").then(m => ({ default: m.DeveloperManagement })));

// Portal pages
const PortalDashboard = lazy(() => import("./pages/portal/PortalDashboard").then(m => ({ default: m.PortalDashboard })));
const TicketList = lazy(() => import("./pages/portal/TicketList").then(m => ({ default: m.TicketList })));
const TicketDetail = lazy(() => import("./pages/portal/TicketDetail").then(m => ({ default: m.TicketDetail })));
const EmployeeManagement = lazy(() => import("./pages/portal/EmployeeManagement").then(m => ({ default: m.EmployeeManagement })));
const ServicePageCustomizer = lazy(() => import("./pages/portal/ServicePageCustomizer").then(m => ({ default: m.ServicePageCustomizer })));

// Service pages (customer)
const ComplaintForm = lazy(() => import("./pages/service/ComplaintForm").then(m => ({ default: m.ComplaintForm })));
const MyComplaints = lazy(() => import("./pages/service/MyComplaints").then(m => ({ default: m.MyComplaints })));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
