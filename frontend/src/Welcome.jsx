import React, { useEffect, useRef } from "react";
import { FONTS, LIGHT_COLORS as COLORS } from "./theme.js";

export default function Welcome({ user, onSignIn, onSignOut, onCreate, onJoin }) {
  const username = user?.username || user?.email?.split("@")[0] || "";
  const rocketRef = useRef(null);
  const trailRef = useRef(null);
  
  const posRef = useRef({
    x: typeof window !== 'undefined' ? window.innerWidth / 4 : 100,
    y: typeof window !== 'undefined' ? window.innerHeight / 4 : 100,
    vx: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 1.0 + 1.0),
    vy: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 1.0 + 1.0)
  });

  useEffect(() => {
    let frameId;
    const size = 68; // Dimensions of the rocket SVG
    let frameCount = 0;

    const loop = () => {
      if (!rocketRef.current) return;
      const pos = posRef.current;
      frameCount++;

      let nextX = pos.x + pos.vx;
      let nextY = pos.y + pos.vy;
      let bounced = false;

      // Collision: Screen Walls
      if (nextX <= 0) {
        pos.vx = Math.abs(pos.vx);
        nextX = 0;
        bounced = true;
      } else if (nextX + size >= window.innerWidth) {
        pos.vx = -Math.abs(pos.vx);
        nextX = window.innerWidth - size;
        bounced = true;
      }

      if (nextY <= 0) {
        pos.vy = Math.abs(pos.vy);
        nextY = 0;
        bounced = true;
      } else if (nextY + size >= window.innerHeight) {
        pos.vy = -Math.abs(pos.vy);
        nextY = window.innerHeight - size;
        bounced = true;
      }

      // Collision: Interactive Cards
      const cards = document.querySelectorAll('.welcome-card');
      for (let i = 0; i < cards.length; i++) {
        const rect = cards[i].getBoundingClientRect();
        if (nextX + size > rect.left && nextX < rect.right && nextY + size > rect.top && nextY < rect.bottom) {
          const overlapLeft = (nextX + size) - rect.left;
          const overlapRight = rect.right - nextX;
          const overlapTop = (nextY + size) - rect.top;
          const overlapBottom = rect.bottom - nextY;

          if (Math.min(overlapLeft, overlapRight) < Math.min(overlapTop, overlapBottom)) {
            pos.vx *= -1;
            nextX = overlapLeft < overlapRight ? rect.left - size : rect.right;
          } else {
            pos.vy *= -1;
            nextY = overlapTop < overlapBottom ? rect.top - size : rect.bottom;
          }
          bounced = true;
        }
      }

      // Add slight randomness to bounce so it doesn't get stuck in a perfect loop
      if (bounced) {
        const angleVariation = (Math.random() - 0.5) * 0.4;
        const speed = Math.sqrt(pos.vx * pos.vx + pos.vy * pos.vy);
        let currentAngle = Math.atan2(pos.vy, pos.vx) + angleVariation;
        pos.vx = Math.cos(currentAngle) * speed;
        pos.vy = Math.sin(currentAngle) * speed;
      }

      pos.x = Math.max(0, Math.min(nextX, window.innerWidth - size));
      pos.y = Math.max(0, Math.min(nextY, window.innerHeight - size));

      // Original SVG points top-right (-45 deg). We offset the calculated movement angle by 45.
      const angle = Math.atan2(pos.vy, pos.vx) * (180 / Math.PI) + 45;
      rocketRef.current.style.transform = `translate(${pos.x}px, ${pos.y}px) rotate(${angle}deg)`;

      // Drop trail dots (sketched line look)
      if (frameCount % 14 === 0 && trailRef.current) {
        const dot = document.createElement("div");
        dot.className = "trail-dot";
        
        const speed = Math.sqrt(pos.vx * pos.vx + pos.vy * pos.vy);
        // Align exactly with the exhaust tip
        const tailX = pos.x + size / 2 - (pos.vx / speed) * 32;
        const tailY = pos.y + size / 2 - (pos.vy / speed) * 32;
        
        dot.style.left = `${tailX}px`;
        dot.style.top = `${tailY}px`;
        
        // Randomize length and angle slightly for a hand-drawn feel
        const dashLength = 6 + Math.random() * 6;
        dot.style.width = `${dashLength}px`;
        
        const moveAngle = Math.atan2(pos.vy, pos.vx) * (180 / Math.PI);
        const wobble = (Math.random() - 0.5) * 18;
        dot.style.transform = `translate(-50%, -50%) rotate(${moveAngle + wobble}deg)`;
        
        trailRef.current.appendChild(dot);
        
        setTimeout(() => {
          if (dot.parentNode) dot.parentNode.removeChild(dot);
        }, 2500);
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const styles = getStyles(COLORS);

  return (
    <div style={styles.page}>
      <style>{`
        .rocket-wrapper {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
          overflow: hidden;
        }
        .trail-dot {
          position: absolute;
          height: 3px;
          background: ${COLORS.inkSoft};
          border-radius: 4px;
          pointer-events: none;
          z-index: 1;
          animation: sketchFade 2.5s ease-in forwards;
        }
        .rocket-container {
          position: absolute;
          top: 0;
          left: 0;
          opacity: 0.85;
          will-change: transform;
          z-index: 2;
        }
        .rocket-svg {
          animation: wobble 4s ease-in-out infinite;
          filter: drop-shadow(0 6px 8px rgba(42, 51, 64, 0.1));
        }
        @keyframes sketchFade {
          0% { opacity: 0.45; }
          70% { opacity: 0.35; }
          100% { opacity: 0; }
        }
        @keyframes wobble {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(4deg); }
        }
        .welcome-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 40px;
          width: 100%;
          position: relative;
          z-index: 2;
        }
        .welcome-greeting {
          font-family: ${FONTS.display};
          font-size: clamp(32px, 5vw, 48px);
          font-weight: 800;
          color: ${COLORS.ink};
          text-align: center;
          margin: 0;
          animation: fadeDown 0.4s ease-out;
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .welcome-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
          width: 100%;
          max-width: 960px;
        }
        .welcome-card {
          background: ${COLORS.creamSoft};
          border: 1px solid ${COLORS.border};
          border-radius: 20px;
          padding: 56px 28px;
          font-family: ${FONTS.display};
          font-weight: 800;
          font-size: 22px;
          letter-spacing: 0.5px;
          color: ${COLORS.ink};
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
          min-height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .welcome-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 28px rgba(42, 51, 64, 0.12);
        }
        .welcome-card-signin { background: ${COLORS.yellow}; }
        .welcome-card-signin:hover { background: ${COLORS.yellowSoft}; }
        .welcome-card-create { background: ${COLORS.blue}; color: ${COLORS.creamSoft}; }
        .welcome-card-create:hover { background: ${COLORS.blueDark}; }
        .welcome-card-join { background: ${COLORS.sage}; color: ${COLORS.ink}; }
        .welcome-card-join:hover { background: ${COLORS.sageDark}; }

        @media (max-width: 768px) {
          .welcome-grid {
            grid-template-columns: 1fr;
            gap: 14px;
            max-width: 420px;
          }
          .welcome-card {
            min-height: 120px;
            padding: 36px 24px;
            font-size: 20px;
          }
        }
      `}</style>

      <div className="rocket-wrapper">
        <div ref={trailRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
        <div className="rocket-container" ref={rocketRef}>
          <svg className="rocket-svg" width="68" height="68" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" fill={COLORS.yellow} stroke={COLORS.yellowDark}/>
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" fill={COLORS.creamSoft} stroke={COLORS.blueDark}/>
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" fill={COLORS.coralSoft} stroke={COLORS.coralDark}/>
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" fill={COLORS.coralSoft} stroke={COLORS.coralDark}/>
            <circle cx="15" cy="9" r="2.5" fill={COLORS.blueSoft} stroke={COLORS.blueDark} />
          </svg>
        </div>
      </div>

      <div className="welcome-container">
        {user && (
          <h1 className="welcome-greeting">Hi {username}</h1>
        )}
        <div className="welcome-grid">
          {user ? (
            <button
              type="button"
              className="welcome-card welcome-card-signin"
              onClick={() => {
                if (window.confirm("Are you sure you want to sign out?")) {
                  onSignOut();
                }
              }}
            >
              SIGN OUT
            </button>
          ) : (
            <button
              type="button"
              className="welcome-card welcome-card-signin"
              onClick={onSignIn}
            >
              SIGN IN
            </button>
          )}
          <button
            type="button"
            className="welcome-card welcome-card-create"
            onClick={onCreate}
          >
            {user ? "HOME" : "CREATE GAME"}
          </button>
          <button
            type="button"
            className="welcome-card welcome-card-join"
            onClick={onJoin}
          >
            JOIN GAME
          </button>
        </div>
      </div>
    </div>
  );
}

const getStyles = (COLORS) => ({
  page: {
    position: "relative",
    overflow: "hidden",
    minHeight: "100vh",
    background: COLORS.cream,
    color: COLORS.ink,
    fontFamily: FONTS.body,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
});
