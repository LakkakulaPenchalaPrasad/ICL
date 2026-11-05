import React, { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";

const DEFAULT_GOOGLE_CLIENT_ID = "655046422470-02hihi68c7f67dv398of1uonskt128mr.apps.googleusercontent.com";

export const GoogleSignInButton = ({
  companySlug,
  portalType = "customer",
  onSuccess,
  onError,
  buttonText = "Sign in with Google",
  width = 280,
}) => {
  const { loginWithGoogle } = useAuth();
  const buttonRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [googleRendered, setGoogleRendered] = useState(false);
  const [originNotice, setOriginNotice] = useState(false);
  const [clientId, setClientId] = useState(() => import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID);

  // Fetch client ID from server if not set
  useEffect(() => {
    if (!clientId) {
      fetch("/api/auth/google/client-id")
        .then((res) => res.json())
        .then((data) => {
          if (data.clientId) setClientId(data.clientId);
        })
        .catch(() => setClientId(DEFAULT_GOOGLE_CLIENT_ID));
    }
  }, [clientId]);

  const handleCredentialResponse = useCallback(
    async (response) => {
      if (!response.credential) return;
      setLoading(true);
      try {
        const res = await loginWithGoogle(response.credential, companySlug, portalType);
        if (res.success) {
          if (onSuccess) onSuccess(res);
        } else {
          if (onError) onError(res.error || "Google sign-in failed", res);
        }
      } catch (err) {
        if (onError) onError("Network error during Google sign-in");
      } finally {
        setLoading(false);
      }
    },
    [loginWithGoogle, companySlug, portalType, onSuccess, onError]
  );

  useEffect(() => {
    if (!clientId) return;

    let checkInterval = null;

    const tryRenderGoogleButton = () => {
      if (window.google?.accounts?.id && buttonRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          buttonRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: "outline",
            size: "large",
            type: "standard",
            shape: "rectangular",
            text: "signin_with",
            logo_alignment: "left",
            width: typeof width === "number" ? width : 280,
          });

          // Check if Google successfully injected the iframe
          setTimeout(() => {
            if (buttonRef.current && buttonRef.current.querySelector("iframe")) {
              setGoogleRendered(true);
            }
          }, 300);
        } catch (err) {
          console.warn("Google button render error:", err);
        }
      }
    };

    if (window.google?.accounts?.id) {
      tryRenderGoogleButton();
    } else {
      checkInterval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(checkInterval);
          tryRenderGoogleButton();
        }
      }, 150);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [clientId, handleCredentialResponse, width]);

  const handleManualGoogleClick = () => {
    if (loading) return;
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setOriginNotice(true);
          }
        });
      } catch (err) {
        setOriginNotice(true);
      }
    } else {
      setOriginNotice(true);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", gap: "0.5rem" }}>
      {/* Official Google render container */}
      <div
        ref={buttonRef}
        style={{
          display: googleRendered ? "flex" : "none",
          justifyContent: "center",
          width: "100%",
          minHeight: "44px",
        }}
      />

      {/* Instant, Always-Visible Styled Fallback Button if Google iframe is still mounting or pending */}
      {!googleRendered && (
        <button
          type="button"
          onClick={handleManualGoogleClick}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            width: width ? `${width}px` : "280px",
            maxWidth: "100%",
            height: "44px",
            padding: "0 1rem",
            background: "#ffffff",
            color: "#1f2937",
            border: "1px solid #dadce0",
            borderRadius: "4px",
            fontSize: "0.9rem",
            fontWeight: 500,
            fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
            cursor: loading ? "wait" : "pointer",
            boxShadow: "0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15)",
            transition: "background-color 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafd")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
        >
          {/* Official Google Multi-color 'G' SVG */}
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <path
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
              fill="#34A853"
            />
            <path
              d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.347 2.825.957 4.039l3.007-2.332z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
              fill="#EA4335"
            />
          </svg>
          <span>{loading ? "Authenticating..." : buttonText}</span>
        </button>
      )}

      {/* Helpful alert if Google origin mismatch or setup error occurs */}
      {originNotice && !googleRendered && (
        <div
          style={{
            maxWidth: "340px",
            fontSize: "0.76rem",
            color: "var(--amber, #b45309)",
            background: "var(--amber-light, #fef3c7)",
            border: "1px solid var(--amber, #f59e0b)",
            padding: "0.45rem 0.65rem",
            borderRadius: "4px",
            textAlign: "center",
            lineHeight: 1.35,
          }}
        >
          Google Cloud: Ensure <code>{window.location.origin}</code> is in <strong>Authorized JavaScript origins</strong> in your Google Cloud Console.
        </div>
      )}
    </div>
  );
};
