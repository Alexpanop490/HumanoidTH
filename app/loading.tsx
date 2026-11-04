"use client";

import { Ring } from "@/components/loading-ui/ring";

export function RingDemo() {
  return <Ring className="size-16" />;
}

export default function Loading() {
  return (
    <div style={{ display: "flex", minHeight: "90vh", width: "100%", alignItems: "center", justifyContent: "center" }}>
      <RingDemo />
    </div>
  );
}
