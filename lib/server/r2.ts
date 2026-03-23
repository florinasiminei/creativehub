import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { SignatureV4MultiRegion } from "@aws-sdk/signature-v4-multi-region";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Hash } from "@smithy/hash-node";
import { HttpRequest } from "@smithy/protocol-http";
import { Readable } from "stream";
import { toListingCardVariantPath } from "@/lib/listingImagePaths";

export const R2_UPLOAD_CACHE_CONTROL = "public, max-age=31536000, immutable";

type R2Config = {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  publicBaseUrl: string;
};

type SignedUpload = {
  uploadUrl: string;
  headers: Record<string, string>;
};

type SignedRequestLike = {
  protocol: string;
  hostname: string;
  port?: number;
  path: string;
  query?: Record<string, string | readonly string[] | null | undefined>;
};

let r2Client: S3Client | null = null;

function requireEnv(name: string) {
  const value = (process.env[name] || "").trim();
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function getR2Config(): R2Config {
  const accountId = requireEnv("R2_ACCOUNT_ID");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");
  const bucket = requireEnv("R2_BUCKET");
  const publicBaseUrl = requireEnv("R2_PUBLIC_BASE_URL");
  const endpoint = (process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`).trim();
  return { accessKeyId, secretAccessKey, bucket, endpoint, publicBaseUrl };
}

export function getR2Client() {
  if (!r2Client) {
    const config = getR2Config();
    r2Client = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return r2Client;
}

function encodeObjectKey(key: string) {
  return key
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function toSignedRequestUrl(request: SignedRequestLike) {
  const baseUrl = `${request.protocol}//${request.hostname}${request.port ? `:${request.port}` : ""}${request.path}`;
  const url = new URL(baseUrl);

  for (const [key, rawValue] of Object.entries(request.query || {})) {
    if (Array.isArray(rawValue)) {
      rawValue.forEach((value) => {
        if (value !== undefined) url.searchParams.append(key, String(value));
      });
      continue;
    }

    if (rawValue !== undefined && rawValue !== null) {
      url.searchParams.set(key, String(rawValue));
    }
  }

  return url.toString();
}

function extractSupabaseStorageObject(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const matched = url.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.*)$/);
    if (!matched) return null;
    return {
      bucket: matched[1],
      path: decodeURIComponent(matched[2]),
    };
  } catch {
    return null;
  }
}

async function bodyToBuffer(body: unknown): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);

  const maybeBody = body as {
    transformToByteArray?: () => Promise<Uint8Array>;
    arrayBuffer?: () => Promise<ArrayBuffer>;
  };

  if (typeof maybeBody.transformToByteArray === "function") {
    return Buffer.from(await maybeBody.transformToByteArray());
  }

  if (typeof maybeBody.arrayBuffer === "function") {
    return Buffer.from(await maybeBody.arrayBuffer());
  }

  if (body instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  throw new Error("Unsupported R2 response body");
}

export function getR2PublicUrl(key: string) {
  const { publicBaseUrl } = getR2Config();
  const base = new URL(publicBaseUrl);
  const basePath = base.pathname.replace(/\/+$/, "");
  const encodedKey = encodeObjectKey(key);
  base.pathname = basePath ? `${basePath}/${encodedKey}` : `/${encodedKey}`;
  return base.toString();
}

export function getR2ObjectKeyFromUrl(rawUrl: string) {
  try {
    const { publicBaseUrl } = getR2Config();
    const url = new URL(rawUrl);
    const base = new URL(publicBaseUrl);
    if (url.origin !== base.origin) return null;

    const basePath = base.pathname.replace(/\/+$/, "");
    let relativePath = url.pathname;
    if (basePath) {
      if (!relativePath.startsWith(`${basePath}/`) && relativePath !== basePath) return null;
      relativePath = relativePath.slice(basePath.length);
    }

    return relativePath
      .replace(/^\/+/, "")
      .split("/")
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment))
      .join("/");
  } catch {
    return null;
  }
}

