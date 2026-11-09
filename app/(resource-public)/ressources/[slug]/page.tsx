import type { Metadata } from "next";
import { ResourceArticle } from "@/components/resources/resource-article";
import { ResourceLibrary } from "@/components/resources/resource-library";
import { ButtonLink } from "@/components/ui/button";
import { getPublishedResource } from "@/lib/resources-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
// No title, summary or cover from a member-only page is emitted in metadata.
export const metadata: Metadata = { title: "Ressource", robots: { index: false, follow: false } };

export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getPublishedResource(slug);
  if (result.error) return <ResourceLibrary resources={[]} error={result.error} publicOnly />;
  if (!result.data) return <section className="mx-auto max-w-xl py-12"><h1 className="text-2xl font-semibold">Cette ressource n’est pas accessible</h1><p className="mt-4 text-sm leading-7 text-muted">Elle peut être réservée aux membres TaDiff ou ne plus être disponible. Connectez-vous à un espace actif pour consulter les ressources membres.</p><div className="mt-6 flex flex-wrap gap-3"><ButtonLink href={`/login?next=${encodeURIComponent(`/ressources/${slug}`)}`}>Se connecter</ButtonLink><ButtonLink href="/ressources" variant="secondary">Voir les ressources publiques</ButtonLink></div></section>;
  return <ResourceArticle resource={result.data} />;
}
