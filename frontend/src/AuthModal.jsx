import React, { useState, useMemo } from "react";
import {
  forgotPassword,
  login,
  register,
  resetPassword,
} from "./api";
import { useTheme } from "./ThemeContext.jsx";

const getStyles = (COLORS) => ({
  overlay: {
    position: "fixed",
    inset: 0,
    background: COLORS.overlay,
    backdropFilter: "blur(4px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 40,
  },
  card: {
    width: "min(92vw, 420px)",
    background: COLORS.creamSoft,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 14,
    boxShadow: `0 16px 45px ${COLORS.shadow}`,
    padding: "20px 18px",
  },
  tabRow: {
    display: "flex",
    gap: 8,
    marginBottom: 14,
  },
  field: {
    width: "100%",
    padding: "11px 12px",
    background: COLORS.cream,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    color: COLORS.ink,
    outline: "none",
  },
  label: {
    display: "block",
    marginBottom: 6,
    fontWeight: 600,
    fontSize: 13,
    color: COLORS.inkSoft,
  },
  actionBtn: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: `1px solid ${COLORS.blueDark}`,
    background: COLORS.blueDark,
    color: COLORS.creamSoft,
    fontWeight: 800,
    cursor: "pointer",
  },
});

function passwordHint(password) {
  if (!password) return "Use 8+ chars with upper, lower, number, and symbol.";
  return "";
}

export default function AuthModal({ onClose, onAuthSuccess }) {
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => getStyles(COLORS), [COLORS]);

  const clearMessages = () => {
    setInfo("");
    setError("");
  };

  const onRegister = async (event) => {
    event.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      const user = await register({ email, password });
      onAuthSuccess(user);
      onClose();
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const onLogin = async (event) => {
    event.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      const user = await login({ email, password });
      onAuthSuccess(user);
      onClose();
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const onForgot = async (event) => {
    event.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      const result = await forgotPassword({ email });
      setInfo(result.message || "If your email exists, a reset link has been sent.");
      if (result.reset_token) {
        setInfo((prev) => `${prev}\nDev reset token: ${result.reset_token}`);
      }
    } catch (err) {
      setError(err.message || "Could not start password reset.");
    } finally {
      setLoading(false);
    }
  };

  const onReset = async (event) => {
    event.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      const result = await resetPassword({ token: resetToken, new_password: newPassword });
      setInfo(result.message || "Password reset successful. You can now log in.");
      setTab("login");
    } catch (err) {
      setError(err.message || "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  const getTabButtonStyle = (active) => ({
    flex: 1,
    padding: "8px 10px",
    borderRadius: 8,
    border: active ? `1px solid ${COLORS.blue}` : `1px solid ${COLORS.border}`,
    background: active ? COLORS.blueSoft : COLORS.cream,
    color: active ? COLORS.blue : COLORS.inkSoft,
    fontWeight: 700,
    cursor: "pointer",
  });

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.card} onClick={(event) => event.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ fontSize: 24, color: COLORS.ink }}>Account</h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: `1px solid ${COLORS.blueDark}`,
              color: COLORS.blueDark,
              borderRadius: 6,
              padding: "4px 8px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>

        <div style={styles.tabRow}>
          <button type="button" style={getTabButtonStyle(tab === "login")} onClick={() => { clearMessages(); setTab("login"); }}>
            Sign In
          </button>
          <button type="button" style={getTabButtonStyle(tab === "register")} onClick={() => { clearMessages(); setTab("register"); }}>
            Sign Up
          </button>
          <button type="button" style={getTabButtonStyle(tab === "forgot")} onClick={() => { clearMessages(); setTab("forgot"); }}>
            Forgot
          </button>
        </div>

        {tab === "login" && (
          <form onSubmit={onLogin}>
            <label style={styles.label}>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={styles.field} />
            <label style={{ ...styles.label, marginTop: 10 }}>Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={styles.field} />
            <button disabled={loading} type="submit" style={{ ...styles.actionBtn, marginTop: 14 }}>
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>
        )}

        {tab === "register" && (
          <form onSubmit={onRegister}>
            <label style={styles.label}>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={styles.field} />
            <label style={{ ...styles.label, marginTop: 10 }}>Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={styles.field} />
            <div style={{ marginTop: 6, color: COLORS.inkMuted, fontSize: 12 }}>{passwordHint(password)}</div>
            <button disabled={loading} type="submit" style={{ ...styles.actionBtn, marginTop: 14 }}>
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        )}

        {tab === "forgot" && (
          <form onSubmit={onForgot}>
            <label style={styles.label}>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={styles.field} />
            <button disabled={loading} type="submit" style={{ ...styles.actionBtn, marginTop: 14 }}>
              {loading ? "Sending..." : "Send Reset"}
            </button>
            <div style={{ marginTop: 10, fontSize: 12, color: COLORS.inkMuted }}>
              Have a token already? Use reset form below.
            </div>

            <label style={{ ...styles.label, marginTop: 12 }}>Reset Token</label>
            <input value={resetToken} onChange={(e) => setResetToken(e.target.value)} style={styles.field} />
            <label style={{ ...styles.label, marginTop: 10 }}>New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={styles.field} />
            <button disabled={loading || !resetToken || !newPassword} type="button" onClick={onReset} style={{ ...styles.actionBtn, marginTop: 12 }}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        {error && <div style={{ marginTop: 12, color: COLORS.coralDark, whiteSpace: "pre-line" }}>{error}</div>}
        {info && <div style={{ marginTop: 12, color: COLORS.quizPositive, whiteSpace: "pre-line" }}>{info}</div>}
      </div>
    </div>
  );
}
