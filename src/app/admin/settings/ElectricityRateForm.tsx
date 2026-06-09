"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { formatRateAgorot, formatRateShekels } from "@/lib/utils";
import { agorotToShekels } from "@/lib/electricity-rate";
import { he } from "@/lib/i18n/he";

export function ElectricityRateForm({
  initialRateAgorot,
}: {
  initialRateAgorot: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(initialRateAgorot);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    const f = new FormData(e.currentTarget);
    const rateAgorot = Number(f.get("rateAgorot") || 0);
    try {
      const res = await fetch("/api/settings/electricity", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rateAgorot }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || he.errors.generic);
        return;
      }
      setSuccess(he.rate.updated);
      setPreview(rateAgorot);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert tone="danger">{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}

      <div>
        <Label htmlFor="rateAgorot">{he.rate.label}</Label>
        <Input
          id="rateAgorot"
          name="rateAgorot"
          type="number"
          step="0.01"
          min={0.01}
          required
          defaultValue={initialRateAgorot}
          onChange={(e) => setPreview(Number(e.target.value) || 0)}
          className="mt-1"
        />
        <p className="mt-1 text-xs text-slate-500">{he.rate.hint}</p>
      </div>

      <div className="rounded-lg border border-brand-100 bg-brand-50 p-3 text-sm text-brand-900">
        <div className="font-medium">{formatRateAgorot(preview)}</div>
        <div className="text-xs text-brand-700">
          = {formatRateShekels(agorotToShekels(preview))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? he.common.saving : he.common.save}
        </Button>
      </div>
    </form>
  );
}
