#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  CopyObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';

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
    concurrency: 8,
    prefix: '',
    target: 'public, max-age=31536000, immutable',
  };

  for (const arg of argv) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg.startsWith('--limit=')) args.limit = Number(arg.slice('--limit='.length));
    else if (arg.startsWith('--concurrency=')) args.concurrency = Number(arg.slice('--concurrency='.length));
    else if (arg.startsWith('--prefix=')) args.prefix = arg.slice('--prefix='.length);
    else if (arg.startsWith('--target=')) args.target = arg.slice('--target='.length);
  }

  if (!Number.isFinite(args.limit) || args.limit <= 0) args.limit = null;
  if (!Number.isFinite(args.concurrency) || args.concurrency < 1) args.concurrency = 8;
  return args;
}

function requireEnv(name) {
  const value = (process.env[name] || '').trim();
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function shouldUpdateCacheControl(current, target) {
  const normalizedCurrent = String(current || '').trim().toLowerCase();
  const normalizedTarget = String(target || '').trim().toLowerCase();
  if (!normalizedCurrent) return true;
  if (normalizedCurrent.includes('undefined')) return true;
  return normalizedCurrent !== normalizedTarget;
}

function encodeCopySource(bucket, key) {
  const encodedKey = key
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `${bucket}/${encodedKey}`;
}

async function mapLimit(items, limit, worker) {
  let idx = 0;
  async function runner() {
    while (idx < items.length) {
      const i = idx++;
      await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runner()));
}

async function main() {
  loadDotEnv();
  const args = parseArgs(process.argv.slice(2));

  const accountId = requireEnv('R2_ACCOUNT_ID');
  const accessKeyId = requireEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('R2_SECRET_ACCESS_KEY');
  const bucket = requireEnv('R2_BUCKET');
  const endpoint = (process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`).trim();

  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  const keys = [];
  let continuationToken;
  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: args.prefix || undefined,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })
    );
    for (const item of res.Contents || []) {
      if (item.Key) keys.push(item.Key);
      if (args.limit && keys.length >= args.limit) break;
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken && (!args.limit || keys.length < args.limit));

  console.log(`[r2-cache] Objects scanned: ${keys.length}`);
  console.log(`[r2-cache] Mode: ${args.dryRun ? 'DRY RUN' : 'LIVE'} | target="${args.target}"`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  await mapLimit(keys, args.concurrency, async (key, index) => {
    try {
      const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      const current = head.CacheControl || '';
      const needsUpdate = shouldUpdateCacheControl(current, args.target);
      if (!needsUpdate) {
        skipped += 1;
        return;
      }

      if (args.dryRun) {
        updated += 1;
        return;
      }

      await client.send(
        new CopyObjectCommand({
          Bucket: bucket,
          Key: key,
          CopySource: encodeCopySource(bucket, key),
          MetadataDirective: 'REPLACE',
          CacheControl: args.target,
          ContentType: head.ContentType || 'application/octet-stream',
          ContentDisposition: head.ContentDisposition,
          ContentEncoding: head.ContentEncoding,
          ContentLanguage: head.ContentLanguage,
          Expires: head.Expires,
          Metadata: head.Metadata || {},
        })
      );

      updated += 1;
    } catch (err) {
      failed += 1;
      if (failed <= 10) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[r2-cache] Failed for ${key}: ${msg}`);
      }
    } finally {
      if ((index + 1) % 100 === 0 || index + 1 === keys.length) {
        console.log(`[r2-cache] ${index + 1}/${keys.length} processed`);
      }
    }
  });

  console.log('\n[r2-cache] Finished');
  console.log(`- updated/would_update: ${updated}`);
  console.log(`- skipped: ${skipped}`);
  console.log(`- failed: ${failed}`);
}

main().catch((err) => {
  console.error('[r2-cache] Fatal:', err?.message || err);
  process.exit(1);
});
