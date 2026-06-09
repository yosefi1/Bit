/**
 * During Vercel "Deploy first, connect DB later" flow, DATABASE_URL may be
 * missing or invalid on early builds. Never fail the build because of db push.
 */
import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL?.trim();

if (!url) {
  console.warn(
    "[build] DATABASE_URL not set — skipping db push. " +
      "Connect Postgres in Vercel Storage, then Redeploy."
  );
  process.exit(0);
}

try {
  console.log("[build] DATABASE_URL found — applying schema...");
  execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
  console.log("[build] Schema applied.");
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(
    "[build] db push failed (DB not ready yet?) — continuing build anyway.\n",
    msg
  );
}
