"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { he, paymentStatusLabel } from "@/lib/i18n/he";

type Status = "PENDING" | "PAID" | "CANCELLED";

export function PaymentControls({
  submissionId,
  payment,
}: {
  submissionId: string;
  payment: {
    amount: number;
    status: Status;
    method: string | null;
    reference: string | null;
    notes: string | null;
    paidAt: string | null;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function update(form: HTMLFormElement, override?: Partial<{ status: Status }>) {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const f = new FormData(form);
      const payload = {
        status: override?.status ?? (String(f.get("status") || payment.status) as Status),
        method: String(f.get("method") || "") || null,
        reference: String(f.get("reference") || "") || null,
        notes: String(f.get("notes") || "") || null,
      };
      const res = await fetch(`/api/payments/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || he.errors.generic);
        return;
      }
      setSuccess(he.admin.submissions.paymentUpdated);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{he.admin.submissions.payment}</CardTitle>
        <StatusBadge kind="payment" status={payment.status} />
      </CardHeader>
      <CardBody>
        <form
          id="payment-form"
          onSubmit={(e) => {
            e.preventDefault();
            update(e.currentTarget);
          }}
          className="space-y-4"
        >
          {error && <Alert tone="danger">{error}</Alert>}
          {success && <Alert tone="success">{success}</Alert>}

          <div className="rounded-lg bg-slate-50 p-4 text-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              {he.admin.submissions.amountDue}
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {formatCurrency(payment.amount)}
            </div>
            {payment.paidAt && (
              <div className="mt-1 text-xs text-slate-500">
                {he.admin.submissions.paidAt}: {formatDateTime(payment.paidAt)}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="status">{he.common.status}</Label>
              <select
                id="status"
                name="status"
                defaultValue={payment.status}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm"
              >
                <option value="PENDING">{paymentStatusLabel("PENDING")}</option>
                <option value="PAID">{paymentStatusLabel("PAID")}</option>
                <option value="CANCELLED">{paymentStatusLabel("CANCELLED")}</option>
              </select>
            </div>
            <div>
              <Label htmlFor="method" hint={he.common.optional}>
                {he.admin.submissions.method}
              </Label>
              <Input
                id="method"
                name="method"
                defaultValue={payment.method ?? "bit"}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="reference" hint={he.common.optional}>
              {he.admin.submissions.referenceLabel}
            </Label>
            <Input
              id="reference"
              name="reference"
              defaultValue={payment.reference ?? ""}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="notes">{he.common.notes}</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={payment.notes ?? ""}
              rows={2}
              className="mt-1"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="outline" disabled={loading}>
              {he.common.save}
            </Button>
            <Button
              type="button"
              variant="success"
              disabled={loading || payment.status === "PAID"}
              onClick={() => {
                const form = document.getElementById("payment-form") as HTMLFormElement;
                update(form, { status: "PAID" });
              }}
            >
              {he.admin.submissions.markPaid}
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={loading || payment.status === "CANCELLED"}
              onClick={() => {
                const form = document.getElementById("payment-form") as HTMLFormElement;
                update(form, { status: "CANCELLED" });
              }}
            >
              {he.admin.submissions.cancelPayment}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
