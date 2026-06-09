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

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // ignore
    }
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

  const telLink = `tel:${bit.phone.replace(/\D/g, "")}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{he.bit.title}</CardTitle>
        <StatusBadge kind="payment" status={status} />
      </CardHeader>
      <CardBody className="space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}

        <div className="rounded-lg bg-slate-50 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {he.bit.amountToSend}
          </div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <div className="text-3xl font-bold text-slate-900">
              {formatCurrency(amount)}
            </div>
            <button
              type="button"
              onClick={() => copy("amount", amount.toFixed(2))}
              className="shrink-0 rounded-md border border-slate-300 bg-white p-2 text-slate-500 hover:bg-slate-50"
              aria-label={he.common.copy}
            >
              {copied === "amount" ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <dl className="space-y-3 text-sm">
          <Field
            label={he.bit.recipientPhone}
            value={bit.phone}
            onCopy={() => copy("phone", bit.phone)}
            copied={copied === "phone"}
            dir="ltr"
          />
          <Field
            label={he.bit.recipientName}
            value={bit.name}
            onCopy={() => copy("name", bit.name)}
            copied={copied === "name"}
          />
          <Field
            label={he.bit.reference}
            value={apartmentName}
            onCopy={() => copy("ref", apartmentName)}
            copied={copied === "ref"}
          />
        </dl>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
          {bit.instructions}
        </div>

        {/* עמודה צרה — כפתורים מלאים אחד מתחת לשני */}
        <div className="flex flex-col gap-3">
          <a
            href={telLink}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-center text-sm font-medium leading-normal text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1"
          >
            <Smartphone className="h-5 w-5 shrink-0" aria-hidden />
            <span>{he.bit.openBit}</span>
          </a>
          <Button
            variant="success"
            size="lg"
            fullWidth
            onClick={markPaid}
            disabled={busy || status === "PAID"}
            className="w-full whitespace-normal text-center"
          >
            <Check className="h-5 w-5 shrink-0" aria-hidden />
            <span>{status === "PAID" ? he.bit.paid : he.bit.markPaid}</span>
          </Button>
        </div>

        <p className="text-xs leading-relaxed text-slate-500">{he.bit.note}</p>
      </CardBody>
    </Card>
  );
}

function Field({
  label,
  value,
  onCopy,
  copied,
  dir,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied?: boolean;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
        <dd
          className="truncate font-mono text-sm font-medium text-slate-900"
          dir={dir}
        >
          {value}
        </dd>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 rounded-md border border-slate-300 bg-white p-2 text-slate-500 hover:bg-slate-50"
        aria-label={`${he.common.copy} ${label}`}
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
