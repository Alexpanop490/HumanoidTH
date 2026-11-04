import React from "react";

export function DotsRing({ className = "", color = "#052e16" }: { className?: string; color?: string }) {
  return (
    <div className={`dots-ring-container ${className}`} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "64px", height: "64px" }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        fill={color}
      >
        <circle cx="50" cy="15" r="7" className="dot-1" />
        <circle cx="75" cy="25" r="7" className="dot-2" />
        <circle cx="85" cy="50" r="7" className="dot-3" />
        <circle cx="75" cy="75" r="7" className="dot-4" />
        <circle cx="50" cy="85" r="7" className="dot-5" />
        <circle cx="25" cy="75" r="7" className="dot-6" />
        <circle cx="15" cy="50" r="7" className="dot-7" />
        <circle cx="25" cy="25" r="7" className="dot-8" />
      </svg>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes dots-ring-fade-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .dots-ring-container svg {
          animation: dots-ring-fade-spin 1.2s linear infinite;
        }
        .dot-1 { opacity: 0.15; }
        .dot-2 { opacity: 0.3; }
        .dot-3 { opacity: 0.45; }
        .dot-4 { opacity: 0.6; }
        .dot-5 { opacity: 0.75; }
        .dot-6 { opacity: 0.9; }
        .dot-7 { opacity: 1; }
        .dot-8 { opacity: 0.15; }
      `}} />
    </div>
  );
}
