export function validateRequired(fields: Array<{ value: string | null | undefined; label: string }>) {
  const missing = fields.filter((field) => !(field.value ?? '').trim()).map((field) => field.label);
  if (missing.length === 0) return null;
  return `Campurile obligatorii lipsesc: ${missing.join(', ')}.`;
}

export function validatePhone(phone: string) {
  const clean = phone.replace(/\s+/g, '');
  const valid = /^\+?[0-9\-()]{6,20}$/.test(clean);
  return valid ? null : 'Format telefon invalid.';
}

export function validateImagesCount(count: number, min: number, max: number) {
  if (count < min) return `Adauga cel putin ${min} imagini (maxim ${max}).`;
  if (count > max) return `Poti incarca maximum ${max} imagini.`;
  return null;
}

export function validateDescriptionLength(description: string, min: number, max: number) {
  const trimmed = description.trim();
  if (trimmed.length < min) return `Descrierea trebuie sa aiba minim ${min} caractere.`;
  if (trimmed.length > max) return `Descrierea trebuie sa aiba maxim ${max} caractere.`;
  return null;
}

export function validateCapacity(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return null;
  if (/^\d+\s*[-/–—]\s*\d+$/.test(trimmed)) return null;
  if (/^\d+\s*\+$/.test(trimmed)) return null;
  return 'Capacitate invalida. Exemplu: 2-4, 2/4 sau 4+.';
}
