import React from "react";

export function Ring({ className = "", color = "#052e16" }: { className?: string; color?: string }) {
  return (
    <div className={`ring-container ${className}`} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "64px", height: "64px" }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 50 50"
        xmlns="http://www.w3.org/2000/svg"
        stroke={color}
      >
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          className="ring-circle"
        />
      </svg>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ring-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ring-dash {
          0% {
            stroke-dasharray: 1, 150;
            stroke-dashoffset: 0;
          }
          50% {
            stroke-dasharray: 90, 150;
            stroke-dashoffset: -35;
          }
          100% {
            stroke-dasharray: 90, 150;
            stroke-dashoffset: -124;
          }
        }
        .ring-container svg {
          animation: ring-spin 2s linear infinite;
        }
        .ring-circle {
          animation: ring-dash 1.5s ease-in-out infinite;
        }
      `}} />
    </div>
  );
}
