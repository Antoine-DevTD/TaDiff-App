import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { ResourceEditor } from "@/components/resources/resource-editor";
import { canEditResources, getResourcePage, isResourceId, listResourceAssets } from "@/lib/resources-server";

export const dynamic = "force-dynamic";

export default async function ResourceEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isResourceId(id) || !(await canEditResources())) notFound();
  const [page, assets] = await Promise.all([getResourcePage(id), listResourceAssets(id)]);
  if (page.error || assets.error) {
    return <section className="space-y-4"><h1 className="text-2xl font-semibold">La ressource n’a pas pu être chargée</h1><p role="alert" className="text-sm text-muted">{page.error ?? assets.error} Aucun changement n’a été effectué.</p><ButtonLink href={`/resources/manage/${id}`} variant="secondary">Réessayer</ButtonLink><ButtonLink href="/resources/manage" variant="ghost">Retour aux ressources</ButtonLink></section>;
  }
  if (!page.data) notFound();
  if (page.data.archived_at) return <section className="mx-auto max-w-xl space-y-4 py-10"><h1 className="text-2xl font-semibold">Cette page est archivée</h1><p className="text-muted">Son contenu est conservé. Restaurez-la depuis les archives pour reprendre l’édition.</p><ButtonLink href="/resources/manage" variant="secondary">Retour aux pages</ButtonLink></section>;
  return <ResourceEditor initialPage={page.data} initialAssets={assets.data} />;
}
