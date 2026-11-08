/* eslint-disable @next/next/no-img-element -- Resource files require the authenticated asset endpoint. */
"use client";

import { Children, cloneElement, isValidElement, useId, type ReactNode } from "react";
import { ImagePlus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { resourceAssetUrl, resourceVideoEmbed, safeResourceLink } from "@/lib/resources";
import type { ResourceAsset, ResourceBlock } from "@/types/resources";

export function EditorField({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  const id = useId();
  const controls = Children.toArray(children);
  const control = controls[0];
  return <div className="grid min-w-0 gap-1.5"><label htmlFor={id} className="text-sm font-medium">{label}</label>{isValidElement<{ id: string; "aria-describedby"?: string }>(control) ? cloneElement(control, { id, "aria-describedby": hint ? `${id}-hint` : undefined }) : control}{controls.slice(1)}{hint ? <p id={`${id}-hint`} className="text-xs font-normal leading-relaxed text-muted">{hint}</p> : null}</div>;
}

export function AssetField({ assetId, assets, onChoose, onRemove, label = "Image" }: { assetId: string | null; assets: ResourceAsset[]; onChoose: () => void; onRemove: () => void; label?: string }) {
  const asset = assets.find((item) => item.id === assetId);
  return <div className="min-w-0 space-y-2">
    <p className="text-sm font-medium">{label}</p>
    {assetId ? <div className="space-y-2 rounded-md border border-border p-2">{asset?.mime_type.startsWith("image/") ? <img src={resourceAssetUrl(assetId)} alt="" className="max-h-36 w-full rounded object-contain" /> : null}<p className="break-all text-xs text-muted">{asset?.name || "Fichier sélectionné"}</p><Button type="button" variant="ghost" onClick={onRemove} className="w-full"><X className="mr-1 size-4" aria-hidden="true" />Retirer</Button></div> : null}
    <Button type="button" variant="secondary" onClick={onChoose} className="w-full">{label === "Document" ? <Upload className="mr-2 size-4" aria-hidden="true" /> : <ImagePlus className="mr-2 size-4" aria-hidden="true" />}{assetId ? "Remplacer" : label === "Document" ? "Choisir un fichier" : "Choisir une image"}</Button>
  </div>;
}

export function ResourceBlockFields({ block, assets, onChange, onChooseAsset }: { block: ResourceBlock; assets: ResourceAsset[]; onChange: (next: ResourceBlock) => void; onChooseAsset: (kind: "image" | "file", apply: (asset: ResourceAsset) => void) => void }) {
  return <div className="space-y-5">
    {block.type === "heading" ? <>
      <EditorField label="Texte du titre"><Input value={block.text} maxLength={240} onChange={(event) => onChange({ ...block, text: event.target.value })} /></EditorField>
      <EditorField label="Niveau du titre"><Select value={block.level} onChange={(event) => onChange({ ...block, level: Number(event.target.value) as 2 | 3 })}><option value="2">Titre de section</option><option value="3">Sous-titre</option></Select></EditorField>
    </> : null}
    {block.type === "text" ? <EditorField label="Texte" hint="Les retours à la ligne sont conservés."><Textarea value={block.text} rows={10} maxLength={20000} onChange={(event) => onChange({ ...block, text: event.target.value })} /></EditorField> : null}
    {block.type === "image" ? <>
      <AssetField assetId={block.assetId} assets={assets} onChoose={() => onChooseAsset("image", (asset) => onChange({ ...block, assetId: asset.id }))} onRemove={() => onChange({ ...block, assetId: null })} />
      <EditorField label="Description de l’image" hint="Décrivez ce que montre l’image pour les personnes qui ne la voient pas."><Input value={block.alt} maxLength={240} onChange={(event) => onChange({ ...block, alt: event.target.value })} /></EditorField>
      <EditorField label="Légende"><Input value={block.caption} maxLength={500} onChange={(event) => onChange({ ...block, caption: event.target.value })} /></EditorField>
    </> : null}
    {block.type === "gallery" ? <>
      <p className="text-sm text-muted">Ajoutez jusqu’à 12 images. Leur ordre dans la liste est celui de la galerie.</p>
      {block.images.map((item, index) => <div key={index} className="space-y-3 border-b border-border pb-4">
        <AssetField label={`Image ${index + 1}`} assetId={item.assetId} assets={assets} onChoose={() => onChooseAsset("image", (asset) => onChange({ ...block, images: block.images.map((image, position) => position === index ? { ...image, assetId: asset.id } : image) }))} onRemove={() => onChange({ ...block, images: block.images.filter((_, position) => position !== index) })} />
        <EditorField label={`Description de l’image ${index + 1}`}><Input value={item.alt} maxLength={240} onChange={(event) => onChange({ ...block, images: block.images.map((image, position) => position === index ? { ...image, alt: event.target.value } : image) })} /></EditorField>
        <EditorField label={`Légende de l’image ${index + 1}`}><Input value={item.caption} maxLength={500} onChange={(event) => onChange({ ...block, images: block.images.map((image, position) => position === index ? { ...image, caption: event.target.value } : image) })} /></EditorField>
        {index > 0 ? <Button type="button" variant="ghost" className="w-full" onClick={() => { const images = [...block.images]; [images[index - 1], images[index]] = [images[index], images[index - 1]]; onChange({ ...block, images }); }}>Monter cette image</Button> : null}
      </div>)}
      <Button type="button" variant="secondary" className="w-full" disabled={block.images.length >= 12} onClick={() => onChooseAsset("image", (asset) => onChange({ ...block, images: [...block.images, { assetId: asset.id, alt: "", caption: "" }] }))}>Ajouter une image</Button>
    </> : null}
    {block.type === "link" ? <>
      <EditorField label="Texte du bouton"><Input value={block.label} maxLength={200} onChange={(event) => onChange({ ...block, label: event.target.value })} /></EditorField>
      <EditorField label="Adresse du lien" hint="Un lien https:// ou l’adresse d’une ressource TaDiff, par exemple /ressources/mon-guide."><Input inputMode="url" value={block.url} maxLength={2000} onChange={(event) => onChange({ ...block, url: event.target.value })} /></EditorField>
      {block.url && !safeResourceLink(block.url) ? <p className="text-xs text-danger">Cette adresse n’est pas valide. Utilisez un lien complet ou un chemin TaDiff.</p> : null}
    </> : null}
    {block.type === "file" ? <>
      <AssetField label="Document" assetId={block.assetId} assets={assets} onChoose={() => onChooseAsset("file", (asset) => onChange({ ...block, assetId: asset.id, label: block.label || asset.name }))} onRemove={() => onChange({ ...block, assetId: null })} />
      <EditorField label="Nom du téléchargement"><Input value={block.label} maxLength={200} onChange={(event) => onChange({ ...block, label: event.target.value })} /></EditorField>
      <EditorField label="Présentation du document"><Textarea value={block.description} maxLength={500} onChange={(event) => onChange({ ...block, description: event.target.value })} /></EditorField>
    </> : null}
    {block.type === "video" ? <>
      <EditorField label="Titre de la vidéo"><Input value={block.title} maxLength={200} onChange={(event) => onChange({ ...block, title: event.target.value })} /></EditorField>
      <EditorField label="Lien YouTube ou Vimeo" hint="Collez le lien de la vidéo. Le lecteur vidéo sera intégré à la page publiée."><Input type="url" inputMode="url" value={block.url} maxLength={2000} onChange={(event) => onChange({ ...block, url: event.target.value })} /></EditorField>
      {block.url && !resourceVideoEmbed(block.url) ? <p className="text-xs text-danger">Ce lien vidéo n’est pas reconnu. Utilisez un lien YouTube ou Vimeo.</p> : null}
    </> : null}
    {block.type === "columns" ? <>
      <EditorField label="Largeur des colonnes"><Select value={block.ratio} onChange={(event) => onChange({ ...block, ratio: event.target.value as typeof block.ratio })}><option value="equal">Deux colonnes égales</option><option value="wide-left">Colonne gauche plus large</option><option value="wide-right">Colonne droite plus large</option></Select></EditorField>
      <p className="text-sm leading-relaxed text-muted">Ajoutez vos blocs dans chaque colonne depuis la page. Sur téléphone, les colonnes s’affichent l’une sous l’autre.</p>
    </> : null}
    <EditorField label="Style du bloc" hint="Les couleurs et les caractères suivent la charte TaDiff."><Select value={block.tone} onChange={(event) => onChange({ ...block, tone: event.target.value as ResourceBlock["tone"] })}><option value="plain">Fond blanc</option><option value="soft">Fond bleu clair</option><option value="accent">Mise en avant bleue</option></Select></EditorField>
  </div>;
}
