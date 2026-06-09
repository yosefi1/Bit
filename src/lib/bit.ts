/**
 * Bit payment config (server). Opening the app with pre-filled amount is not
 * supported by Bit's public P2P API — see bit-utils.ts for clipboard + app link.
 */

import { prisma } from "./prisma";
import {
  buildBitClipboardText,
  buildBitOpenUrl,
  formatBitPhone,
  BIT_WEBSITE,
  type BitPaymentDetails,
} from "./bit-utils";

export type { BitPaymentDetails };
export { buildBitClipboardText, buildBitOpenUrl, formatBitPhone, BIT_WEBSITE };

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
    "לחץ «פתיחת ביט» — הסכום והפרטים יועתקו. הדבק/אשר בביט ושלח.",
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
