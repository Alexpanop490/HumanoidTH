"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { DatabaseZap, Loader2 } from "lucide-react";
import { runDataPull } from "@/app/actions";

function PullDialogSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-busy={pending} style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 38 }}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" size={16} />
          <span>Pulling...</span>
        </>
      ) : (
        "Run pull"
      )}
    </button>
  );
}

export default function DataPullFab() {
  const [open, setOpen] = useState(false);
  const [adapter, setAdapter] = useState("OPENALEX");
  const [query, setQuery] = useState("humanoid robot Thailand");
  const [limit, setLimit] = useState("10");
  const [pullResult, setPullResult] = useState<Awaited<ReturnType<typeof runDataPull>> | null>(null);
  const router = useRouter();

  async function handlePull(formData: FormData) {
    setPullResult(null);
    const result = await runDataPull(formData);
    setPullResult(result);
    router.refresh();
  }

  return (
    <>
      <button
        className="data-pull-fab pointer"
        aria-label="Run data pull"
        onClick={() => setOpen(true)}
        title="Run data pull"
      >
        <DatabaseZap size={22} aria-hidden="true" />
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <h2>
              <DatabaseZap size={20} style={{ color: "var(--warning)" }} />
              Run data pull
            </h2>
            
            <form action={handlePull} className="form">
              {pullResult && (
                <p role="status" aria-live="polite" className={pullResult.status === "FAILED" ? "notice" : "muted"}>
                  {pullResult.status === "FAILED"
                    ? `Pull failed: ${pullResult.errorMessage}`
                    : pullResult.status === "SKIPPED_MISSING_KEY"
                      ? `Pull skipped: ${pullResult.errorMessage}`
                      : pullResult.recordsAnalyzed !== undefined
                        ? `Analyzed ${pullResult.recordsAnalyzed} videos; ${pullResult.confirmedHumanoidVideos ?? 0} visually confirmed humanoid detections. ${pullResult.recordsSaved} source records saved.`
                        : `Pull complete: ${pullResult.recordsFound} records found; ${pullResult.recordsSaved} saved.`}
                </p>
              )}
              <label>
                Adapter
                <select
                  name="adapter"
                  value={adapter}
                  onChange={(event) => {
                    const nextAdapter = event.currentTarget.value;
                    setAdapter(nextAdapter);
                    if (nextAdapter === "YOUTUBE") {
                      setQuery((current) => /\bhumanoid\s+robots?\b/i.test(current) ? current : `${current.trim()} humanoid robot`.trim());
                      setLimit((current) => String(Math.min(Number(current) || 3, 3)));
                    }
                  }}
                  required
                >
                  <option value="OPENALEX">OpenAlex</option>
                  <option value="GITHUB">GitHub</option>
                  <option value="GDELT">GDELT</option>
                  <option value="YOUTUBE">YouTube</option>
                  <option value="THAIJO">ThaiJO</option>
                </select>
              </label>

              <label>
                Query
                <input
                  name="query"
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.currentTarget.value)}
                  required
                />
              </label>

              <label>
                Limit
                <input
                  name="limit"
                  type="number"
                  value={limit}
                  onChange={(event) => setLimit(event.currentTarget.value)}
                  min="1"
                  max={adapter === "YOUTUBE" ? "3" : "50"}
                  required
                />
                {adapter === "YOUTUBE" && <small>Each pull analyzes up to 3 matching videos with OpenCV and Ollama.</small>}
              </label>

              <div className="modal-actions">
                <button type="button" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <PullDialogSubmitButton />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
