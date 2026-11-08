"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Search, Settings2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { resourceAssetUrl } from "@/lib/resources";
import type { PublishedResource } from "@/types/resources";
import { ResourceVisibilityLabel } from "./resource-article";

function searchKey(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
}

function ResourceCard({ resource, featured = false }: { resource: PublishedResource; featured?: boolean }) {
  const { document } = resource;
  const Heading = featured ? "h2" : "h3";
  return <article className={`overflow-hidden rounded-lg border border-border bg-panel ${featured && document.coverAssetId ? "grid md:grid-cols-2" : "flex flex-col"}`}>
    {document.coverAssetId ? <div className={featured ? "order-first md:order-last" : "p-2 pb-0"}>
      {/* Read through the authenticated file endpoint, never an optimizer cache. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={resourceAssetUrl(document.coverAssetId)} alt="" loading="lazy" className={featured ? "h-48 w-full object-cover md:h-full md:min-h-64" : "h-40 w-full rounded object-cover"} />
    </div> : null}
    <div className={`flex min-w-0 flex-1 flex-col items-start ${featured ? "p-6 sm:p-8" : "p-5"}`}>
      {featured ? <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-accent">À la une</p> : document.category ? <p className="mb-2 text-xs font-medium text-muted">{document.category}</p> : null}
      <Heading className={`font-semibold leading-snug tracking-tight ${featured ? "text-2xl" : "text-lg"}`}>{document.title}</Heading>
      {document.description ? <p className="mt-2 text-sm leading-6 text-muted">{document.description}</p> : null}
      <div className="mt-5"><ResourceVisibilityLabel visibility={document.visibility} /></div>
      <Link href={`/ressources/${document.slug}`} prefetch={false} className={`mt-auto inline-flex min-h-11 items-center gap-2 rounded-md pt-4 text-sm font-semibold !text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${featured ? "mt-5 bg-accent px-4 py-2 !text-white hover:bg-accent-strong hover:no-underline" : ""}`}>{featured ? "Lire la ressource" : "Consulter"}<ArrowRight aria-hidden="true" className="h-4 w-4" /><span className="sr-only"> : {document.title}</span></Link>
    </div>
  </article>;
}

export function ResourceLibrary({ resources, error = null, canEdit = false, publicOnly = false }: { resources: PublishedResource[]; error?: string | null; canEdit?: boolean; publicOnly?: boolean }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [refreshing, startTransition] = useTransition();
  const router = useRouter();
  const visible = publicOnly ? resources.filter((resource) => resource.document.visibility === "public") : resources;
  const categories = [...new Set(visible.map((resource) => resource.document.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
  const normalizedQuery = searchKey(query.trim());
  const filtered = visible.filter(({ document }) => (!category || document.category === category) && (!normalizedQuery || searchKey(`${document.title} ${document.description} ${document.category}`).includes(normalizedQuery)));
  const featured = !query.trim() && !category ? filtered.find((resource) => resource.document.featured) : undefined;
  const cards = featured ? filtered.filter((resource) => resource.id !== featured.id) : filtered;
  return <section className="min-w-0 space-y-7 [overflow-wrap:anywhere]" aria-labelledby="resource-library-title">
    <header className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-3xl"><h1 id="resource-library-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">Ressources pour votre compagnie</h1><p className="mt-2 text-sm leading-6 text-muted sm:text-base">Des guides, des modèles et des outils pour avancer dans vos projets.</p></div>{canEdit ? <ButtonLink href="/resources/manage" variant="secondary" className="gap-2"><Settings2 aria-hidden="true" className="h-4 w-4" />Gérer les ressources</ButtonLink> : null}</header>
    {error ? <div role="alert" className="rounded-md border border-danger/30 bg-panel p-5"><h2 className="font-semibold">Les ressources ne sont pas disponibles</h2><p className="mt-2 text-sm leading-6 text-muted">Le chargement n’a pas abouti. Vous pouvez réessayer.</p><Button type="button" variant="secondary" className="mt-4" disabled={refreshing} onClick={() => startTransition(() => router.refresh())}>{refreshing ? "Chargement…" : "Réessayer"}</Button></div> : visible.length === 0 ? <div className="border-y border-border py-12 text-center"><BookOpen aria-hidden="true" className="mx-auto mb-4 h-8 w-8 text-accent" /><h2 className="text-lg font-semibold">Les premières ressources arrivent bientôt</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">{canEdit ? "Créez une page, ajoutez vos contenus et publiez-la pour la rendre accessible." : "Les pages publiées par l’équipe TaDiff seront réunies ici."}</p>{canEdit ? <ButtonLink href="/resources/manage" className="mt-5">Créer une ressource</ButtonLink> : publicOnly ? <ButtonLink href="/resources" variant="secondary" className="mt-5">Accéder aux ressources membres</ButtonLink> : null}</div> : <>
      <div className="flex flex-wrap items-center gap-3"><div className="relative min-w-0 flex-1 basis-72"><label htmlFor="resource-search" className="sr-only">Rechercher une ressource</label><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted" /><input id="resource-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une ressource" className="min-h-11 w-full rounded-md border border-border bg-panel py-2 pl-10 pr-3 text-sm placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" /></div>{categories.length ? <div role="group" aria-label="Filtrer par catégorie" className="flex max-w-full flex-wrap gap-2">{["", ...categories].map((item) => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)} className={`min-h-11 rounded-md border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${category === item ? "border-accent bg-accent !text-white" : "border-border bg-panel text-foreground hover:bg-panel-strong"}`}>{item || "Tout"}</button>)}</div> : null}</div>
      <p role="status" className="sr-only">{filtered.length} {filtered.length === 1 ? "ressource trouvée" : "ressources trouvées"}</p>
      {featured ? <ResourceCard resource={featured} featured /> : null}
      {cards.length ? <section aria-label={featured ? "À découvrir" : "Ressources"}>{featured ? <h2 className="mb-4 text-xl font-semibold">À découvrir</h2> : null}<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map((resource) => <ResourceCard key={resource.id} resource={resource} />)}</div></section> : !featured ? <div className="border-y border-border py-10"><h2 className="text-lg font-semibold">Aucune ressource ne correspond à votre recherche</h2><p className="mt-2 text-sm text-muted">Essayez un autre mot ou choisissez une autre catégorie.</p><Button type="button" variant="secondary" className="mt-4" onClick={() => { setQuery(""); setCategory(""); }}>Effacer les filtres</Button></div> : null}
    </>}
    {publicOnly && visible.length > 0 ? <p className="border-t border-border pt-5 text-sm leading-6 text-muted">Vous avez un compte TaDiff ? <Link href="/resources" className="font-semibold !text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">Retrouvez aussi les ressources réservées aux membres.</Link></p> : null}
  </section>;
}
