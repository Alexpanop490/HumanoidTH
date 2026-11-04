"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error details
    console.error("Application error boundary caught error:", error);
  }, [error]);

  return (
    <div className="error-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .error-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 44px);
          padding: 24px;
          background: radial-gradient(circle at top right, rgba(25, 82, 60, 0.05), transparent 40%),
                      radial-gradient(circle at bottom left, rgba(212, 175, 55, 0.03), transparent 40%);
        }

        .error-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 40px;
          max-width: 540px;
          width: 100%;
          box-shadow: 0 10px 30px rgba(18, 28, 23, 0.06);
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .error-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--danger) 0%, #e05e55 100%);
        }

        .error-icon-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #fbf1f0;
          color: var(--danger);
          margin-bottom: 24px;
          animation: pulse 2s infinite ease-in-out;
        }

        .error-icon {
          width: 40px;
          height: 40px;
        }

        .error-title {
          font-size: 22px;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 12px 0;
          letter-spacing: -0.5px;
        }

        .error-message {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.6;
          margin: 0 0 28px 0;
        }

        .error-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-bottom: 28px;
        }

        .btn-reset {
          background: var(--accent);
          color: #ffffff;
          border: 1px solid var(--accent);
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .btn-reset:hover {
          background: var(--accent-strong);
          border-color: var(--accent-strong);
          transform: translateY(-1px);
        }

        .btn-home {
          background: var(--surface);
          color: var(--text-primary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .btn-home:hover {
          background: var(--surface-muted);
          transform: translateY(-1px);
        }

        .error-details {
          text-align: left;
          background: var(--surface-muted);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
          font-size: 12px;
        }

        .error-details-summary {
          font-weight: 700;
          color: var(--text-primary);
          cursor: pointer;
          outline: none;
          user-select: none;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .error-details-content {
          margin-top: 10px;
          font-family: var(--font-sans);
          color: var(--text-secondary);
          word-break: break-all;
          white-space: pre-wrap;
          line-height: 1.5;
        }

        .digest-badge {
          display: inline-block;
          background: #eef2f6;
          border: 1px solid #d0deec;
          color: #3b6b9c;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: var(--font-sans);
          font-size: 11px;
          margin-top: 4px;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); box-shadow: 0 0 0 8px rgba(156, 46, 38, 0.06); }
        }
      `}} />

      <div className="error-card">
        <div className="error-icon-wrap">
          <svg className="error-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h2 className="error-title">Application Exception Encountered</h2>
        <p className="error-message">
          The server encountered an unexpected error while loading this page. This could be due to a database offline status, missing environment configurations, or session expiration.
        </p>

        <div className="error-actions">
          <button onClick={() => reset()} className="btn-reset">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
            </svg>
            Try Again
          </button>
          <Link href="/" className="btn-home">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 00-1-1h-2a1 1 0 00-1 1v4a1 1 0 001 1m6 0v-4a1 1 0 00-1-1h-2a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go to Atlas Home
          </Link>
        </div>

        <details className="error-details">
          <summary className="error-details-summary">
            <span>Diagnostics & Error Metadata</span>
          </summary>
          <div className="error-details-content">
            <strong>Message:</strong> {error.message || "An unexpected server-side exception occurred."}
            {error.digest && (
              <div>
                <strong>Digest Hash:</strong> <span className="digest-badge">{error.digest}</span>
              </div>
            )}
            <div style={{ marginTop: "12px", fontSize: "10px", color: "var(--text-secondary)" }}>
              Please report the diagnostic digest hash to your platform administrator to inspect system logs.
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
