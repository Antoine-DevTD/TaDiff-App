import { notFound, redirect } from "next/navigation";
import { isResourceId } from "@/lib/resources-server";

export default async function LegacyResourceEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isResourceId(id)) notFound();
  redirect(`/resources/manage/${id}`);
}
