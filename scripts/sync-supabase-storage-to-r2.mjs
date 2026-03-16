#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const CARD_IMAGE_WIDTH = 720;
const CARD_IMAGE_QUALITY = 72;
const TARGET_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const DEFAULT_SUPABASE_BUCKET = 'listing-images';

const TABLES = {
  listing_images: {
    keyPrefix: 'listings/',
    includeCardVariant: true,
  },
  attraction_images: {
    keyPrefix: 'attractions/',
    includeCardVariant: false,
  },
};

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
    apply: false,
    migrate: false,
    deleteOrphans: false,
    limit: null,
    concurrency: 4,
    tables: Object.keys(TABLES),
  };

  for (const arg of argv) {
    if (arg === '--apply') args.apply = true;
    else if (arg === '--migrate') args.migrate = true;
    else if (arg === '--delete-orphans') args.deleteOrphans = true;
    else if (arg.startsWith('--limit=')) args.limit = Number(arg.slice('--limit='.length));
    else if (arg.startsWith('--concurrency=')) args.concurrency = Number(arg.slice('--concurrency='.length));
    else if (arg.startsWith('--tables=')) {
      args.tables = arg
        .slice('--tables='.length)
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value in TABLES);
    }
  }

  if (!Number.isFinite(args.limit) || args.limit <= 0) args.limit = null;
  if (!Number.isFinite(args.concurrency) || args.concurrency < 1) args.concurrency = 4;
  if (!args.tables.length) args.tables = Object.keys(TABLES);
  return args;
}

function requireEnv(name) {
  const value = (process.env[name] || '').trim();
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function bytesToMb(bytes) {
  return Math.round((Number(bytes || 0) / 1024 / 1024) * 100) / 100;
}

function inferContentType(filePath) {
  const lower = String(filePath || '').toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.avif')) return 'image/avif';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.heif')) return 'image/heif';
  return 'application/octet-stream';
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

function buildPublicUrl(baseUrl, objectKey) {
  const base = new URL(baseUrl);
  const cleanBasePath = base.pathname.replace(/\/+$/, '');
  const encodedPath = String(objectKey)
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  base.pathname = cleanBasePath ? `${cleanBasePath}/${encodedPath}` : `/${encodedPath}`;
  return base.toString();
}

