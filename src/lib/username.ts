/** Normalize username for storage and login lookup. Latin usernames are lowercased. */
export function normalizeUsername(raw: string): string {
  const trimmed = raw.trim().normalize("NFC");
  if (/^[a-zA-Z0-9._-]+$/.test(trimmed)) return trimmed.toLowerCase();
  return trimmed;
}

export const USERNAME_REGEX = /^[\p{L}\p{N}._-]{3,40}$/u;

export function isValidUsername(raw: string): boolean {
  return USERNAME_REGEX.test(raw.trim().normalize("NFC"));
}
