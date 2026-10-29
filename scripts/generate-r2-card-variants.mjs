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

const CARD_IMAGE_WIDTH = 720;
const CARD_IMAGE_QUALITY = 72;
// Keep in sync with lib/listingImagePaths.ts. Files are generated once, never on image requests.
const RESPONSIVE_WIDTHS = [160, 320, 480, 720, 1080, 1440, 1920];
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
    overwrite: false,
    responsive: false,
    retryMissing: false,
    recoverJpegWarnings: false,
    recoveryPreviewDir: null,
    limit: null,
    concurrency: 4,
  };
  for (const arg of argv) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--overwrite') args.overwrite = true;
    else if (arg === '--responsive') args.responsive = true;
    else if (arg === '--retry-missing') args.retryMissing = true;
    else if (arg === '--recover-jpeg-warnings') args.recoverJpegWarnings = true;
    else if (arg.startsWith('--recovery-preview-dir=')) args.recoveryPreviewDir = arg.slice('--recovery-preview-dir='.length);
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

function toResponsiveVariantKey(sourceKey, width) {
  const slash = sourceKey.lastIndexOf('/');
  const dir = sourceKey.slice(0, slash);
  const base = sourceKey.slice(slash + 1).replace(/\.[^.]+$/, '');
  return `${dir}/responsive_v1_${width}_${base}.webp`;
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

async function fetchImages(supabase, table) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from(table)
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
    if (status === 404) return false;
    throw err;
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

  const tables = args.responsive ? ['listing_images', 'attraction_images'] : ['listing_images'];
  const rows = (await Promise.all(tables.map((table) => fetchImages(supabase, table)))).flat();
  const limitsPath = path.resolve(process.cwd(), 'lib/listingImageVariantLimits.json');
  const variantLimits = args.responsive && fs.existsSync(limitsPath)
    ? JSON.parse(fs.readFileSync(limitsPath, 'utf8')) : {};
  const eligible = args.retryMissing ? rows.filter((row) => {
    const key = decodeR2KeyFromUrl(String(row.image_url || ''), r2PublicBaseUrl)?.replace(/\.[^/.]+$/, '');
    return key && Array.isArray(variantLimits[key]) && variantLimits[key].length === 0;
  }) : rows;
  const selected = args.limit ? eligible.slice(0, args.limit) : eligible;
  console.log(`[r2-variants] Image rows scanned: ${selected.length}`);
  console.log(`[r2-variants] Mode: ${args.dryRun ? 'DRY RUN' : 'LIVE'} | responsive=${args.responsive} | overwrite=${args.overwrite} | concurrency=${args.concurrency}`);

  let created = 0;
  let overwritten = 0;
  let exists = 0;
  let skipped = 0;
  let failed = 0;
  let avoidedUpscales = 0;
  let recoveredFromCard = 0;
  let recoveredJpegWarnings = 0;

  await mapLimit(selected, args.concurrency, async (row, idx) => {
    const sourceUrl = String(row.image_url || '').trim();
    if (!sourceUrl) {
      skipped += 1;
      return;
    }

    const sourceKey = decodeR2KeyFromUrl(sourceUrl, r2PublicBaseUrl);
    if (!sourceKey || !/^(listings|attractions)\//.test(sourceKey)) {
      skipped += 1;
      return;
    }
    if (/^(card_|responsive_v1_)/.test(sourceKey.split('/').pop() || '')) {
      skipped += 1;
      return;
    }

    const variants = [
      ...(sourceKey.startsWith('listings/') ? [{ key: toCardVariantKey(sourceKey), width: CARD_IMAGE_WIDTH, legacy: true }] : []),
      ...(args.responsive ? RESPONSIVE_WIDTHS.map((width) => ({
        key: toResponsiveVariantKey(sourceKey, width), width, legacy: false,
      })) : []),
    ];
    const availableWidths = new Set();
    const imageKey = sourceKey.replace(/\.[^/.]+$/, '');
    try {
      const pending = [];
      for (const variant of variants) {
        const alreadyExists = await objectExists(r2, bucket, variant.key);
        if (alreadyExists && !variant.legacy) availableWidths.add(variant.width);
        if (alreadyExists && !args.overwrite) exists += 1;
        else pending.push({ ...variant, alreadyExists });
      }
      if (!pending.length) return;

      const sourceObj = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: sourceKey }));
      if (!sourceObj?.Body) throw new Error('missing_source_body');
      let sourceBuffer = await streamToBuffer(sourceObj.Body);
      let metadata = await sharp(sourceBuffer).metadata();
      let sourceWidth = (metadata.orientation || 1) >= 5 ? metadata.height : metadata.width;
      if (!sourceWidth) throw new Error('invalid_image_dimensions');
      let usingCardFallback = false;
      let decoderOptions;

      for (const variant of pending) {
        if (!variant.legacy && variant.width > sourceWidth) {
          avoidedUpscales += 1;
          continue;
        }
        if (!args.dryRun) {
          const render = () => sharp(sourceBuffer, decoderOptions)
            .rotate().resize({ width: variant.width, withoutEnlargement: true })
            .webp({ quality: CARD_IMAGE_QUALITY }).toBuffer();
          let buffer;
          try {
            buffer = await render();
          } catch (error) {
            if (args.recoverJpegWarnings && metadata.format === 'jpeg' && !decoderOptions) {
              // Explicit recovery for old JPEG warnings only; decoding errors still abort.
              decoderOptions = { failOn: 'error' };
              buffer = await render();
              recoveredJpegWarnings += 1;
              if (args.recoveryPreviewDir) {
                fs.mkdirSync(args.recoveryPreviewDir, { recursive: true });
                fs.writeFileSync(path.join(args.recoveryPreviewDir, path.basename(sourceKey) + '.webp'), buffer);
              }
            } else {
              if (usingCardFallback || !sourceKey.startsWith('listings/')) throw error;
              // Reuse a valid existing thumbnail while preserving the original.
              const cardObj = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: toCardVariantKey(sourceKey) }));
              if (!cardObj.Body) throw error;
              sourceBuffer = await streamToBuffer(cardObj.Body);
              metadata = await sharp(sourceBuffer).metadata();
              sourceWidth = (metadata.orientation || 1) >= 5 ? metadata.height : metadata.width;
              if (!sourceWidth) throw error;
              usingCardFallback = true;
              recoveredFromCard += 1;
              if (!variant.legacy && variant.width > sourceWidth) {
                avoidedUpscales += 1;
                continue;
              }
              buffer = await render();
            }
          }
          await r2.send(new PutObjectCommand({
            Bucket: bucket,
            Key: variant.key,
            Body: buffer,
            ContentType: 'image/webp',
            CacheControl: TARGET_CACHE_CONTROL,
          }));
          if (!variant.legacy) availableWidths.add(variant.width);
        }
        if (variant.alreadyExists) overwritten += 1;
        else created += 1;
      }
    } catch (err) {
      failed += 1;
      if (failed <= 10) {
        console.error('[r2-variants] Failed:', sourceKey, '-', err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (args.responsive && !args.dryRun) {
        if (availableWidths.size === RESPONSIVE_WIDTHS.length) delete variantLimits[imageKey];
        else variantLimits[imageKey] = [...availableWidths].sort((a, b) => a - b);
      }
      if ((idx + 1) % 100 === 0 || idx + 1 === selected.length) {
        console.log(`[r2-variants] ${idx + 1}/${selected.length} processed`);
      }
    }
  });

  if (args.responsive && !args.dryRun) {
    const sortedLimits = Object.fromEntries(Object.entries(variantLimits).sort(([a], [b]) => a.localeCompare(b)));
    fs.writeFileSync(limitsPath, JSON.stringify(sortedLimits, null, 2) + '\n', 'utf8');
    console.log(`[r2-variants] Recorded ${Object.keys(sortedLimits).length} sources with limited available widths.`);
  }

  console.log('\n[r2-variants] Finished');
  console.log(`- created/would_create: ${created}`);
  console.log(`- overwritten/would_overwrite: ${overwritten}`);
  console.log(`- already_exists: ${exists}`);
  console.log(`- skipped: ${skipped}`);
  console.log(`- avoided_upscales: ${avoidedUpscales}`);
  console.log(`- recovered_from_existing_card: ${recoveredFromCard}`);
  console.log(`- recovered_jpeg_warnings: ${recoveredJpegWarnings}`);
  console.log(`- failed: ${failed}`);
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error('[r2-variants] Fatal:', err?.message || err);
  process.exit(1);
});
