/**
 * Ensures Prisma can validate the schema during `prisma generate` on Vercel
 * even before Storage/Neon is connected. A real DATABASE_URL in project
 * settings always overrides this placeholder.
 */
export const PLACEHOLDER_DATABASE_URL =
  "postgresql://build:build@127.0.0.1:5432/build?schema=public";

export function ensureDatabaseUrlEnv() {
  const current = process.env.DATABASE_URL?.trim();
  if (!current || !/^postgres(ql)?:\/\//i.test(current)) {
    process.env.DATABASE_URL = PLACEHOLDER_DATABASE_URL;
    return false;
  }
  return true;
}

export function hasRealDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  return !!url && url !== PLACEHOLDER_DATABASE_URL;
}
