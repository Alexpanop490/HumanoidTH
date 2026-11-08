import type { Metadata } from "next";
import YoutubeImportForm from "./YoutubeImportForm";

export const metadata: Metadata = {
  title: "YouTube Import Test",
  robots: { index: false, follow: false },
};

export default function YoutubeImportPage() {
  return (
    <section>
      <header style={{ marginBottom: 24 }}>
        <p style={{ color: "var(--accent)", fontSize: 12, fontWeight: 700, letterSpacing: 1, margin: "0 0 6px", textTransform: "uppercase" }}>
          Import test
        </p>
        <h1 style={{ margin: 0 }}>YouTube video importer</h1>
        <p style={{ color: "var(--text-secondary)", margin: "8px 0 0" }}>
          Search YouTube, import video metadata, and save it to the Humanoid video database.
        </p>
      </header>
      <YoutubeImportForm />
    </section>
  );
}
