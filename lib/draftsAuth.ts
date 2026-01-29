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

  const fallbackUser = process.env.DRAFTS_BASIC_USER || "admin";
  const fallbackPass = process.env.DRAFTS_BASIC_PASS || "Parola123*";
  return [{ username: fallbackUser, password: fallbackPass, role: "admin" }];
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
  return { encoded, role: user.role };
}

export function getRoleFromEncodedAuth(encoded: string | null | undefined) {
  if (!encoded) return null;
  const users = getDraftUsers();
  for (const user of users) {
    const expected = encodeBasicAuth(`${user.username}:${user.password}`);
    if (expected === encoded) return user.role;
  }
  return null;
}

export function verifyDraftCredentials(username: string, password: string) {
  const users = getDraftUsers();
  const user = users.find((u) => u.username === username && u.password === password);
  if (!user) return null;
  const encoded = encodeBasicAuth(`${username}:${password}`);
  return { role: user.role, encoded };
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

export function getDraftRoleFromRequest(request: Request) {
  const fromHeader = getDraftAuthFromHeader(request.headers.get("authorization"));
  if (fromHeader?.role) return fromHeader.role;
  const cookieHeader = request.headers.get("cookie");
  const encoded = getCookieValue(cookieHeader, "drafts_auth");
  return getRoleFromEncodedAuth(encoded);
}
