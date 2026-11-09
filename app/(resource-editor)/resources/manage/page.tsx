import { notFound } from "next/navigation";
import { ResourceManager } from "@/components/resources/resource-manager";
import { hasSupabaseEnv } from "@/lib/env";
import { canEditResources, listResourcePages } from "@/lib/resources-server";

export const dynamic = "force-dynamic";

export default async function ResourceManagementPage() {
  if (hasSupabaseEnv() && !(await canEditResources())) notFound();
  const result = await listResourcePages();
  return <ResourceManager pages={result.data} error={result.error} />;
}
