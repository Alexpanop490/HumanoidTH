"use client";

import { useEffect, useState } from "react";

export default function FirstTimeLoader() {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    setMounted(true);
    const hasLoaded = sessionStorage.getItem("th_atlas_loaded_before");
    if (!hasLoaded) {
      setShow(true);
      // Run progress bar animation
      const duration = 1800; // 1.8 seconds (fast, premium, non-blocking)
      const intervalTime = 30;
      const steps = duration / intervalTime;
      const increment = 100 / steps;

      let currentProgress = 0;
      const timer = setInterval(() => {
        currentProgress += increment;
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(timer);
          // Wait briefly at 100% then start fadeOut
          setTimeout(() => {
            setFadeOut(true);
            // Fully remove loader after animation finishes
            setTimeout(() => {
              setShow(false);
              sessionStorage.setItem("th_atlas_loaded_before", "true");
            }, 500);
          }, 200);
        }
        setProgress(Math.round(currentProgress));
      }, intervalTime);

      return () => clearInterval(timer);
    }
  }, []);

  if (!mounted || !show) return null;

  const getStatusText = (prog: number) => {
    if (prog < 25) return "CONNECTING";
    if (prog < 50) return "INDEXING ECOSYSTEM";
    if (prog < 75) return "CALIBRATING SOLVERS";
    if (prog < 95) return "SYNCHRONIZING";
    return "READY";
  };

  return (
    <div className={`splash-screen ${fadeOut ? "fade-out" : ""}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        .splash-screen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: radial-gradient(circle at center, #06110c 0%, #010302 100%);
          z-index: 99999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-family: var(--font-sans);
          transition: opacity 0.5s cubic-bezier(0.25, 1, 0.5, 1), transform 0.5s cubic-bezier(0.25, 1, 0.5, 1);
          overflow: hidden;
        }

        .splash-screen.fade-out {
          opacity: 0;
          transform: scale(1.02);
          pointer-events: none;
        }

        .splash-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 28px;
          z-index: 2;
        }

        .logo-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 180px;
          height: 180px;
        }

        .glow-ring {
          position: absolute;
          width: 140px;
          height: 140px;
          border: 1px solid rgba(52, 211, 153, 0.08);
          border-top: 1.5px solid rgba(52, 211, 153, 0.45);
          border-radius: 50%;
          animation: ring-spin 2.5s cubic-bezier(0.4, 0.1, 0.2, 1) infinite;
        }

        .inner-glow-ring {
          position: absolute;
          width: 115px;
          height: 115px;
          border: 1px dashed rgba(226, 168, 41, 0.08);
          border-radius: 50%;
          animation: ring-reverse-spin 6s linear infinite;
        }

        .splash-logo {
          width: 85px;
          height: auto;
          object-fit: contain;
          filter: drop-shadow(0 0 10px rgba(52, 211, 153, 0.2));
          animation: float-logo 4s ease-in-out infinite;
          z-index: 2;
        }

        .splash-glow {
          position: absolute;
          width: 160px;
          height: 160px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%);
          animation: pulse-glow 3s infinite ease-in-out;
          z-index: 0;
        }

        .titles-wrapper {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .splash-brand {
          font-size: 10px;
          letter-spacing: 5px;
          text-transform: uppercase;
          color: #708a7b;
          font-weight: 700;
          margin: 0;
        }

        .splash-title {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #ffffff;
          margin: 0;
        }

        .splash-title span {
          color: #e2a829;
          font-weight: 700;
        }

        .progress-section {
          width: 240px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .progress-track {
          width: 100%;
          height: 2px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 1px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #34d399);
          box-shadow: 0 0 4px rgba(52, 211, 153, 0.4);
          transition: width 0.03s linear;
        }

        .status-row {
          display: flex;
          justify-content: space-between;
          width: 100%;
          font-size: 8.5px;
          font-family: monospace;
          color: #556c60;
          letter-spacing: 1px;
          font-weight: 600;
        }

        @keyframes ring-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes ring-reverse-spin {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }

        @keyframes float-logo {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        @keyframes pulse-glow {
          0%, 100% { transform: scale(0.95); opacity: 0.7; }
          50% { transform: scale(1.05); opacity: 1; }
        }
      `}} />

      <div className="splash-content">
        <div className="logo-wrapper">
          <div className="splash-glow" />
          <div className="glow-ring" />
          <div className="inner-glow-ring" />
          <img src="/logo.png" alt="Thailand Humanoid Atlas" className="splash-logo" />
        </div>

        <div className="titles-wrapper">
          <p className="splash-brand">Thailand Humanoid</p>
          <h1 className="splash-title">Ecosystem <span>Atlas</span></h1>
        </div>

        <div className="progress-section">
          <div className="progress-track">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="status-row">
            <span>{getStatusText(progress)}</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
