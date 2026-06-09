/**
 * During Vercel "Deploy first, connect DB later" flow, DATABASE_URL may be
 * missing on the first build. Skip db push in that case; tables are created
 * on the next deploy after Storage/Neon is connected.
 */
import { execSync } from "node:child_process";

if (process.env.DATABASE_URL) {
  console.log("[build] DATABASE_URL found — applying schema...");
  execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
} else {
  console.warn(
    "[build] DATABASE_URL not set — skipping db push. " +
      "Connect Postgres in Vercel Storage, then Redeploy."
  );
}
