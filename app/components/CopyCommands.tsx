"use client";

import { useState } from "react";

interface CopyCommandsProps {
  commands: string[];
}

export default function CopyCommands({ commands }: CopyCommandsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = commands.join("\n");
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button 
      onClick={handleCopy}
      style={{
        background: copied ? "var(--success)" : "rgba(20, 53, 42, 0.6)",
        border: `1px solid ${copied ? "var(--success)" : "rgba(16, 185, 129, 0.3)"}`,
        color: copied ? "#ffffff" : "#10B981",
        padding: "4px 10px",
        fontSize: "11px",
        fontWeight: 700,
        borderRadius: "4px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        minHeight: "auto",
        display: "inline-flex",
        alignItems: "center"
      }}
    >
      {copied ? "Copied!" : "Copy all"}
    </button>
  );
}
