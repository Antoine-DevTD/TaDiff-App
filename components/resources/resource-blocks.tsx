import { ArrowUpRight, Download, FileText, ImageIcon, Play } from "lucide-react";
import { resourceAssetUrl, resourceVideoEmbed, safeResourceLink } from "@/lib/resources";
import type { ResourceBlock, ResourceImage } from "@/types/resources";

const actionClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold !text-white hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60";

export function resourceHeadingId(id: string) {
  return `resource-section-${id}`;
}

function ResourcePicture({ assetId, alt, caption, preview }: ResourceImage & { preview: boolean }) {
  if (!assetId) return preview ? <div className="flex min-h-40 items-center justify-center gap-2 rounded-md border border-dashed border-border bg-panel-strong p-5 text-sm text-muted"><ImageIcon aria-hidden="true" className="h-5 w-5" />Ajoutez une image dans ce bloc</div> : null;
  return (
    <figure className="min-w-0">
      {/* Protected assets must be fetched in the reader's session, without an image-optimizer cache. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={resourceAssetUrl(assetId)} alt={alt} loading="lazy" className="max-h-[40rem] w-full rounded-md object-contain" />
      {caption ? <figcaption className="mt-2 text-sm leading-6 text-muted">{caption}</figcaption> : null}
    </figure>
  );
}

function BlockContent({ block, preview }: { block: ResourceBlock; preview: boolean }) {
  switch (block.type) {
    case "heading": {
      const Heading = block.level === 3 ? "h3" : "h2";
      return <Heading id={resourceHeadingId(block.id)} className={`scroll-mt-24 font-semibold leading-tight tracking-tight ${block.level === 3 ? "text-xl" : "text-2xl @[640px]:text-[1.75rem]"}`}>{block.text || (preview ? "Votre titre" : "")}</Heading>;
    }
    case "text":
      return <div className="max-w-[72ch] space-y-4 text-base leading-7">{(block.text || (preview ? "Votre texte apparaîtra ici." : "")).split(/\n\s*\n/).map((paragraph, index) => <p key={index} className="whitespace-pre-line">{paragraph}</p>)}</div>;
    case "image":
      return <ResourcePicture {...block} preview={preview} />;
    case "gallery":
      return <div className="grid min-w-0 gap-4 @[640px]:grid-cols-2">{block.images.length ? block.images.map((picture, index) => <ResourcePicture key={`${picture.assetId}-${index}`} {...picture} preview={preview} />) : preview ? <ResourcePicture assetId={null} alt="" caption="" preview /> : null}</div>;
    case "link": {
      const href = safeResourceLink(block.url);
      return preview || !href ? <button type="button" disabled className={actionClass}>{block.label || "Votre lien"}<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></button> : <a href={href} className={actionClass} {...(href.startsWith("https://") || href.startsWith("http://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{block.label}<ArrowUpRight aria-hidden="true" className="h-4 w-4" />{href.startsWith("http") ? <span className="sr-only"> (nouvel onglet)</span> : null}</a>;
    }
    case "file":
      return <div className="flex flex-wrap items-center gap-4 rounded-md bg-panel-strong p-4 @[640px]:p-5"><FileText aria-hidden="true" className="h-8 w-8 shrink-0 text-accent" /><div className="min-w-0 flex-1 basis-40"><p className="font-semibold">{block.label || "Votre document"}</p>{block.description ? <p className="mt-1 text-sm leading-6 text-muted">{block.description}</p> : null}</div>{preview || !block.assetId ? <button type="button" disabled className={`${actionClass} w-full @[640px]:w-auto`}><Download aria-hidden="true" className="h-4 w-4" />Télécharger</button> : <a href={resourceAssetUrl(block.assetId, true)} className={`${actionClass} w-full @[640px]:w-auto`}><Download aria-hidden="true" className="h-4 w-4" />Télécharger<span className="sr-only"> : {block.label}</span></a>}</div>;
    case "video": {
      const src = resourceVideoEmbed(block.url);
      return preview || !src ? <div className="flex aspect-video items-center justify-center gap-3 rounded-md bg-panel-strong p-6 text-muted"><Play aria-hidden="true" className="h-6 w-6" /><p>{block.title || "Votre vidéo"}{preview ? <span className="mt-1 block text-sm">Lecture disponible dans la page publiée.</span> : <span className="mt-1 block text-sm">Cette vidéo n’est pas disponible.</span>}</p></div> : <iframe src={src} title={block.title || "Vidéo de la ressource"} loading="lazy" allow="fullscreen; picture-in-picture" allowFullScreen referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-presentation" className="aspect-video w-full rounded-md border-0" />;
    }
    case "columns":
      return <div className={`grid min-w-0 gap-6 ${block.ratio === "wide-left" ? "@[768px]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : block.ratio === "wide-right" ? "@[768px]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]" : "@[768px]:grid-cols-2"}`}>{block.columns.map((blocks, index) => <ResourceBlocks key={index} blocks={blocks} preview={preview} />)}</div>;
  }
}

export function ResourceBlocks({ blocks, preview = false }: { blocks: ResourceBlock[]; preview?: boolean }) {
  return <div className="@container min-w-0 space-y-6 [overflow-wrap:anywhere]">{blocks.map((block) => <div key={block.id} className={`${block.type === "heading" ? "pt-3" : ""} ${block.tone === "soft" ? "rounded-md bg-panel-strong p-5" : block.tone === "accent" ? "rounded-md border border-accent/30 bg-accent/5 p-5" : ""}`}><BlockContent block={block} preview={preview} /></div>)}</div>;
}
