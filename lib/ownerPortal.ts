export function formatOwnerDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ro-RO", {
    timeZone: "Europe/Bucharest",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export class OwnerRequestError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = "OwnerRequestError";
  }
}

export async function readOwnerResponse(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) {
      throw new OwnerRequestError("Sesiunea nu mai este validă. Confirmă din nou emailul pentru a continua.", 401);
    }
    throw new OwnerRequestError(body?.error || body?.message || "Cererea nu a putut fi procesată.", response.status, body?.code);
  }
  return body;
}
