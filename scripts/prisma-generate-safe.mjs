import { execSync } from "node:child_process";
import { ensureDatabaseUrlEnv } from "./db-env.mjs";

const hasReal = ensureDatabaseUrlEnv();
if (!hasReal) {
  console.warn(
    "[postinstall] Using placeholder DATABASE_URL for prisma generate only."
  );
}

execSync("npx prisma generate", { stdio: "inherit", env: process.env });
