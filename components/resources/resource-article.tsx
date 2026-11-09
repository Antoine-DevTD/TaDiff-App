import Link from "next/link";
import { ArrowLeft, ChevronDown, Globe2, LockKeyhole } from "lucide-react";
import { resourceAssetUrl } from "@/lib/resources";
import type { PublishedResource, ResourceBlock } from "@/types/resources";
import { ResourceBlocks, resourceHeadingId } from "./resource-blocks";

function collectHeadings(blocks: ResourceBlock[]): Extract<ResourceBlock, { type: "heading" }>[] {
  return blocks.flatMap((block) => block.type === "heading" && block.text.trim() ? [block] : block.type === "columns" ? block.columns.flatMap(collectHeadings) : []);
}

export function ResourceVisibilityLabel({ visibility }: { visibility: "public" | "members" }) {
  const Icon = visibility === "members" ? LockKeyhole : Globe2;
  return <span className="inline-flex items-center gap-2 text-xs font-medium text-muted"><Icon aria-hidden="true" className="h-4 w-4 shrink-0" />{visibility === "members" ? "Membres TaDiff" : "Accès public"}</span>;
}

export function ResourceArticle({ resource, preview = false }: { resource: PublishedResource; preview?: boolean }) {
  const { document } = resource;
  const headings = collectHeadings(document.blocks);
  const contents = <ol className="space-y-1">{headings.map((heading) => <li key={heading.id}><a href={`#${resourceHeadingId(heading.id)}`} className={`block rounded-sm py-3 text-sm leading-5 !text-muted hover:!text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${heading.level === 3 ? "pl-4" : ""}`}>{heading.text}</a></li>)}</ol>;
  return (
    <article className="@container min-w-0 bg-panel text-foreground [overflow-wrap:anywhere]">
      {!preview ? <nav aria-label="Fil d’Ariane" className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted"><Link href={document.visibility === "members" ? "/resources" : "/ressources"} className="inline-flex min-h-11 items-center gap-2 hover:!text-accent focus-visible:outline-2 focus-visible:outline-accent"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Ressources</Link>{document.category ? <><span aria-hidden="true">/</span><span>{document.category}</span></> : null}</nav> : null}
      <header className="mb-8">
        <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-3">{document.category ? <p className="text-xs font-semibold uppercase tracking-wide text-accent">{document.category}</p> : null}<ResourceVisibilityLabel visibility={document.visibility} /></div>
        <h1 className="max-w-5xl text-3xl font-semibold leading-[1.12] tracking-tight @[640px]:text-4xl @[960px]:text-5xl">{document.title || "Le titre de votre page"}</h1>
        {document.description ? <p className="mt-4 max-w-[72ch] text-base leading-7 text-muted @[640px]:text-lg">{document.description}</p> : null}
      </header>
      {document.coverAssetId ? <div className="mb-8 overflow-hidden rounded-md">
        {/* Session-protected files intentionally bypass the shared image optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={resourceAssetUrl(document.coverAssetId)} alt="" className="max-h-[30rem] w-full object-cover" />
      </div> : null}
      <div className={`grid min-w-0 gap-8 ${headings.length ? "@[960px]:grid-cols-[13rem_minmax(0,1fr)] @[960px]:gap-10" : ""}`}>
        {headings.length ? <>
          <details className="rounded-md border border-border @[960px]:hidden"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-accent">Dans cette page<ChevronDown aria-hidden="true" className="h-4 w-4" /></summary><nav aria-label="Sommaire" className="border-t border-border px-4 pb-2">{contents}</nav></details>
          <aside className="hidden self-start border-r border-border pr-7 @[960px]:sticky @[960px]:top-8 @[960px]:block"><nav aria-label="Sommaire"><h2 className="mb-2 text-base font-semibold">Dans cette page</h2>{contents}</nav></aside>
        </> : null}
        <div className="min-w-0">{document.blocks.length ? <ResourceBlocks blocks={document.blocks} preview={preview} /> : <p className="py-8 text-muted">{preview ? "Ajoutez des blocs pour composer votre page." : "Cette page ne contient pas encore de ressource."}</p>}</div>
      </div>
      {!preview ? <footer className="mt-12 border-t border-border pt-6"><Link href={document.visibility === "members" ? "/resources" : "/ressources"} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold !text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Toutes les ressources</Link></footer> : null}
    </article>
  );
}
