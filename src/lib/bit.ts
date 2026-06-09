/**
 * Bit (the Israeli P2P payment app) does not currently expose a public
 * deep-link spec for pre-filling amounts. The best we can do is:
 *
 *   1. Show the user the exact amount, phone number, and recipient name
 *      so they can confirm in the Bit app.
 *   2. Open Bit via a `tel:` link on mobile (jumps to the dialer where
 *      the user can paste the number into Bit), or the Bit website on
 *      desktop.
 *
 * If/when Bit publishes a deep-link spec, only this file needs to change.
 */

import { prisma } from "./prisma";

export interface BitConfig {
  phone: string;
  name: string;
  instructions: string;
}

export const BIT_SETTING_KEYS = {
  phone: "bit.phone",
  name: "bit.name",
  instructions: "bit.instructions",
} as const;

const DEFAULTS: BitConfig = {
  phone: process.env.BIT_PHONE ?? "0500000000",
  name: process.env.BIT_RECIPIENT_NAME ?? "בעל הדירות",
  instructions:
    "פתח את אפליקציית ביט, שלח את הסכום המוצג למספר הטלפון, " +
    "והוסף את שם הדירה בהערה. לאחר השליחה סמן את הדיווח כשולם.",
};

export async function getBitConfig(): Promise<BitConfig> {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: Object.values(BIT_SETTING_KEYS) } },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    phone: map.get(BIT_SETTING_KEYS.phone) ?? DEFAULTS.phone,
    name: map.get(BIT_SETTING_KEYS.name) ?? DEFAULTS.name,
    instructions: map.get(BIT_SETTING_KEYS.instructions) ?? DEFAULTS.instructions,
  };
}

export async function setBitConfig(cfg: Partial<BitConfig>): Promise<BitConfig> {
  const entries: Array<[string, string]> = [];
  if (cfg.phone !== undefined) entries.push([BIT_SETTING_KEYS.phone, cfg.phone]);
  if (cfg.name !== undefined) entries.push([BIT_SETTING_KEYS.name, cfg.name]);
  if (cfg.instructions !== undefined)
    entries.push([BIT_SETTING_KEYS.instructions, cfg.instructions]);

  for (const [key, value] of entries) {
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
  return getBitConfig();
}

/**
 * Best-effort link to open Bit. On mobile, `tel:` opens the dialer where the
 * user can paste/use the number. On desktop, we link to bitpay.co.il.
 *
 * If Bit later publishes a proper deep link (e.g. `bit://send?phone=...&amount=...`),
 * update `buildBitPayUrl` accordingly.
 */
export function buildBitPayUrl(opts: { phone: string; amount: number }): string {
  const phone = opts.phone.replace(/\D/g, "");
  return `tel:${phone}`;
}

export const BIT_WEBSITE = "https://www.bitpay.co.il/";
