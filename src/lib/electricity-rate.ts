import { prisma } from "./prisma";

/** מפתח בהגדרות — מחיר ב**אגורות** לקו"ח (למשל 64.32) */
export const ELECTRICITY_RATE_AGOROT_KEY = "electricity.rateAgorot";

/** ברירת מחדל: 64.32 אגורות לקו"ח (= 0.6432 ₪) */
export const DEFAULT_RATE_AGOROT = 64.32;

export function agorotToShekels(agorot: number): number {
  return Math.round(agorot * 100) / 10000;
}

export function shekelsToAgorot(shekels: number): number {
  return Math.round(shekels * 100 * 100) / 100;
}

/** מחזיר את המחיר הנוכחי באגורות (לתצוגה / עריכה על ידי מנהל בלבד). */
export async function getElectricityRateAgorot(): Promise<number> {
  const row = await prisma.appSetting.findUnique({
    where: { key: ELECTRICITY_RATE_AGOROT_KEY },
  });
  if (!row) return DEFAULT_RATE_AGOROT;
  const n = Number(row.value);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_RATE_AGOROT;
}

/** מחזיר את המחיר בשקלים לקו"ח — משמש לחישוב סכום לתשלום. */
export async function getElectricityRateShekels(): Promise<number> {
  return agorotToShekels(await getElectricityRateAgorot());
}

/** עדכון מחיר — רק דרך API של מנהל. */
export async function setElectricityRateAgorot(agorot: number): Promise<number> {
  const value = String(agorot);
  await prisma.appSetting.upsert({
    where: { key: ELECTRICITY_RATE_AGOROT_KEY },
    create: { key: ELECTRICITY_RATE_AGOROT_KEY, value },
    update: { value },
  });
  return agorot;
}
