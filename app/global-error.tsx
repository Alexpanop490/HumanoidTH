"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Global error boundary caught error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="global-error-body">
        <style dangerouslySetInnerHTML={{ __html: `
          body {
            margin: 0;
            padding: 0;
            background: #f4f6f4;
            color: #121c17;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            box-sizing: border-box;
          }

          .error-wrapper {
            padding: 24px;
            width: 100%;
            max-width: 500px;
          }

          .error-card {
            background: #ffffff;
            border: 1px solid #cad4cd;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 10px 30px rgba(18, 28, 23, 0.08);
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
            background: linear-gradient(90deg, #9c2e26 0%, #e05e55 100%);
          }

          .icon-container {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 72px;
            height: 72px;
            border-radius: 50%;
            background: #fbf1f0;
            color: #9c2e26;
            margin-bottom: 24px;
          }

          .icon {
            width: 36px;
            height: 36px;
          }

          h1 {
            font-size: 20px;
            font-weight: 800;
            margin: 0 0 12px 0;
            letter-spacing: -0.5px;
          }

          p {
            font-size: 13.5px;
            color: #56645c;
            line-height: 1.6;
            margin: 0 0 28px 0;
          }

          .btn-retry {
            background: #19523c;
            color: #ffffff;
            border: none;
            border-radius: 8px;
            padding: 12px 24px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 4px rgba(25, 82, 60, 0.15);
          }

          .btn-retry:hover {
            background: #0f3627;
            transform: translateY(-1px);
          }

          .diagnostic-info {
            margin-top: 28px;
            text-align: left;
            background: #e9ede9;
            border: 1px solid #cad4cd;
            border-radius: 8px;
            padding: 14px;
            font-size: 11.5px;
          }

          .diagnostic-title {
            font-weight: 700;
            margin-bottom: 6px;
            color: #121c17;
          }

          .digest-tag {
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            background: #dce3dc;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
            color: #0b1a15;
            display: inline-block;
            margin-top: 4px;
          }
        `}} />

        <div className="error-wrapper">
          <div className="error-card">
            <div className="icon-container">
              <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h1>Critical Application Exception</h1>
            <p>
              A fundamental system component encountered an unrecoverable failure. This may be caused by a configuration mismatch or database outage in the deployment environment.
            </p>

            <button onClick={() => reset()} className="btn-retry">
              Recover Application
            </button>

            <div className="diagnostic-info">
              <div className="diagnostic-title">System Logs Diagnostic Info</div>
              <div>{error.message || "Root layout rendering failure"}</div>
              {error.digest && (
                <div>
                  <strong>Diagnostic Digest:</strong> <span className="digest-tag">{error.digest}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
