import "server-only";

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type StorageProvider = "supabase" | "r2";

export function getConfiguredStorageProvider(): StorageProvider {
  return process.env.STORAGE_PROVIDER === "r2" ? "r2" : "supabase";
}

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_DOCUMENTS_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("Configuration Cloudflare R2 incomplete.");
  }
  return {
    bucket,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

export async function preparePrivateUpload(storagePath: string, contentType: string) {
  const provider = getConfiguredStorageProvider();
  if (provider === "supabase") {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.storage.from("documents").createSignedUploadUrl(storagePath);
    if (error || !data) throw new Error(error?.message ?? "Impossible de preparer l'upload.");
    return { provider, signedUrl: data.signedUrl };
  }
  const { bucket, client } = getR2Config();
  const signedUrl = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: storagePath, ContentType: contentType }),
    { expiresIn: 900 },
  );
  return { provider, signedUrl };
}

export async function createPrivateObjectUrls(
  provider: StorageProvider,
  storagePath: string,
  downloadName: string,
) {
  if (provider === "supabase") {
    const supabase = await getSupabaseServerClient();
    const [preview, download] = await Promise.all([
      supabase.storage.from("documents").createSignedUrl(storagePath, 3600),
      supabase.storage.from("documents").createSignedUrl(storagePath, 3600, { download: downloadName }),
    ]);
    return { previewUrl: preview.data?.signedUrl ?? "", downloadUrl: download.data?.signedUrl ?? "" };
  }
  const { bucket, client } = getR2Config();
  const base = { Bucket: bucket, Key: storagePath };
  const [previewUrl, downloadUrl] = await Promise.all([
    getSignedUrl(client, new GetObjectCommand(base), { expiresIn: 3600 }),
    getSignedUrl(
      client,
      new GetObjectCommand({
        ...base,
        ResponseContentDisposition: `attachment; filename="${downloadName.replace(/"/g, "")}"`,
      }),
      { expiresIn: 3600 },
    ),
  ]);
  return { previewUrl, downloadUrl };
}

export async function removePrivateObject(provider: StorageProvider, storagePath: string) {
  if (provider === "supabase") {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.storage.from("documents").remove([storagePath]);
    if (error) throw new Error(error.message);
    return;
  }
  const { bucket, client } = getR2Config();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: storagePath }));
}
