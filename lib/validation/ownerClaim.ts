import { validatePhone } from "@/lib/validation/listing";

export const OWNER_CLAIM_LIMITS = {
  fullName: 100,
  phone: 30,
  message: 500,
} as const;

export const OWNER_CLAIM_ROLES = [
  { value: "owner", label: "Proprietar" },
  { value: "administrator", label: "Administrator" },
  { value: "representative", label: "Reprezentant" },
] as const;

export type OwnerClaimDetails = {
  fullName: string;
  phone: string;
  role: string;
  message: string;
};

export type OwnerClaimErrors = Partial<Record<keyof OwnerClaimDetails, string>>;

export function validateOwnerClaimDetails(input: {
  fullName?: unknown;
  phone?: unknown;
  role?: unknown;
  message?: unknown;
}) {
  const details: OwnerClaimDetails = {
    fullName: typeof input.fullName === "string" ? input.fullName.trim().replace(/\s+/g, " ") : "",
    phone: typeof input.phone === "string" ? input.phone.trim() : "",
    role: typeof input.role === "string" ? input.role.trim() : "",
    message: typeof input.message === "string" ? input.message.trim() : "",
  };
  const errors: OwnerClaimErrors = {};

  if (details.fullName.length < 3 || details.fullName.split(" ").length < 2) {
    errors.fullName = "Completează numele și prenumele.";
  } else if (details.fullName.length > OWNER_CLAIM_LIMITS.fullName) {
    errors.fullName = `Numele complet poate avea maximum ${OWNER_CLAIM_LIMITS.fullName} de caractere.`;
  }

  const phoneDigits = details.phone.replace(/\D/g, "");
  if (!details.phone) {
    errors.phone = "Completează numărul de telefon.";
  } else if (
    details.phone.length > OWNER_CLAIM_LIMITS.phone ||
    validatePhone(details.phone) ||
    phoneDigits.length < 7 ||
    phoneDigits.length > 15
  ) {
    errors.phone = "Introdu un număr de telefon valid, de exemplu 0722 123 456 sau +40 722 123 456.";
  }

  if (!OWNER_CLAIM_ROLES.some((role) => role.value === details.role)) {
    errors.role = "Selectează calitatea în care soliciți acces.";
  }

  if (input.message !== undefined && typeof input.message !== "string") {
    errors.message = "Detaliile suplimentare trebuie să fie text.";
  } else if (details.message.length > OWNER_CLAIM_LIMITS.message) {
    errors.message = `Detaliile pot avea maximum ${OWNER_CLAIM_LIMITS.message} de caractere.`;
  }

  return { details, errors };
}

export function formatOwnerClaimMessage(details: OwnerClaimDetails) {
  const roleLabel = OWNER_CLAIM_ROLES.find((role) => role.value === details.role)?.label || details.role;
  const contact = [
    `Nume și prenume: ${details.fullName}`,
    `Telefon: ${details.phone}`,
    `Calitate: ${roleLabel}`,
  ].join(" · ");

  return details.message ? `${contact}\n\nDetalii: ${details.message}` : contact;
}
