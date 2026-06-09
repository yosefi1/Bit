import { execSync } from "node:child_process";
import { ensureDatabaseUrlEnv, hasRealDatabaseUrl } from "./db-env.mjs";

ensureDatabaseUrlEnv();

execSync("npx prisma generate", { stdio: "inherit", env: process.env });

if (hasRealDatabaseUrl()) {
  try {
    console.log("[build] Applying schema to database...");
    execSync("npx prisma db push --skip-generate", {
      stdio: "inherit",
      env: process.env,
    });
  } catch (err) {
    console.warn("[build] db push failed — connect Storage and redeploy.");
    console.warn(err instanceof Error ? err.message : err);
  }
} else {
  console.warn(
    "[build] No real DATABASE_URL — skipping db push. Add Neon via Storage, then Redeploy."
  );
}

execSync("npx next build", { stdio: "inherit", env: process.env });
