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
  background: "rgba(42, 51, 64, 0.55)",
  backdropFilter: "blur(4px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 40,
};

const cardStyle = {
  width: "min(92vw, 420px)",
  background: "linear-gradient(180deg, #FFFCF0 0%, #FBF6E9 100%)",
  border: "1px solid #5A7FA8",
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
  background: "#FBF6E9",
  border: "1px solid #E5DCC2",
  borderRadius: 8,
  color: "#2A3340",
  outline: "none",
};

const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontWeight: 600,
  fontSize: 13,
  color: "#8A95A3",
};

const actionBtnStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #7FA3C9",
  background: "#5A7FA8",
  color: "#FBF6E9",
  fontWeight: 800,
  cursor: "pointer",
};

function tabButtonStyle(active) {
  return {
    flex: 1,
    padding: "8px 10px",
    borderRadius: 8,
    border: active ? "1px solid #7FA3C9" : "1px solid #E5DCC2",
    background: active ? "rgba(127, 163, 201, 0.2)" : "#FBF6E9",
    color: active ? "#7FA3C9" : "#8A95A3",
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
              border: "1px solid #5A7FA8",
              color: "#D8E4F0",
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
            <div style={{ marginTop: 6, color: "#8A95A3", fontSize: 12 }}>{passwordHint(password)}</div>
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
            <div style={{ marginTop: 10, fontSize: 12, color: "#8A95A3" }}>
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

        {error && <div style={{ marginTop: 12, color: "#E89B8C", whiteSpace: "pre-line" }}>{error}</div>}
        {info && <div style={{ marginTop: 12, color: "#A8C3A0", whiteSpace: "pre-line" }}>{info}</div>}
      </div>
    </div>
  );
}
