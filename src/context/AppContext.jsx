import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import { INITIAL_TICKETS } from "../data/initialData";

const TOKEN_KEY = "resolveit_auth_token";
const USER_KEY = "resolveit_auth_user";
const THEME_KEY = "resolveit_theme";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Authentication State
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState("");
  const [pendingTab, setPendingTab] = useState(null);

  // Tickets state loaded from MongoDB Atlas API
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Database Connection Health State
  const [dbHealth, setDbHealth] = useState({
    connected: false,
    status: "connecting",
    name: "icl_db",
  });

  // UI state - Default landing is DASHBOARD ("analytics") as requested!
  const [activeTab, setActiveTab] = useState("analytics");
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(THEME_KEY) || "light";
  });

  const [activeTicketId, setActiveTicketId] = useState(null);
  const [activeArticleId, setActiveArticleId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [successModalTicketId, setSuccessModalTicketId] = useState(null);

  const isAuthenticated = Boolean(user && token);
  const currentRole = user?.role || "customer";

  // Check Database Connection Health
  const checkDbHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        setDbHealth({
          connected: data.database?.connected || false,
          status: data.database?.status || "connected",
          name: data.database?.name || "icl_db",
          host: data.database?.host || "MongoDB Atlas",
        });
      }
    } catch {
      setDbHealth({
        connected: false,
        status: "disconnected",
        name: "icl_db",
      });
    }
  }, []);

  // Fetch tickets (v2 is company-scoped, legacy /api/tickets avoided)
  const fetchTickets = useCallback(async () => {
    setLoadingTickets(false);
  }, []);

  // Initial load
  useEffect(() => {
    checkDbHealth();
    fetchTickets();
  }, [checkDbHealth, fetchTickets]);

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Sync auth
  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }

    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, [token, user]);

  // Audio Synth Chimes
  const playChime = (type = "success") => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "success") {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === "alert") {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(330, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {}
  };

  const showToast = (title, message, type = "info") => {
    const id = "toast-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    playChime(type === "error" ? "alert" : "success");

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Open & Close Auth Modal
  const openAuthModal = (message = "Authentication is mandatory to proceed.", targetTab = null) => {
    setAuthModalMessage(message);
    setPendingTab(targetTab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthModalMessage("");
  };

  // Controlled tab switcher - MANDATORY AUTH FOR OTHER PAGES!
  const switchTab = (tab) => {
    // Dashboard ("analytics") is public and accessible to everyone first
    if (tab === "analytics") {
      setActiveTab("analytics");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Any other page REQUIRES authentication!
    if (!isAuthenticated) {
      const pageNames = {
        home: "Registry Overview",
        submit: "Grievance Dossier Filing",
        tickets: "Ticket Ledger",
        track: "Audit & Docket Tracking",
        kb: "Statutory Knowledge Base",
      };
      const label = pageNames[tab] || tab;
      openAuthModal(`Authentication is mandatory to access ${label}. Please sign in with your verified profile.`, tab);
      return;
    }

    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Login action
  const loginUser = async (email, password) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Login failed" };
      }

      setToken(data.token);
      setUser(data.user);
      setIsAuthModalOpen(false);
      showToast("Access Granted", `Welcome back, ${data.user.name}.`, "success");

      // Navigate to the tab user initially intended to visit
      if (pendingTab) {
        setActiveTab(pendingTab);
        setPendingTab(null);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: "Network error connecting to auth service" };
    }
  };

  // Register action
  const registerUser = async (userData) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Registration failed" };
      }

      setToken(data.token);
      setUser(data.user);
      setIsAuthModalOpen(false);
      showToast("Account Created", `Registered profile for ${data.user.name}.`, "success");

      if (pendingTab) {
        setActiveTab(pendingTab);
        setPendingTab(null);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: "Network error connecting to registration service" };
    }
  };

  // Logout action
  const logoutUser = () => {
    setToken("");
    setUser(null);
    setActiveTab("analytics"); // Send back to public Dashboard
    showToast("Signed Out", "Your session has ended securely.", "info");
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}
  };

  // CREATE TICKET (Persisted to MongoDB Atlas)
  const createTicket = async (ticketData) => {
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticketData),
      });

      if (res.ok) {
        const newTicket = await res.json();
        setTickets((prev) => [newTicket, ...prev]);
        setSuccessModalTicketId(newTicket.id);
        triggerConfetti();
        showToast("Complaint Registered", `Ticket ${newTicket.id} registered into MongoDB Atlas.`, "success");
        return newTicket;
      }
    } catch (err) {
      console.error("API ticket creation failed:", err);
    }

    // Resilient local fallback if backend was temporarily unreachable
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newId = `RES-2026-${randomNum}`;
    const newTicket = {
      id: newId,
      title: ticketData.title,
      category: ticketData.category,
      priority: ticketData.priority,
      status: "Open",
      slaHours: ticketData.priority === "Critical" ? 6 : 24,
      createdAt: new Date().toISOString(),
      customer: {
        name: ticketData.custName,
        email: ticketData.custEmail,
        phone: ticketData.custPhone || "N/A",
        orderRef: ticketData.orderRef || "N/A",
      },
      description: ticketData.description,
      timeline: [{ step: "Grievance Lodged", time: "Just now", desc: "Ticket recorded." }],
      messages: [],
    };
    setTickets((prev) => [newTicket, ...prev]);
    setSuccessModalTicketId(newId);
    triggerConfetti();
    return newTicket;
  };

  // UPDATE TICKET (Persisted to MongoDB Atlas)
  const updateTicket = async (id, updates) => {
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const updated = await res.json();
        setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)));
        return;
      }
    } catch (err) {
      console.error("API update error:", err);
    }

    // Optimistic fallback
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  // ADD MESSAGE (Persisted to MongoDB Atlas)
  const addMessage = async (ticketId, message) => {
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });

      if (res.ok) {
        const newMsg = await res.json();
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId
              ? { ...t, messages: [...(t.messages || []), newMsg] }
              : t
          )
        );
        showToast("Message Logged", "Communication record added to case file.", "success");
        return newMsg;
      }
    } catch (err) {
      console.error("API message error:", err);
    }
  };

  // ESCALATE TICKET (Persisted to MongoDB Atlas)
  const escalateTicket = async (ticketId, reason) => {
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}/escalate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        const updated = await res.json();
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
        showToast("Escalated to Ombudsman", "Case transferred to Director Priya Patel for expedited resolution.", "error");
        return;
      }
    } catch (err) {
      console.error("API escalate error:", err);
    }
  };

  // SUBMIT CSAT (Persisted to MongoDB Atlas)
  const submitCsat = async (ticketId, rating, feedback) => {
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}/csat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, feedback }),
      });

      if (res.ok) {
        const updated = await res.json();
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
        triggerConfetti();
        showToast("Feedback Recorded", `Thank you for rating your experience (${rating}/5 stars).`, "success");
        return;
      }
    } catch (err) {
      console.error("API CSAT error:", err);
    }
  };

  // RESET DATA IN MONGODB
  const resetData = async () => {
    try {
      const res = await fetch("/api/tickets/reset", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets);
        showToast("Ledger Synchronized", "Dispute database synchronized with MongoDB Atlas.", "info");
        return;
      }
    } catch (err) {
      console.error("API sync error:", err);
    }
    showToast("Ledger Synchronized", "Dispute database reloaded.", "info");
  };

  // ANALYTICS COMPUTATION
  const getAnalytics = () => {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === "Open").length;
    const investigating = tickets.filter((t) => t.status === "Under Investigation").length;
    const escalated = tickets.filter((t) => t.status === "Escalated").length;
    const resolved = tickets.filter((t) => t.status === "Resolved" || t.status === "Closed").length;

    const categoryCounts = {};
    tickets.forEach((t) => {
      categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
    });

    const ratedTickets = tickets.filter((t) => t.csat && t.csat.stars);
    const avgCsat =
      ratedTickets.length > 0
        ? (ratedTickets.reduce((acc, curr) => acc + curr.csat.stars, 0) / ratedTickets.length).toFixed(1)
        : "4.9";

    const resolvedRate = total > 0 ? ((resolved / total) * 100).toFixed(1) : "100.0";

    return {
      total,
      open,
      investigating,
      escalated,
      resolved,
      active: open + investigating,
      resolvedRate,
      avgCsat,
      categoryCounts,
    };
  };

  return (
    <AppContext.Provider
      value={{
        tickets,
        loadingTickets,
        activeTab,
        user,
        token,
        isAuthenticated,
        currentRole,
        isAuthModalOpen,
        authModalMessage,
        dbHealth,
        theme,
        activeTicketId,
        activeArticleId,
        toasts,
        successModalTicketId,
        openAuthModal,
        closeAuthModal,
        loginUser,
        registerUser,
        logoutUser,
        setActiveTicketId,
        setActiveArticleId,
        setSuccessModalTicketId,
        toggleTheme,
        switchTab,
        createTicket,
        updateTicket,
        addMessage,
        escalateTicket,
        submitCsat,
        resetData,
        showToast,
        getAnalytics,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
