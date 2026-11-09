import type { Metadata } from "next";
import { ResourceLibrary } from "@/components/resources/resource-library";
import { listPublishedResources } from "@/lib/resources-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = { title: "Ressources", description: "Des ressources pour administrer, produire et diffuser vos spectacles.", robots: { index: false, follow: false } };

export default async function PublicResourcesPage() {
  const result = await listPublishedResources();
  // Even a logged-in visitor sees only public documents in this public index.
  const resources = result.data.filter((resource) => resource.document.visibility === "public");
  return <ResourceLibrary resources={resources} error={result.error} publicOnly />;
}
