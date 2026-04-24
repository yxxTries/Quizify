import React, { useEffect, useState } from "react";
import { changePassword, getMyGames, updateProfile, updatePreferences } from "./api";

const profileStyles = `
  .account-page {
    min-height: 100vh;
    background: #1A1A2E;
    color: #F1F2F6;
    padding: 32px 20px 48px;
  }

  .account-shell {
    width: min(880px, 100%);
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .account-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    flex-wrap: wrap;
  }

  .account-kicker {
    margin: 0 0 8px;
    color: #9cc7ee;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .account-title {
    margin: 0;
    font-size: clamp(2rem, 5vw, 3rem);
    line-height: 1.02;
  }

  .account-subtitle {
    margin: 10px 0 0;
    color: #9fb2c8;
    line-height: 1.6;
    max-width: 560px;
  }

  .account-back {
    border: 1px solid #2B5A8A;
    background: rgba(15, 52, 96, 0.55);
    color: #E2E8F0;
    border-radius: 10px;
    padding: 10px 14px;
    cursor: pointer;
    font-weight: 600;
  }

  .account-card {
    border: 1px solid #24456A;
    background: linear-gradient(180deg, rgba(22, 30, 52, 0.96) 0%, rgba(14, 20, 39, 0.98) 100%);
    border-radius: 20px;
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.28);
  }

  .account-summary {
    padding: 24px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 20px;
    align-items: center;
  }

  .account-identity {
    display: flex;
    align-items: center;
    gap: 18px;
    min-width: 0;
  }

  .account-avatar {
    width: 72px;
    height: 72px;
    border-radius: 20px;
    display: grid;
    place-items: center;
    background: linear-gradient(180deg, #1c3f67 0%, #132a47 100%);
    color: #dbf4ff;
    border: 1px solid #4b6f96;
    font-size: 28px;
    font-weight: 700;
    flex: 0 0 auto;
  }

  .account-name {
    margin: 0;
    font-size: clamp(1.5rem, 4vw, 2rem);
    line-height: 1.05;
    word-break: break-word;
  }

  .account-email {
    margin: 8px 0 0;
    color: #B0BAC3;
    word-break: break-word;
  }

  .account-count {
    min-width: 180px;
    padding: 18px 20px;
    border-radius: 18px;
    border: 1px solid #2B5A8A;
    background: rgba(11, 21, 38, 0.88);
  }

  .account-count-label {
    margin: 0;
    color: #9db5cf;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .account-count-value {
    margin: 10px 0 0;
    font-size: clamp(2rem, 5vw, 3rem);
    line-height: 1;
  }

  .account-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
  }

  .account-panel {
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .account-panel-title {
    margin: 0;
    font-size: 22px;
  }

  .account-panel-copy {
    margin: 0;
    color: #9fb2c8;
    line-height: 1.6;
  }

  .account-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .account-label {
    display: block;
    margin-bottom: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #b5c6db;
  }

  .account-input {
    width: 100%;
    border-radius: 10px;
    border: 1px solid #274262;
    background: #091425;
    color: #F1F2F6;
    padding: 12px 13px;
    outline: none;
    font-size: 15px;
  }

  .account-input:focus {
    border-color: #58d5e0;
    box-shadow: 0 0 0 3px rgba(0, 210, 211, 0.12);
  }

  .account-button {
    align-self: flex-start;
    border-radius: 10px;
    border: 1px solid #78f4f0;
    background: #00d2d3;
    color: #0b1523;
    font-weight: 800;
    cursor: pointer;
    padding: 11px 16px;
  }

  .account-button:disabled {
    opacity: 0.7;
    cursor: wait;
  }

  .account-feedback {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
  }

  .account-feedback-success {
    color: #95f2d2;
  }

  .account-feedback-error {
    color: #ff8d9a;
  }

  .account-empty {
    padding: 22px;
    color: #9fb2c8;
    line-height: 1.6;
  }

  @media (max-width: 800px) {
    .account-summary,
    .account-grid {
      grid-template-columns: 1fr;
    }

    .account-count {
      min-width: 0;
    }
  }

  @media (max-width: 560px) {
    .account-page {
      padding: 24px 16px 40px;
    }

    .account-summary,
    .account-panel {
      padding: 18px;
    }

    .account-identity {
      align-items: flex-start;
    }
  }
`;