function extractSupabaseObjectKey(rawUrl, bucket) {
  try {
    const url = new URL(String(rawUrl || '').trim());
    const marker = `/storage/v1/object/public/${bucket}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return null;
    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

async function mapLimit(items, limit, worker) {
  let index = 0;
  async function runner() {
    while (index < items.length) {
      const current = index++;
      await worker(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runner()));
}

async function fetchTableRows(supabase, table) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('id, image_url')
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`[sync-storage] ${table}: ${error.message}`);
    const chunk = Array.isArray(data) ? data : [];
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function listFolderRecursive(storage, prefix) {
  const files = [];
  const queue = [prefix];

  while (queue.length > 0) {
    const currentPrefix = queue.shift();
    let offset = 0;
    while (true) {
      const { data, error } = await storage.list(currentPrefix, {
        limit: 100,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw new Error(`[sync-storage] list ${currentPrefix}: ${error.message}`);
      const items = Array.isArray(data) ? data : [];
      for (const item of items) {
        const fullKey = currentPrefix ? `${currentPrefix}/${item.name}` : item.name;
        if (item.id === null && !item.metadata) {
          queue.push(fullKey);
        } else {
          files.push({
            key: fullKey,
            size: Number(item.metadata?.size || 0),
            item,
          });
        }
      }
      if (items.length < 100) break;
      offset += 100;
    }
  }

  return files;
}

async function objectExists(client, bucket, key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404) return false;
    throw err;
  }
}

async function collectState({ supabase, bucket, tables }) {
  const rowsByTable = {};
  const supabaseRows = [];
  const requiredKeys = new Set();
  const sourceRowsByKey = new Map();
  const tableCounts = {};

  for (const table of tables) {
    const config = TABLES[table];
    const rows = await fetchTableRows(supabase, table);
    rowsByTable[table] = rows;
    tableCounts[table] = { totalRows: rows.length, supabaseRows: 0 };

    for (const row of rows) {
      const sourceKey = extractSupabaseObjectKey(row.image_url, bucket);
      if (!sourceKey || !sourceKey.startsWith(config.keyPrefix)) continue;

      tableCounts[table].supabaseRows += 1;
      const enriched = {
        ...row,
        table,
        sourceKey,
        includeCardVariant: config.includeCardVariant,
      };
      supabaseRows.push(enriched);
      requiredKeys.add(sourceKey);
      sourceRowsByKey.set(sourceKey, enriched);

      if (config.includeCardVariant) {
        requiredKeys.add(toCardVariantKey(sourceKey));
      }
    }
  }

  const storage = supabase.storage.from(bucket);
  const objectEntries = [];
  for (const table of tables) {
    const config = TABLES[table];
    const files = await listFolderRecursive(storage, config.keyPrefix.slice(0, -1));
    objectEntries.push(...files);
  }

  const uniqueEntries = new Map();
  for (const entry of objectEntries) {
    uniqueEntries.set(entry.key, entry);
  }

  const objects = Array.from(uniqueEntries.values());
  const objectKeys = new Set(objects.map((entry) => entry.key));
  const requiredObjects = objects.filter((entry) => requiredKeys.has(entry.key));
  const orphanObjects = objects.filter((entry) => !requiredKeys.has(entry.key));

  return {
    rowsByTable,
    supabaseRows,
    sourceRowsByKey,
    requiredKeys,
    objectKeys,
    objects,
    requiredObjects,
    orphanObjects,
    tableCounts,
  };
}

function printAudit(state, args) {
  const totalObjects = state.objects.reduce((sum, entry) => sum + entry.size, 0);
  const totalRequiredBytes = state.requiredObjects.reduce((sum, entry) => sum + entry.size, 0);
  const totalOrphanBytes = state.orphanObjects.reduce((sum, entry) => sum + entry.size, 0);

  console.log('[sync-storage] Audit');
  console.log(`- mode: ${args.apply ? 'LIVE' : 'DRY RUN'}`);
  console.log(`- selected tables: ${args.tables.join(', ')}`);
  for (const table of args.tables) {
    const counts = state.tableCounts[table] || { totalRows: 0, supabaseRows: 0 };
    console.log(`- ${table}: ${counts.totalRows} DB rows, ${counts.supabaseRows} still on Supabase Storage`);
  }
  console.log(`- bucket objects scanned: ${state.objects.length} (${bytesToMb(totalObjects)} MB)`);
  console.log(`- required objects: ${state.requiredObjects.length} (${bytesToMb(totalRequiredBytes)} MB)`);
  console.log(`- orphan objects: ${state.orphanObjects.length} (${bytesToMb(totalOrphanBytes)} MB)`);

  const orphanByFolder = new Map();
  for (const entry of state.orphanObjects) {
    const folder = entry.key.split('/').slice(0, 2).join('/');
    const bucket = orphanByFolder.get(folder) || { count: 0, bytes: 0 };
    bucket.count += 1;
    bucket.bytes += entry.size;
    orphanByFolder.set(folder, bucket);
  }
  const topFolders = Array.from(orphanByFolder.entries())
    .sort((a, b) => b[1].bytes - a[1].bytes)
    .slice(0, 10);

  if (topFolders.length > 0) {
    console.log('[sync-storage] Top orphan folders:');
    for (const [folder, stats] of topFolders) {
      console.log(`  - ${folder}: ${stats.count} objects (${bytesToMb(stats.bytes)} MB)`);
    }
  }
}

async function ensureObjectInR2({
  r2,
  r2Bucket,
  objectKey,
  contentType,
  bodyBuffer,
}) {
  await r2.send(new PutObjectCommand({
    Bucket: r2Bucket,
    Key: objectKey,
    Body: bodyBuffer,
    ContentType: contentType || inferContentType(objectKey),
    CacheControl: TARGET_CACHE_CONTROL,
  }));
}

async function migrateRows({
  supabase,
  storage,
  r2,
  r2Bucket,
  r2PublicBaseUrl,
  rows,
  objectKeys,
  limit,
  concurrency,
  apply,
}) {
  const selected = limit ? rows.slice(0, limit) : rows;
  console.log(`[sync-storage] Supabase-backed DB rows to migrate: ${selected.length}`);
  if (!selected.length) {
    return { updatedRows: 0, failedRows: 0, copiedVariants: 0 };
  }

  let updatedRows = 0;
  let failedRows = 0;
  let copiedVariants = 0;

  await mapLimit(selected, concurrency, async (row, index) => {
    const targetUrl = buildPublicUrl(r2PublicBaseUrl, row.sourceKey);
    const cardKey = row.includeCardVariant ? toCardVariantKey(row.sourceKey) : null;

    try {
      if (!apply) {
        updatedRows += 1;
        if (cardKey && objectKeys.has(cardKey)) copiedVariants += 1;
        return;
      }

      const sourceExists = await objectExists(r2, r2Bucket, row.sourceKey);
      let sourceBuffer = null;
      let sourceContentType = inferContentType(row.sourceKey);

      if (!sourceExists) {
        const { data: sourceBlob, error: sourceError } = await storage.download(row.sourceKey);
        if (sourceError || !sourceBlob) {
          throw new Error(sourceError?.message || 'source_download_failed');
        }
        sourceContentType = sourceBlob.type || sourceContentType;
        sourceBuffer = Buffer.from(await sourceBlob.arrayBuffer());
        await ensureObjectInR2({
          r2,
          r2Bucket,
          objectKey: row.sourceKey,
          contentType: sourceContentType,
          bodyBuffer: sourceBuffer,
        });
      }

      if (cardKey) {
        const cardExistsInR2 = await objectExists(r2, r2Bucket, cardKey);
        if (!cardExistsInR2) {
          if (objectKeys.has(cardKey)) {
            const { data: cardBlob, error: cardError } = await storage.download(cardKey);
            if (cardError || !cardBlob) {
              throw new Error(cardError?.message || 'card_download_failed');
            }
            const cardBuffer = Buffer.from(await cardBlob.arrayBuffer());
            await ensureObjectInR2({
              r2,
              r2Bucket,
              objectKey: cardKey,
              contentType: cardBlob.type || 'image/webp',
              bodyBuffer: cardBuffer,
            });
          } else {
            if (!sourceBuffer) {
              const { data: sourceBlob, error: sourceError } = await storage.download(row.sourceKey);
              if (sourceError || !sourceBlob) {
                throw new Error(sourceError?.message || 'source_download_failed');
              }
              sourceBuffer = Buffer.from(await sourceBlob.arrayBuffer());
            }
            const cardBuffer = await sharp(sourceBuffer)
              .rotate()
              .resize({ width: CARD_IMAGE_WIDTH, withoutEnlargement: true })
              .webp({ quality: CARD_IMAGE_QUALITY })
              .toBuffer();
            await ensureObjectInR2({
              r2,
              r2Bucket,
              objectKey: cardKey,
              contentType: 'image/webp',
              bodyBuffer: cardBuffer,
            });
          }
          copiedVariants += 1;
        }
      }

      const { error: updateError } = await supabase
        .from(row.table)
        .update({ image_url: targetUrl })
        .eq('id', row.id);
      if (updateError) {
        throw new Error(updateError.message);
      }

      updatedRows += 1;
    } catch (err) {
      failedRows += 1;
      if (failedRows <= 10) {
        console.error(
          `[sync-storage] Migrate failed for ${row.table}:${row.id} (${row.sourceKey}): ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    } finally {
      if (!apply && cardKey && !objectKeys.has(cardKey)) {
        copiedVariants += 1;
      }
      if ((index + 1) % 25 === 0 || index + 1 === selected.length) {
        console.log(`[sync-storage] migrate ${index + 1}/${selected.length} processed`);
      }
    }
  });

  return { updatedRows, failedRows, copiedVariants };
}

