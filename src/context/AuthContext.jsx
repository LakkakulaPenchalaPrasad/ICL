import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const TOKEN_KEY = "resolveit_auth_token";
const USER_KEY = "resolveit_auth_user";
const THEME_KEY = "resolveit_theme";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "light");

  const isAuthenticated = Boolean(user && token);
  const currentRole = user?.role || null;

  // Sync theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Sync auth to localStorage
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

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  // ─── API Helper ───
  const apiFetch = useCallback(
    async (url, options = {}) => {
      const headers = { "Content-Type": "application/json", ...options.headers };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(url, { ...options, headers });
      if (res.status === 401) {
        // Token expired
        setToken("");
        setUser(null);
      }
      return res;
    },
    [token]
  );

  // ─── Email/Password Login ───
  const loginUser = async (email, password, portalType = "staff") => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, portalType }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error || "Login failed",
          isStaffAccount: Boolean(data.isStaffAccount),
          isCustomerAccount: Boolean(data.isCustomerAccount),
          portalPath: data.portalPath || null,
        };
      }

      setToken(data.token);
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: "Network error during login" };
    } finally {
      setLoading(false);
    }
  };

  // ─── Google OAuth Login ───
  const loginWithGoogle = async (credential, companySlug, portalType = "customer") => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential, companySlug, portalType }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error || "Google login failed",
          isStaffAccount: Boolean(data.isStaffAccount),
          isCustomerAccount: Boolean(data.isCustomerAccount),
          portalPath: data.portalPath || null,
        };
      }

      setToken(data.token);
      setUser(data.user);
      return {
        success: true,
        user: data.user,
        isNewUser: Boolean(data.isNewUser),
        needsPasswordSetup: Boolean(data.needsPasswordSetup),
      };
    } catch (err) {
      return { success: false, error: "Network error during Google authentication" };
    } finally {
      setLoading(false);
    }
  };

  // ─── First-time Password Setup for New Google Customer ───
  const setInitialPassword = async (password) => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/auth/set-initial-password", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Failed to set password" };
      }
      return { success: true, message: data.message };
    } catch {
      return { success: false, error: "Network error" };
    } finally {
      setLoading(false);
    }
  };

  // ─── Logout ───
  const logoutUser = () => {
    setToken("");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        isAuthenticated,
        currentRole,
        theme,
        toggleTheme,
        apiFetch,
        loginUser,
        loginWithGoogle,
        setInitialPassword,
        logoutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