function buildFeedback(message = "", tone = "") {
  return { message, tone };
}

export default function MyProfile({ user, onBack, onRequireAuth, onUserUpdated, autoReveal = true, onAutoRevealChange }) {
  const [savedQuizCount, setSavedQuizCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(Boolean(user));
  const [countError, setCountError] = useState("");

  const [profileForm, setProfileForm] = useState({
    username: user?.username || "",
    email: user?.email || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });

  const [profileState, setProfileState] = useState({ saving: false, feedback: buildFeedback() });
  const [passwordState, setPasswordState] = useState({ saving: false, feedback: buildFeedback() });
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsFeedback, setPrefsFeedback] = useState(buildFeedback());

  useEffect(() => {
    setProfileForm({
      username: user?.username || "",
      email: user?.email || "",
    });
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setSavedQuizCount(0);
      setCountError("");
      setLoadingCount(false);
      return () => {
        cancelled = true;
      };
    }

    async function loadCount() {
      setLoadingCount(true);
      setCountError("");

      try {
        const payload = await getMyGames();
        if (!cancelled) {
          const games = Array.isArray(payload?.games) ? payload.games : [];
          setSavedQuizCount(games.length);
        }
      } catch (err) {
        if (!cancelled) {
          setCountError(err?.message || "Could not load saved quiz count.");
        }
      } finally {
        if (!cancelled) {
          setLoadingCount(false);
        }
      }
    }

    loadCount();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const avatarInitial = (user?.username || user?.email || "Q")[0]?.toUpperCase() || "Q";

  const handleAutoRevealToggle = async (newValue) => {
    if (!onAutoRevealChange) return;
    setPrefsSaving(true);
    setPrefsFeedback(buildFeedback());
    try {
      await updatePreferences({ auto_reveal: newValue });
      onAutoRevealChange(newValue);
      setPrefsFeedback(buildFeedback("Preference saved.", "success"));
    } catch (err) {
      setPrefsFeedback(buildFeedback(err?.message || "Could not save preference.", "error"));
    } finally {
      setPrefsSaving(false);
    }
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileState({ saving: true, feedback: buildFeedback() });

    try {
      const updatedUser = await updateProfile({
        username: profileForm.username,
        email: profileForm.email,
      });
      onUserUpdated(updatedUser);
      setProfileState({
        saving: false,
        feedback: buildFeedback("Profile updated.", "success"),
      });
    } catch (err) {
      setProfileState({
        saving: false,
        feedback: buildFeedback(err?.message || "Could not update profile.", "error"),
      });
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordState({ saving: true, feedback: buildFeedback() });

    try {
      const response = await changePassword({
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setPasswordState({
        saving: false,
        feedback: buildFeedback(response?.message || "Password updated.", "success"),
      });
    } catch (err) {
      setPasswordState({
        saving: false,
        feedback: buildFeedback(err?.message || "Could not update password.", "error"),
      });
    }
  };

  if (!user) {
    return (
      <>
        <style>{profileStyles}</style>
        <div className="account-page">
          <div className="account-shell">
            <header className="account-header">
              <div>
                <p className="account-kicker">Account</p>
                <h1 className="account-title">My Profile</h1>
              </div>
              <button type="button" onClick={onBack} className="account-back">
                Back to Home
              </button>
            </header>

            <div className="account-card account-empty">
              Sign in to view and edit your profile.
              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" onClick={onRequireAuth} className="account-button">
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{profileStyles}</style>
      <div className="account-page">
        <div className="account-shell">
          <header className="account-header">
            <div>
              <p className="account-kicker">Account</p>
              <h1 className="account-title">My Profile</h1>
              <p className="account-subtitle">
                Edit your name, email, and password from one place.
              </p>
            </div>
            <button type="button" onClick={onBack} className="account-back">
              Back to Home
            </button>
          </header>

          <section className="account-card account-summary">
            <div className="account-identity">
              <div className="account-avatar">{avatarInitial}</div>
              <div style={{ minWidth: 0 }}>
                <h2 className="account-name">{user.username}</h2>
                <p className="account-email">{user.email}</p>
              </div>
            </div>

            <div className="account-count">
              <p className="account-count-label">Saved Quizzes</p>
              <p className="account-count-value">{loadingCount ? "..." : savedQuizCount}</p>
              {countError && (
                <p className="account-feedback account-feedback-error" style={{ marginTop: 8 }}>
                  {countError}
                </p>
              )}
            </div>
          </section>

          <article className="account-card account-panel">
            <div>
              <h2 className="account-panel-title">Quiz Preferences</h2>
              <p className="account-panel-copy">
                Control how your quizzes behave when using the timer.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div>
                <div style={{ fontWeight: 600, color: "#d7e8ff", marginBottom: 4 }}>Auto-reveal answer when time runs out</div>
                <div style={{ fontSize: 13, color: "#9fb2c8" }}>
                  When off, answers are locked but not shown — you control the reveal.
                </div>
              </div>
              <button
                type="button"
                disabled={prefsSaving}
                onClick={() => handleAutoRevealToggle(!autoReveal)}
                style={{
                  flexShrink: 0,
                  width: 52,
                  height: 28,
                  borderRadius: 14,
                  border: "none",
                  background: autoReveal ? "#00d2d3" : "#274262",
                  cursor: prefsSaving ? "wait" : "pointer",
                  position: "relative",
                  transition: "background 0.2s",
                }}
                aria-label={autoReveal ? "Disable auto-reveal" : "Enable auto-reveal"}
              >
                <span style={{
                  position: "absolute",
                  top: 3,
                  left: autoReveal ? 26 : 3,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.2s",
                }} />
              </button>
            </div>

            {prefsFeedback.message && (
              <p className={`account-feedback ${prefsFeedback.tone === "success" ? "account-feedback-success" : "account-feedback-error"}`}>
                {prefsFeedback.message}
              </p>
            )}
          </article>

          <section className="account-grid">
            <article className="account-card account-panel">
              <div>
                <h2 className="account-panel-title">Profile Details</h2>
                <p className="account-panel-copy">
                  Update your username and email. Email verification can be layered in later.
                </p>
              </div>

              <form className="account-form" onSubmit={handleProfileSubmit}>
                <div>
                  <label className="account-label">Username</label>
                  <input
                    className="account-input"
                    value={profileForm.username}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, username: event.target.value }))
                    }
                    minLength={3}
                    maxLength={24}
                    required
                  />
                </div>

                <div>
                  <label className="account-label">Email</label>
                  <input
                    className="account-input"
                    type="email"
                    value={profileForm.email}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, email: event.target.value }))
                    }
                    required
                  />
                </div>

                <button type="submit" className="account-button" disabled={profileState.saving}>
                  {profileState.saving ? "Saving..." : "Save Changes"}
                </button>
              </form>

              {profileState.feedback.message && (
                <p
                  className={`account-feedback ${
                    profileState.feedback.tone === "success"
                      ? "account-feedback-success"
                      : "account-feedback-error"
                  }`}
                >
                  {profileState.feedback.message}
                </p>
              )}
            </article>

            <article className="account-card account-panel">
              <div>
                <h2 className="account-panel-title">Password</h2>
                <p className="account-panel-copy">
                  Use your current password to set a new one.
                </p>
              </div>

              <form className="account-form" onSubmit={handlePasswordSubmit}>
                <div>
                  <label className="account-label">Current Password</label>
                  <input
                    className="account-input"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="account-label">New Password</label>
                  <input
                    className="account-input"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
                    }
                    required
                  />
                </div>

                <button type="submit" className="account-button" disabled={passwordState.saving}>
                  {passwordState.saving ? "Updating..." : "Update Password"}
                </button>
              </form>

              {passwordState.feedback.message && (
                <p
                  className={`account-feedback ${
                    passwordState.feedback.tone === "success"
                      ? "account-feedback-success"
                      : "account-feedback-error"
                  }`}
                >
                  {passwordState.feedback.message}
                </p>
              )}
            </article>
          </section>
        </div>
      </div>
    </>
  );
}
