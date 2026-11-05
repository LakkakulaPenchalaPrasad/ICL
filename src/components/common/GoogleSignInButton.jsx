import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";

export const GoogleSignInButton = ({ companySlug, onSuccess, onError }) => {
  const { loginWithGoogle } = useAuth();
  const buttonRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState(() => import.meta.env.VITE_GOOGLE_CLIENT_ID || "");

  useEffect(() => {
    // If not baked into client env, fetch from backend API
    if (!clientId) {
      fetch("/api/auth/google/client-id")
        .then((res) => res.json())
        .then((data) => {
          if (data.clientId) setClientId(data.clientId);
        })
        .catch(() => {});
    }
  }, [clientId]);

  useEffect(() => {
    if (!clientId) return;

    const initGoogle = () => {
      if (window.google?.accounts?.id && buttonRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            if (!response.credential) return;
            setLoading(true);
            try {
              const res = await loginWithGoogle(response.credential, companySlug);
              if (res.success) {
                if (onSuccess) onSuccess(res.user);
              } else {
                if (onError) onError(res.error || "Google sign-in failed");
              }
            } catch (err) {
              if (onError) onError("Network error during Google sign-in");
            } finally {
              setLoading(false);
            }
          },
        });

        // Render official Google branded button
        buttonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          type: "standard",
          shape: "rectangular",
          text: "signin_with",
          logo_alignment: "left",
          width: 300,
        });
      }
    };

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGoogle();
        }
      }, 150);
      return () => clearInterval(interval);
    }
  }, [clientId, companySlug, loginWithGoogle, onSuccess, onError]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", minHeight: "44px" }}>
      {loading ? (
        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", padding: "0.5rem" }}>
          Authenticating with Google...
        </div>
      ) : (
        <div ref={buttonRef} style={{ width: "100%", display: "flex", justifyContent: "center" }} />
      )}
    </div>
  );
};
