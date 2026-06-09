"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { formatKwh } from "@/lib/utils";
import { he } from "@/lib/i18n/he";

export function NewCycleForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [prev, setPrev] = useState(0);
  const [curr, setCurr] = useState(0);

  const consumptionPreview = useMemo(() => {
    const cons = curr - prev;
    if (cons <= 0) return null;
    return cons;
  }, [prev, curr]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const f = new FormData(e.currentTarget);
    const payload = {
      label: String(f.get("label") || ""),
      utility: "ELECTRICITY",
      totalBillAmount: Number(f.get("totalBillAmount") || 0),
      masterMeterPrevious: Number(f.get("masterMeterPrevious") || 0),
      masterMeterCurrent: Number(f.get("masterMeterCurrent") || 0),
      startDate: String(f.get("startDate") || ""),
      endDate: String(f.get("endDate") || ""),
      notes: String(f.get("notes") || "") || null,
    };
    try {
      const res = await fetch("/api/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || he.errors.generic);
        return;
      }
      router.push(`/admin/cycles/${data.cycle.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
  const defaultLabel = `${now.toLocaleString("he", { month: "long" })} ${now.getFullYear()}`;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && <Alert tone="danger">{error}</Alert>}

      <div>
        <Label htmlFor="label">{he.admin.cycles.label}</Label>
        <Input
          id="label"
          name="label"
          defaultValue={defaultLabel}
          required
          className="mt-1"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="startDate">{he.admin.cycles.startDate}</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={monthStart}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="endDate">{he.admin.cycles.endDate}</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={monthEnd}
            required
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="totalBillAmount" hint="₪">
          {he.admin.cycles.totalBill}
        </Label>
        <Input
          id="totalBillAmount"
          name="totalBillAmount"
          type="number"
          step="0.01"
          min={0.01}
          required
          className="mt-1"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="masterMeterPrevious" hint="קו״ח">
            {he.admin.cycles.masterPrev}
          </Label>
          <Input
            id="masterMeterPrevious"
            name="masterMeterPrevious"
            type="number"
            step="0.01"
            min={0}
            required
            onChange={(e) => setPrev(Number(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="masterMeterCurrent" hint="קו״ח">
            {he.admin.cycles.masterCurr}
          </Label>
          <Input
            id="masterMeterCurrent"
            name="masterMeterCurrent"
            type="number"
            step="0.01"
            min={0}
            required
            onChange={(e) => setCurr(Number(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
      </div>

      {consumptionPreview != null && (
        <div className="rounded-lg border border-brand-100 bg-brand-50 p-4 text-sm">
          <div className="font-semibold text-brand-900">{he.admin.cycles.autoCalc}</div>
          <dl className="mt-2 text-brand-900">
            <div>
              <dt className="text-xs uppercase tracking-wide text-brand-700">
                {he.admin.cycles.consumptionPreview}
              </dt>
              <dd className="text-base font-medium">
                {formatKwh(consumptionPreview)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-brand-800">{he.admin.cycles.rateNote}</p>
        </div>
      )}

      <div>
        <Label htmlFor="notes">{he.common.notes}</Label>
        <Textarea id="notes" name="notes" rows={2} className="mt-1" />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => history.back()}>
          {he.common.cancel}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? he.common.creating : he.admin.cycles.createCycle}
        </Button>
      </div>
    </form>
  );
}
