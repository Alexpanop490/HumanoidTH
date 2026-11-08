"use client";

import { FormEvent, useState } from "react";
import { ExternalLink, LoaderCircle, Youtube } from "lucide-react";
import styles from "./youtube-import.module.css";

type ImportedVideo = {
  id: string;
  title: string;
  url?: string;
  channel_title?: string | null;
  published_at?: string | null;
  duration_seconds?: number;
  category?: string;
  confidence?: number;
};

type ImportResult = {
  imported: number;
  videos: ImportedVideo[];
};

export default function YoutubeImportForm() {
  const [query, setQuery] = useState("humanoid robot Thailand");
  const [limit, setLimit] = useState(5);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/youtube/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "YouTube import failed.");
      }
      setResult(body as ImportResult);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "YouTube import failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.layout}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>YouTube search query</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={500}
            required
            placeholder="e.g. humanoid robot Thailand"
          />
        </label>
        <label className={styles.field}>
          <span>Maximum videos</span>
          <input
            type="number"
            min={1}
            max={50}
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
            required
          />
          <small>1–50 results per import</small>
        </label>
        <button className={styles.submit} disabled={pending || !query.trim()}>
          {pending ? <LoaderCircle className={styles.spinner} size={17} /> : <Youtube size={17} />}
          {pending ? "Importing..." : "Search and import videos"}
        </button>
        <p className={styles.help}>
          The Humanoid API server must be running with <code>YOUTUBE_API_KEY</code> configured. This imports metadata only; it does not download video files.
        </p>
      </form>

      {error && <div className={styles.error} role="alert">{error}</div>}

      {result && (
        <section className={styles.results} aria-live="polite">
          <div className={styles.resultHeading}>
            <h2>Import complete</h2>
            <span>{result.imported} video{result.imported === 1 ? "" : "s"} saved</span>
          </div>
          {result.videos.length ? (
            <ul className={styles.videoList}>
              {result.videos.map((video) => (
                <li className={styles.video} key={video.id}>
                  <div className={styles.videoDetails}>
                    <a href={video.url} target="_blank" rel="noreferrer">
                      {video.title} <ExternalLink size={14} aria-hidden="true" />
                    </a>
                    <p>
                      {[video.channel_title, video.category?.replaceAll("_", " "), video.duration_seconds ? `${video.duration_seconds}s` : null]
                        .filter(Boolean)
                        .join(" · ") || "Metadata imported"}
                    </p>
                  </div>
                  {typeof video.confidence === "number" && (
                    <span className={styles.confidence}>{Math.round(video.confidence * 100)}% match</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>No videos were returned. Try a different query.</p>
          )}
        </section>
      )}
    </div>
  );
}
