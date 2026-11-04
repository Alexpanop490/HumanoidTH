import type { Metadata } from "next";
import { redirect } from "next/navigation";

type SearchParams = Promise<{ selectedId?: string }>;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Submitted Data Review",
  robots: { index: false, follow: false }
};

export default async function AdminSubmittedDataRedirect({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const selected = params.selectedId ? `&selectedId=${encodeURIComponent(params.selectedId)}` : "";
  redirect(`/admin?collection=submitted-data${selected}`);
}
