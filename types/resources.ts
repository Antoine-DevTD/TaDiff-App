export type ResourceVisibility = "public" | "members";
export type ResourceTone = "plain" | "soft" | "accent";
export type ResourceImage = { assetId: string | null; alt: string; caption: string };
export type ResourceLayout = {
  align?: "left" | "center" | "right";
  width?: "full" | "medium" | "narrow";
  size?: "small" | "normal" | "large";
  spacing?: "compact" | "normal" | "roomy";
  button?: "solid" | "outline" | "text";
};
type BlockBase = { id: string; tone: ResourceTone; layout?: ResourceLayout };
export type ResourceBlock = BlockBase & (
  | { type: "heading"; text: string; level: 2 | 3 }
  | { type: "text"; text: string }
  | ({ type: "image" } & ResourceImage)
  | { type: "gallery"; images: ResourceImage[] }
  | { type: "link"; label: string; url: string }
  | { type: "file"; assetId: string | null; label: string; description: string }
  | { type: "video"; url: string; title: string }
  | { type: "columns"; ratio: "equal" | "wide-left" | "wide-right"; columns: [ResourceBlock[], ResourceBlock[]] }
);
export type ResourceBlockType = ResourceBlock["type"];
export type ResourceDocument = {
  version: 1;
  title: string;
  slug: string;
  description: string;
  category: string;
  visibility: ResourceVisibility;
  featured: boolean;
  coverAssetId: string | null;
  blocks: ResourceBlock[];
};
export type ResourcePage = {
  id: string;
  draft: ResourceDocument;
  revision: number;
  published_at: string | null;
  archived_at: string | null;
  updated_at: string;
  created_at: string;
};
export type PublishedResource = {
  id: string;
  document: ResourceDocument;
  published_at: string;
  updated_at: string;
};
export type ResourceAsset = {
  id: string;
  page_id: string;
  name: string;
  mime_type: string;
  size: number;
  storage_path: string;
  created_at: string;
};
export type ResourceRevision = { id: string; page_id: string; revision: number; document: ResourceDocument; created_at: string };
export type ResourceSaveInput = { id: string; document: ResourceDocument; expectedRevision: number | null; publish?: boolean };
export type ResourceSaveResult = { ok: true; page: ResourcePage; message: string } | { ok: false; message: string; conflict?: boolean };
export type ResourceLoadResult<T> = { data: T; error: string | null };
export type ResourceEditorAccount = { userId: string; fullName: string; email: string; companyName: string; isSuperAdmin: boolean; canEdit: boolean; grantedAt: string | null };
