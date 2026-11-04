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
  const router = useRouter();

  async function handlePull(formData: FormData) {
    await runDataPull(formData);
    setOpen(false);
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
              <label>
                Adapter
                <select name="adapter" defaultValue="OPENALEX" required>
                  <option value="OPENALEX">OpenAlex</option>
                  <option value="GITHUB">GitHub</option>
                  <option value="GDELT">GDELT</option>
                  <option value="YOUTUBE">YouTube</option>
                </select>
              </label>

              <label>
                Query
                <input
                  name="query"
                  type="text"
                  defaultValue="humanoid robot Thailand"
                  required
                />
              </label>

              <label>
                Limit
                <input
                  name="limit"
                  type="number"
                  defaultValue="10"
                  min="1"
                  max="50"
                  required
                />
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