async function deleteOrphanObjects({
  storage,
  objects,
  limit,
  apply,
}) {
  const selected = limit ? objects.slice(0, limit) : objects;
  const totalBytes = selected.reduce((sum, entry) => sum + entry.size, 0);
  console.log(`[sync-storage] Orphan objects selected: ${selected.length} (${bytesToMb(totalBytes)} MB)`);

  if (!apply || selected.length === 0) {
    return { deleted: 0, failed: 0, selected: selected.length };
  }

  const chunks = [];
  for (let index = 0; index < selected.length; index += 100) {
    chunks.push(selected.slice(index, index + 100));
  }

  let deleted = 0;
  let failed = 0;

  for (let index = 0; index < chunks.length; index++) {
    const chunk = chunks[index];
    const paths = chunk.map((entry) => entry.key);
    const { data, error } = await storage.remove(paths);
    if (error) {
      failed += paths.length;
      if (failed <= 100) {
        console.error(`[sync-storage] Delete failed for chunk ${index + 1}: ${error.message}`);
      }
    } else {
      deleted += Array.isArray(data) ? data.length : paths.length;
    }
    console.log(`[sync-storage] delete chunk ${index + 1}/${chunks.length} processed`);
  }

  return { deleted, failed, selected: selected.length };
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
  const r2Bucket = requireEnv('R2_BUCKET');
  const bucket = (process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_SUPABASE_BUCKET).trim();
  const endpoint = (process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`).trim();

  const supabase = createClient(supabaseUrl, supabaseKey);
  const storage = supabase.storage.from(bucket);
  const r2 = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  let state = await collectState({ supabase, bucket, tables: args.tables });
  printAudit(state, args);

  if (!args.migrate && !args.deleteOrphans) {
    console.log('[sync-storage] No mutation mode selected. Use --migrate and/or --delete-orphans. Add --apply to execute.');
    return;
  }

  if (args.migrate) {
    const result = await migrateRows({
      supabase,
      storage,
      r2,
      r2Bucket,
      r2PublicBaseUrl,
      rows: state.supabaseRows,
      objectKeys: state.objectKeys,
      limit: args.limit,
      concurrency: args.concurrency,
      apply: args.apply,
    });
    console.log('[sync-storage] Migration summary');
    console.log(`- updated/would_update DB rows: ${result.updatedRows}`);
    console.log(`- copied/generated card variants: ${result.copiedVariants}`);
    console.log(`- failed: ${result.failedRows}`);

    if (args.apply) {
      state = await collectState({ supabase, bucket, tables: args.tables });
      printAudit(state, args);
    }
  }

  if (args.deleteOrphans) {
    const result = await deleteOrphanObjects({
      storage,
      objects: state.orphanObjects,
      limit: args.limit,
      apply: args.apply,
    });
    console.log('[sync-storage] Cleanup summary');
    console.log(`- deleted/would_delete: ${args.apply ? result.deleted : result.selected}`);
    console.log(`- failed: ${result.failed}`);
  }
}

main().catch((err) => {
  console.error('[sync-storage] Fatal:', err?.message || err);
  process.exit(1);
});
