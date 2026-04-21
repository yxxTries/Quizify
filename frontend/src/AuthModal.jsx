import React, { useState } from "react";
import {
  forgotPassword,
  login,
  register,
  resetPassword,
} from "./api";

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(4, 10, 20, 0.7)",
  backdropFilter: "blur(4px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 40,
};

const cardStyle = {
  width: "min(92vw, 420px)",
  background: "linear-gradient(180deg, #111f35 0%, #0a1628 100%)",
  border: "1px solid #305681",
  borderRadius: 14,
  boxShadow: "0 16px 45px rgba(0, 0, 0, 0.45)",
  padding: "20px 18px",
};

const tabRowStyle = {
  display: "flex",
  gap: 8,
  marginBottom: 14,
};

const fieldStyle = {
  width: "100%",
  padding: "11px 12px",
  background: "#091425",
  border: "1px solid #274262",
  borderRadius: 8,
  color: "#e2e8f0",
  outline: "none",
};

const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontWeight: 600,
  fontSize: 13,
  color: "#b5c6db",
};

const actionBtnStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #78f4f0",
  background: "#00d2d3",
  color: "#0b1523",
  fontWeight: 800,
  cursor: "pointer",
};

function tabButtonStyle(active) {
  return {
    flex: 1,
    padding: "8px 10px",
    borderRadius: 8,
    border: active ? "1px solid #58d5e0" : "1px solid #274262",
    background: active ? "rgba(0, 210, 211, 0.2)" : "#0b1628",
    color: active ? "#9cf5ff" : "#9db5cf",
    fontWeight: 700,
    cursor: "pointer",
  };
}

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

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={cardStyle} onClick={(event) => event.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ fontSize: 24 }}>Account</h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid #36557a",
              color: "#bdd1e6",
              borderRadius: 6,
              padding: "4px 8px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>

        <div style={tabRowStyle}>
          <button type="button" style={tabButtonStyle(tab === "login")} onClick={() => { clearMessages(); setTab("login"); }}>
            Sign In
          </button>
          <button type="button" style={tabButtonStyle(tab === "register")} onClick={() => { clearMessages(); setTab("register"); }}>
            Sign Up
          </button>
          <button type="button" style={tabButtonStyle(tab === "forgot")} onClick={() => { clearMessages(); setTab("forgot"); }}>
            Forgot
          </button>
        </div>

        {tab === "login" && (
          <form onSubmit={onLogin}>
            <label style={labelStyle}>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={fieldStyle} />
            <label style={{ ...labelStyle, marginTop: 10 }}>Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={fieldStyle} />
            <button disabled={loading} type="submit" style={{ ...actionBtnStyle, marginTop: 14 }}>
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>
        )}

        {tab === "register" && (
          <form onSubmit={onRegister}>
            <label style={labelStyle}>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={fieldStyle} />
            <label style={{ ...labelStyle, marginTop: 10 }}>Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={fieldStyle} />
            <div style={{ marginTop: 6, color: "#8ea8c7", fontSize: 12 }}>{passwordHint(password)}</div>
            <button disabled={loading} type="submit" style={{ ...actionBtnStyle, marginTop: 14 }}>
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        )}

        {tab === "forgot" && (
          <form onSubmit={onForgot}>
            <label style={labelStyle}>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={fieldStyle} />
            <button disabled={loading} type="submit" style={{ ...actionBtnStyle, marginTop: 14 }}>
              {loading ? "Sending..." : "Send Reset"}
            </button>
            <div style={{ marginTop: 10, fontSize: 12, color: "#8ea8c7" }}>
              Have a token already? Use reset form below.
            </div>

            <label style={{ ...labelStyle, marginTop: 12 }}>Reset Token</label>
            <input value={resetToken} onChange={(e) => setResetToken(e.target.value)} style={fieldStyle} />
            <label style={{ ...labelStyle, marginTop: 10 }}>New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={fieldStyle} />
            <button disabled={loading || !resetToken || !newPassword} type="button" onClick={onReset} style={{ ...actionBtnStyle, marginTop: 12 }}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        {error && <div style={{ marginTop: 12, color: "#ff8d9a", whiteSpace: "pre-line" }}>{error}</div>}
        {info && <div style={{ marginTop: 12, color: "#95f2d2", whiteSpace: "pre-line" }}>{info}</div>}
      </div>
    </div>
  );
}
