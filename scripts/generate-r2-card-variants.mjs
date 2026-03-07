#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const CARD_IMAGE_WIDTH = 960;
const CARD_IMAGE_QUALITY = 78;
const TARGET_CACHE_CONTROL = 'public, max-age=31536000, immutable';

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    limit: null,
    concurrency: 4,
  };
  for (const arg of argv) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg.startsWith('--limit=')) args.limit = Number(arg.slice('--limit='.length));
    else if (arg.startsWith('--concurrency=')) args.concurrency = Number(arg.slice('--concurrency='.length));
  }
  if (!Number.isFinite(args.limit) || args.limit <= 0) args.limit = null;
  if (!Number.isFinite(args.concurrency) || args.concurrency < 1) args.concurrency = 4;
  return args;
}

function requireEnv(name) {
  const value = (process.env[name] || '').trim();
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function toCardVariantKey(sourceKey) {
  const slash = sourceKey.lastIndexOf('/');
  if (slash === -1) return sourceKey;
  const dir = sourceKey.slice(0, slash);
  const file = sourceKey.slice(slash + 1);
  if (file.startsWith('card_')) return sourceKey;
  const base = file.replace(/\.[^.]+$/, '');
  return `${dir}/card_${base}.webp`;
}

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

function decodeR2KeyFromUrl(rawUrl, baseUrl) {
  try {
    const url = new URL(rawUrl);
    const base = new URL(baseUrl);
    if (url.origin !== base.origin) return null;
    const basePath = base.pathname.replace(/\/+$/, '');
    let relativePath = url.pathname;
    if (basePath) {
      if (!relativePath.startsWith(`${basePath}/`) && relativePath !== basePath) return null;
      relativePath = relativePath.slice(basePath.length);
    }
    return relativePath
      .replace(/^\/+/, '')
      .split('/')
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment))
      .join('/');
  } catch {
    return null;
  }
}

async function mapLimit(items, limit, worker) {
  let index = 0;
  async function runner() {
    while (index < items.length) {
      const i = index++;
      await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runner()));
}

async function fetchListingImages(supabase) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('listing_images')
      .select('id, image_url')
      .range(from, to);
    if (error) throw new Error(error.message);
    const chunk = Array.isArray(data) ? data : [];
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function objectExists(client, bucket, key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err) {
    const status = err?.$metadata?.httpStatusCode;
    return status !== 404 ? false : false;
  }
}

async function main() {
  loadDotEnv();
  const args = parseArgs(process.argv.slice(2));

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const r2PublicBaseUrl = requireEnv('R2_PUBLIC_BASE_URL');
  const accountId = requireEnv('R2_ACCOUNT_ID');
  const accessKeyId = requireEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('R2_SECRET_ACCESS_KEY');
  const bucket = requireEnv('R2_BUCKET');
  const endpoint = (process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`).trim();

  const supabase = createClient(supabaseUrl, supabaseKey);
  const r2 = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  const rows = await fetchListingImages(supabase);
  const selected = args.limit ? rows.slice(0, args.limit) : rows;
  console.log(`[r2-variants] Listing rows scanned: ${selected.length}`);
  console.log(`[r2-variants] Mode: ${args.dryRun ? 'DRY RUN' : 'LIVE'} | concurrency=${args.concurrency}`);

  let created = 0;
  let exists = 0;
  let skipped = 0;
  let failed = 0;

  await mapLimit(selected, args.concurrency, async (row, idx) => {
    const sourceUrl = String(row.image_url || '').trim();
    if (!sourceUrl) {
      skipped += 1;
      return;
    }

    const sourceKey = decodeR2KeyFromUrl(sourceUrl, r2PublicBaseUrl);
    if (!sourceKey || !sourceKey.startsWith('listings/')) {
      skipped += 1;
      return;
    }
    if (sourceKey.split('/').pop()?.startsWith('card_')) {
      skipped += 1;
      return;
    }

    const cardKey = toCardVariantKey(sourceKey);
    try {
      const alreadyExists = await objectExists(r2, bucket, cardKey);
      if (alreadyExists) {
        exists += 1;
        return;
      }

      if (args.dryRun) {
        created += 1;
        return;
      }

      const sourceObj = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: sourceKey }));
      if (!sourceObj?.Body) throw new Error('missing_source_body');
      const sourceBuffer = await streamToBuffer(sourceObj.Body);
      const cardBuffer = await sharp(sourceBuffer)
        .rotate()
        .resize({ width: CARD_IMAGE_WIDTH, withoutEnlargement: true })
        .webp({ quality: CARD_IMAGE_QUALITY })
        .toBuffer();

      await r2.send(new PutObjectCommand({
        Bucket: bucket,
        Key: cardKey,
        Body: cardBuffer,
        ContentType: 'image/webp',
        CacheControl: TARGET_CACHE_CONTROL,
      }));
      created += 1;
    } catch (err) {
      failed += 1;
      if (failed <= 10) {
        console.error('[r2-variants] Failed:', sourceKey, '-', err instanceof Error ? err.message : String(err));
      }
    } finally {
      if ((idx + 1) % 100 === 0 || idx + 1 === selected.length) {
        console.log(`[r2-variants] ${idx + 1}/${selected.length} processed`);
      }
    }
  });

  console.log('\n[r2-variants] Finished');
  console.log(`- created/would_create: ${created}`);
  console.log(`- already_exists: ${exists}`);
  console.log(`- skipped: ${skipped}`);
  console.log(`- failed: ${failed}`);
}

main().catch((err) => {
  console.error('[r2-variants] Fatal:', err?.message || err);
  process.exit(1);
});
