import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { allowedResourceUpload, createResourceBlock, createResourceDocument, resourceAssetIds, resourceDocumentSchema, resourceSlug, resourceUploadMime, resourceVideoEmbed, safeResourceLink, validateResourceForPublication } from "../../lib/resources.ts";

const document = () => ({ ...createResourceDocument(), blocks: [createResourceBlock("text")] });

test("ressources : mise en page encadrée et compatibilité des anciennes pages", () => {
  const doc = document();
  assert.equal(resourceDocumentSchema.safeParse(doc).success, true);
  doc.blocks[0].layout = { align: "center", width: "narrow", size: "large", spacing: "roomy", button: "outline" };
  const parsed = resourceDocumentSchema.safeParse(doc);
  assert.equal(parsed.success, true);
  assert.deepEqual(parsed.data.blocks[0].layout, doc.blocks[0].layout);
  for (const layout of [{ width: "9999px" }, { color: "red" }, { size: "huge" }, { align: "absolute" }]) {
    assert.equal(resourceDocumentSchema.safeParse({ ...doc, blocks: [{ ...doc.blocks[0], layout }] }).success, false);
  }
});

test("ressources : brouillon privé par défaut et publication explicite d’un contenu complet", () => {
  const draft = createResourceDocument();
  assert.equal(draft.visibility, "members");
  assert.equal(resourceDocumentSchema.safeParse(draft).success, true);
  assert.match(validateResourceForPublication(draft), /contenu/);
  assert.equal(validateResourceForPublication(document()), null);
  assert.equal(resourceSlug("Préparer l’Été : théâtre & diffusion !"), "preparer-l-ete-theatre-diffusion");
});

test("ressources : liens dangereux, relatifs ambigus et identifiants intégrés refusés", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,test", "//evil.test", "/api/private", "/ressources/../admin", "https://a.test\\@evil.test", "https://user:password@example.test", "https://example.test/\nhello", "file:///x"]) assert.equal(safeResourceLink(url), null, url);
  assert.equal(safeResourceLink("/ressources/mon-guide"), "/ressources/mon-guide");
  assert.equal(safeResourceLink("https://example.test/guide?q=un%20guide"), "https://example.test/guide?q=un%20guide");
});

test("ressources : seules les vidéos des hôtes autorisés deviennent des lecteurs intégrés", () => {
  assert.equal(resourceVideoEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(resourceVideoEmbed("https://youtu.be/dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(resourceVideoEmbed("https://vimeo.com/1234567"), "https://player.vimeo.com/video/1234567?dnt=1");
  for (const url of ["https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ", "http://youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ/extra", "https://youtube.com:444/watch?v=dQw4w9WgXcQ", "javascript:alert(1)", "https://vimeo.com/channels/foo"]) assert.equal(resourceVideoEmbed(url), null);
});

test("ressources : limites de profondeur, volume et unicité appliquées avant la sauvegarde", () => {
  const duplicate = createResourceBlock("text");
  assert.equal(resourceDocumentSchema.safeParse({ ...document(), blocks: [duplicate, duplicate] }).success, false);
  assert.equal(resourceDocumentSchema.safeParse({ ...document(), blocks: Array.from({ length: 81 }, () => createResourceBlock("text")) }).success, false);
  let nested = createResourceBlock("text");
  for (let i = 0; i < 25; i++) nested = { ...createResourceBlock("columns"), columns: [[nested], []] };
  assert.equal(resourceDocumentSchema.safeParse({ ...document(), blocks: [nested] }).success, false);
  assert.equal(resourceDocumentSchema.safeParse({ ...document(), visibility: "all" }).success, false);
  assert.equal(resourceDocumentSchema.safeParse({ ...document(), html: "<script>" }).success, false);
  assert.equal(resourceDocumentSchema.safeParse({ ...document(), blocks: Array.from({ length: 30 }, () => ({ ...createResourceBlock("text"), text: "é".repeat(20000) })) }).success, false);
});

test("ressources : les médias référencés incluent couverture, galerie et colonnes sans doublon", () => {
  const first = randomUUID(), second = randomUUID(), third = randomUUID();
  const doc = { ...document(), coverAssetId: first, blocks: [
    { ...createResourceBlock("columns"), columns: [[{ ...createResourceBlock("image"), assetId: first, alt: "Scène vide" }], [{ ...createResourceBlock("file"), assetId: second }]] },
    { ...createResourceBlock("gallery"), images: [{ assetId: third, alt: "Répétition", caption: "" }] },
  ] };
  assert.deepEqual(resourceAssetIds(doc), [first, second, third]);
  assert.equal(validateResourceForPublication(doc), null);
});

test("ressources : les blocs incomplets restent enregistrables mais pas publiables", () => {
  for (const type of ["image", "gallery", "file", "video", "link", "columns"]) {
    const doc = { ...document(), blocks: [createResourceBlock(type)] };
    assert.equal(resourceDocumentSchema.safeParse(doc).success, true, type);
    assert.equal(typeof validateResourceForPublication(doc), "string", type);
  }
  const image = { ...createResourceBlock("image"), assetId: randomUUID() };
  assert.match(validateResourceForPublication({ ...document(), blocks: [image] }), /description/);
});

test("ressources : téléversement limité aux fichiers et images prévus", () => {
  for (const [name, mime] of [["photo.jpg", "image/jpeg"], ["budget.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], ["guide.pdf", "application/pdf"], ["liste.csv", ""], ["notice.txt", "text/plain"]]) assert.equal(allowedResourceUpload(name, mime, 1024), true, name);
  for (const [name, mime] of [["x.svg", "image/svg+xml"], ["x.html", "text/html"], ["photo.jpg", "text/html"], ["../guide.pdf", "application/pdf"], ["x.exe", "application/octet-stream"], ["script.js", "text/javascript"]]) assert.equal(allowedResourceUpload(name, mime, 1024), false, name);
  assert.equal(allowedResourceUpload("x.pdf", "application/pdf", 0), false);
  assert.equal(allowedResourceUpload("x.pdf", "application/pdf", 4 * 1024 * 1024), true);
  assert.equal(allowedResourceUpload("x.pdf", "application/pdf", 4 * 1024 * 1024 + 1), false);
  assert.equal(resourceUploadMime("liste.csv", "application/vnd.ms-excel"), "text/csv");
  assert.equal(resourceUploadMime("liste.csv", "application/octet-stream"), "text/csv");
  assert.equal(resourceUploadMime("script.exe", "application/octet-stream"), null);
});
