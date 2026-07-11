import React from "react";
import "./SplashScreen.css";

function SplashScreen({ isExiting = false }) {
  return (
    <div
      className={`slaite-splash ${
        isExiting ? "slaite-splash--exit" : ""
      }`}
      role="status"
      aria-label="Opening SLAiTe"
    >
      <div className="slaite-board">
        <div className="slaite-logo-stage">

          <div className="slaite-emblem">
            <div className="emblem-ring">
              <span className="emblem-s">S</span>
            </div>
          </div>

          <div className="slaite-brand">
            <span className="brand-sl">SL</span>
            <span className="brand-ai">Ai</span>
            <span className="brand-te">Te</span>
          </div>

          <div className="slaite-tagline">
            LEARN · UNDERSTAND · GROW
          </div>

        </div>
      </div>
    </div>
  );
}

export default SplashScreen;