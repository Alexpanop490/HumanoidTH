import Link from "next/link";

export default function NotFound() {
  return (
    <div className="notfound-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .notfound-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 120px);
          padding: 24px;
          background: radial-gradient(circle at top right, rgba(25, 82, 60, 0.04), transparent 40%),
                      radial-gradient(circle at bottom left, rgba(212, 175, 55, 0.03), transparent 40%);
        }

        .notfound-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 48px 40px;
          max-width: 520px;
          width: 100%;
          box-shadow: 0 10px 30px rgba(18, 28, 23, 0.05);
          text-align: center;
        }

        .notfound-icon {
          font-size: 64px;
          margin-bottom: 20px;
          line-height: 1;
          display: inline-block;
          animation: float 4s ease-in-out infinite;
        }

        .notfound-title {
          font-size: 24px;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 12px 0;
          letter-spacing: -0.5px;
        }

        .notfound-message {
          font-size: 14.5px;
          color: var(--text-secondary);
          line-height: 1.6;
          margin: 0 0 32px 0;
        }

        .notfound-links {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
          margin-bottom: 24px;
        }

        .btn-home {
          background: var(--accent);
          color: #ffffff;
          border: 1px solid var(--accent);
          border-radius: 8px;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          justify-content: center;
          width: 100%;
          max-width: 280px;
        }

        .btn-home:hover {
          background: var(--accent-strong);
          border-color: var(--accent-strong);
          transform: translateY(-1px);
        }

        .suggested-title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: var(--text-secondary);
          margin-bottom: 12px;
        }

        .suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
        }

        .suggestion-chip {
          background: var(--surface-muted);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .suggestion-chip:hover {
          border-color: var(--accent);
          background: rgba(25, 82, 60, 0.05);
          color: var(--accent);
          transform: translateY(-0.5px);
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}} />

      <div className="notfound-card">
        <div className="notfound-icon">🤖</div>
        <h2 className="notfound-title">Resource Not Activated</h2>
        <p className="notfound-message">
          We searched the atlas, but this module could not be found or has not been activated in this workspace deployment yet.
        </p>

        <div className="notfound-links">
          <Link href="/" className="btn-home">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Return to Dashboard
          </Link>
        </div>

        <div style={{ marginTop: "32px", borderTop: "1px solid var(--border)", paddingTop: "24px" }}>
          <div className="suggested-title">Active Index Modules</div>
          <div className="suggestions">
            <Link href="/" className="suggestion-chip">Dashboard</Link>
            <Link href="/inventory" className="suggestion-chip">Robot Inventory</Link>
            <Link href="/contributions" className="suggestion-chip">Contributions</Link>
            <Link href="/database" className="suggestion-chip">Atlas DB Schema</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
