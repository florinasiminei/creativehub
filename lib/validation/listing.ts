export function validateRequired(fields: Array<{ value: string | null | undefined; label: string }>) {
  const missing = fields.filter((f) => !(f.value ?? '').trim()).map((f) => f.label);
  if (missing.length === 0) return null;
  return `Câmpurile obligatorii lipsesc: ${missing.join(', ')}.`;
}

export function validatePhone(phone: string) {
  const clean = phone.replace(/\s+/g, '');
  const valid = /^\+?[0-9\-()]{6,20}$/.test(clean);
  return valid ? null : 'Format telefon invalid.';
}

export function validateImagesCount(count: number, min: number, max: number) {
  if (count < min) return `Adaugă cel puțin ${min} imagini (maxim ${max}).`;
  if (count > max) return `Poți încărca maximum ${max} imagini.`;
  return null;
}

export function validateDescriptionLength(description: string, min: number, max: number) {
  const trimmed = description.trim();
  if (trimmed.length < min) return `Descrierea trebuie sa aiba minim ${min} caractere.`;
  if (trimmed.length > max) return `Descrierea trebuie sa aiba maxim ${max} caractere.`;
  return null;
}