export async function createSignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 900
): Promise<SignedUpload> {
  const config = getR2Config();
  const endpoint = new URL(config.endpoint);
  const hostname = `${config.bucket}.${endpoint.hostname}`;
  const encodedKey = encodeObjectKey(key);
  const basePath = endpoint.pathname.replace(/\/+$/, "");
  const path = basePath ? `${basePath}/${encodedKey}` : `/${encodedKey}`;
  const host = endpoint.port ? `${hostname}:${endpoint.port}` : hostname;
  const headers = {
    host,
    "content-type": contentType,
    "cache-control": R2_UPLOAD_CACHE_CONTROL,
  };

  const request = new HttpRequest({
    protocol: endpoint.protocol,
    hostname,
    port: endpoint.port ? Number(endpoint.port) : undefined,
    method: "PUT",
    path,
    headers,
  });

  const signer = new SignatureV4MultiRegion({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    region: "auto",
    service: "s3",
    sha256: Hash.bind(null, "sha256"),
  });

  const signedRequest = await signer.presign(request, { expiresIn: expiresInSeconds });
  return {
    uploadUrl: toSignedRequestUrl(signedRequest),
    headers: {
      "Content-Type": contentType,
      "Cache-Control": R2_UPLOAD_CACHE_CONTROL,
    },
  };
}

export async function uploadBufferToR2(key: string, buffer: Buffer, contentType: string) {
  const { bucket } = getR2Config();
  await getR2Client().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: R2_UPLOAD_CACHE_CONTROL,
  }));
}

export async function downloadBufferFromR2(key: string) {
  const { bucket } = getR2Config();
  const response = await getR2Client().send(new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  }));
  return bodyToBuffer(response.Body);
}

async function deleteR2Keys(keys: string[]) {
  const uniqueKeys = Array.from(new Set(keys.filter(Boolean)));
  if (uniqueKeys.length === 0) return;

  const { bucket } = getR2Config();
  for (let index = 0; index < uniqueKeys.length; index += 1000) {
    const chunk = uniqueKeys.slice(index, index + 1000);
    await getR2Client().send(new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: chunk.map((Key) => ({ Key })),
        Quiet: true,
      },
    }));
  }
}

export async function deleteR2Object(key: string) {
  await deleteR2Keys([key]);
}

async function deleteSupabaseKeys(
  supabaseAdmin: SupabaseClient,
  removalsByBucket: Map<string, Set<string>>
) {
  for (const [bucket, paths] of removalsByBucket.entries()) {
    const uniquePaths = Array.from(paths).filter(Boolean);
    for (let index = 0; index < uniquePaths.length; index += 100) {
      await supabaseAdmin.storage.from(bucket).remove(uniquePaths.slice(index, index + 100));
    }
  }
}

export async function deleteStoredImageUrls(
  rawUrls: Array<string | null | undefined>,
  {
    supabaseAdmin,
    includeListingCardVariant = false,
  }: {
    supabaseAdmin: SupabaseClient;
    includeListingCardVariant?: boolean;
  }
) {
  const r2Keys: string[] = [];
  const supabaseRemovals = new Map<string, Set<string>>();

  for (const rawUrl of rawUrls) {
    if (!rawUrl) continue;

    const r2Key = getR2ObjectKeyFromUrl(rawUrl);
    if (r2Key) {
      r2Keys.push(r2Key);
      if (includeListingCardVariant && r2Key.startsWith("listings/")) {
        r2Keys.push(toListingCardVariantPath(r2Key));
      }
      continue;
    }

    const supabaseObject = extractSupabaseStorageObject(rawUrl);
    if (!supabaseObject) continue;

    if (!supabaseRemovals.has(supabaseObject.bucket)) {
      supabaseRemovals.set(supabaseObject.bucket, new Set());
    }
    supabaseRemovals.get(supabaseObject.bucket)?.add(supabaseObject.path);
    if (includeListingCardVariant && supabaseObject.path.startsWith("listings/")) {
      supabaseRemovals.get(supabaseObject.bucket)?.add(toListingCardVariantPath(supabaseObject.path));
    }
  }

  await Promise.all([
    deleteR2Keys(r2Keys),
    deleteSupabaseKeys(supabaseAdmin, supabaseRemovals),
  ]);
}
