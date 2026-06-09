"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Smartphone, Copy, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { he } from "@/lib/i18n/he";
import {
  buildBitClipboardText,
  buildBitOpenUrl,
  formatBitPhone,
} from "@/lib/bit-utils";

interface BitConfig {
  phone: string;
  name: string;
  instructions: string;
}

export function PayWithBit({
  submissionId,
  amount,
  apartmentName,
  status,
  bit,
}: {
  submissionId: string;
  amount: number;
  apartmentName: string;
  status: "PENDING" | "PAID" | "CANCELLED";
  bit: BitConfig;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);

  const phone = formatBitPhone(bit.phone);
  const paymentText = buildBitClipboardText({
    phone,
    name: bit.name,
    amount,
    reference: apartmentName,
  });

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // ignore
    }
  }

  async function openBit() {
    await copy("all", paymentText);
    setOpened(true);
    const url = buildBitOpenUrl(navigator.userAgent);
    window.location.href = url;
  }

  async function markPaid() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/payments/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID", method: "bit" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || he.errors.generic);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{he.bit.title}</CardTitle>
        <StatusBadge kind="payment" status={status} />
      </CardHeader>
      <CardBody className="space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}
        {opened && (
          <Alert tone="success" title={he.bit.copiedTitle}>
            {he.bit.copiedDesc}
          </Alert>
        )}

        <div className="rounded-lg bg-brand-50 p-4 text-center">
          <div className="text-xs uppercase tracking-wide text-brand-700">
            {he.bit.amountToSend}
          </div>
          <div className="mt-1 text-3xl font-bold text-brand-900" dir="ltr">
            {formatCurrency(amount)}
          </div>
          <div className="mt-2 text-sm text-brand-800" dir="ltr">
            {phone} · {bit.name}
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
          {bit.instructions}
        </div>

        <div className="flex flex-col gap-3">
          <Button
            type="button"
            size="lg"
            fullWidth
            onClick={openBit}
            disabled={status === "PAID"}
            className="min-h-14"
          >
            <Smartphone className="h-5 w-5 shrink-0" />
            {he.bit.openBitPay}
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={() => copy("amount", amount.toFixed(2))}
          >
            {copied === "amount" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {he.bit.copyAmount}
          </Button>
          <Button
            variant="success"
            size="lg"
            fullWidth
            onClick={markPaid}
            disabled={busy || status === "PAID"}
          >
            <Check className="h-5 w-5 shrink-0" />
            {status === "PAID" ? he.bit.paid : he.bit.markPaid}
          </Button>
        </div>

        <p className="text-xs leading-relaxed text-slate-500">{he.bit.note}</p>
      </CardBody>
    </Card>
  );
}
