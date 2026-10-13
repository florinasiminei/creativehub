import 'server-only';

export const DRAFT_SESSION_MAX_AGE = 60 * 60 * 8;

type DraftUser = {
  username: string;
  password: string;
  role: string;
};

const splitEntries = (raw: string) =>
  raw
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean);

export function getDraftUsers(): DraftUser[] {
  const raw = process.env.DRAFTS_USERS?.trim();
  if (raw) {
    const parsed = splitEntries(raw)
      .map((entry) => {
        const [username, password, roleRaw] = entry.split(":");
        if (!username || !password) return null;
        const role = (roleRaw || "admin").toLowerCase();
        return { username, password, role };
      })
      .filter(Boolean) as DraftUser[];
    if (parsed.length > 0) return parsed;
  }

  const fallbackUser = process.env.DRAFTS_BASIC_USER?.trim();
  const fallbackPass = process.env.DRAFTS_BASIC_PASS?.trim();
  if (fallbackUser && fallbackPass) {
    return [{ username: fallbackUser, password: fallbackPass, role: "admin" }];
  }

  return [];
}

export function encodeBasicAuth(input: string) {
  if (typeof btoa !== "undefined") return btoa(input);
  return Buffer.from(input).toString("base64");
}

export function decodeBasicAuth(input: string) {
  if (typeof atob !== "undefined") return atob(input);
  return Buffer.from(input, "base64").toString("utf-8");
}

export function getDraftAuthFromHeader(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Basic ")) return null;
  const encoded = authHeader.slice(6).trim();
  let decoded = "";
  try {
    decoded = decodeBasicAuth(encoded);
  } catch {
    return null;
  }
  const sep = decoded.indexOf(":");
  if (sep === -1) return null;
  const username = decoded.slice(0, sep);
  const password = decoded.slice(sep + 1);
  const user = getDraftUsers().find(
    (u) => u.username === username && u.password === password
  );
  if (!user) return null;
  return { username: user.username, role: user.role };
}

let sessionKeyCache: { configuration: string; key: Promise<CryptoKey> } | null = null;

function getSessionKey() {
  const configuration = JSON.stringify(getDraftUsers());
  if (!sessionKeyCache || sessionKeyCache.configuration !== configuration) {
    const key = crypto.subtle.importKey(
      'raw', new TextEncoder().encode(configuration), 'PBKDF2', false, ['deriveKey']
    ).then((material) => crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: new TextEncoder().encode('cabn:backoffice-session:v1'), iterations: 600_000, hash: 'SHA-256' },
      material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    ));
    sessionKeyCache = { configuration, key };
  }
  return sessionKeyCache.key;
}

function encodeSessionBytes(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeSessionBytes(encoded: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error('Invalid session');
  return Uint8Array.from(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0));
}

export async function createDraftSession(identity: { username: string; role: string }) {
  const user = getDraftUsers().find((entry) => entry.username === identity.username && entry.role === identity.role);
  if (!user) throw new Error('Invalid session identity');
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = new TextEncoder().encode(JSON.stringify({ username: user.username, role: user.role, iat: issuedAt, exp: issuedAt + DRAFT_SESSION_MAX_AGE }));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await getSessionKey(), payload);
  return `v1.${encodeSessionBytes(iv)}.${encodeSessionBytes(new Uint8Array(encrypted))}`;
}

export async function getRoleFromEncodedAuth(encoded: string | null | undefined) {
  if (!encoded || encoded.length > 2048) return null;
  const [version, nonce, ciphertext, extra] = encoded.split('.');
  if (version !== 'v1' || !nonce || !ciphertext || extra !== undefined) return null;
  try {
    const iv = decodeSessionBytes(nonce);
    if (iv.byteLength !== 12) return null;
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await getSessionKey(), decodeSessionBytes(ciphertext));
    const session = JSON.parse(new TextDecoder().decode(decrypted));
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isSafeInteger(session.iat) || !Number.isSafeInteger(session.exp) || session.iat > now + 60 || session.exp <= now || session.exp - session.iat !== DRAFT_SESSION_MAX_AGE) return null;
    const user = getDraftUsers().find((entry) => entry.username === session.username && entry.role === session.role);
    return user?.role || null;
  } catch {
    return null;
  }
}

export function verifyDraftCredentials(username: string, password: string) {
  const users = getDraftUsers();
  const user = users.find((u) => u.username === username && u.password === password);
  if (!user) return null;
  return { role: user.role, username: user.username };
}

export function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((part) => part.trim());
  for (const part of parts) {
    if (!part.startsWith(`${name}=`)) continue;
    const raw = part.slice(name.length + 1);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

export async function getDraftRoleFromRequest(request: Pick<Request, 'headers'>) {
  const fromHeader = getDraftAuthFromHeader(request.headers.get("authorization"));
  if (fromHeader?.role) return fromHeader.role;
  const cookieHeader = request.headers.get("cookie");
  const encoded = getCookieValue(cookieHeader, "drafts_auth");
  return getRoleFromEncodedAuth(encoded);
}
