export interface BitPaymentDetails {
  phone: string;
  name: string;
  amount: number;
  reference: string;
}

export function formatBitPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("972")) return `0${digits.slice(3)}`;
  if (digits.startsWith("0")) return digits;
  return digits;
}

export function buildBitClipboardText(details: BitPaymentDetails): string {
  const phone = formatBitPhone(details.phone);
  const amount = details.amount.toFixed(2);
  return `סכום: ₪${amount}\nטלפון: ${phone}\nשם: ${details.name}\nהערה: ${details.reference}`;
}

export function buildBitOpenUrl(userAgent?: string): string {
  const ua = userAgent ?? "";
  if (/android/i.test(ua)) {
    return "intent://#Intent;scheme=bit;package=com.bnhp.payments.paymentsapp;S.browser_fallback_url=https://www.bitpay.co.il/;end";
  }
  return "https://www.bitpay.co.il/";
}

export const BIT_WEBSITE = "https://www.bitpay.co.il/";
