"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { he } from "@/lib/i18n/he";
import { normalizeUsername } from "@/lib/username";

export function NewApartmentForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createTenant, setCreateTenant] = useState(true);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const f = new FormData(e.currentTarget);

    const payload: Record<string, unknown> = {
      name: String(f.get("name") || ""),
      notes: String(f.get("notes") || "") || null,
      status: String(f.get("status") || "ACTIVE"),
      initialMeterReading: Number(f.get("initialMeterReading") || 0),
    };
    if (createTenant) {
      payload.tenant = {
        name: String(f.get("tenantName") || ""),
        username: normalizeUsername(String(f.get("tenantUsername") || "")),
        password: String(f.get("tenantPassword") || ""),
        email: String(f.get("tenantEmail") || "") || null,
      };
    }

    try {
      const res = await fetch("/api/apartments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || he.admin.apartments.createFailed);
        return;
      }
      router.push(`/admin/apartments/${data.apartment.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && <Alert tone="danger">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">{he.admin.apartments.name}</Label>
          <Input
            id="name"
            name="name"
            required
            className="mt-1"
            placeholder={he.admin.apartments.placeholderApt}
          />
        </div>
        <div>
          <Label htmlFor="status">{he.common.status}</Label>
          <select
            id="status"
            name="status"
            defaultValue="ACTIVE"
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            <option value="ACTIVE">{he.status.apartment.ACTIVE}</option>
            <option value="INACTIVE">{he.status.apartment.INACTIVE}</option>
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="initialMeterReading" hint="קו״ח">
          {he.admin.apartments.initialReading}
        </Label>
        <Input
          id="initialMeterReading"
          name="initialMeterReading"
          type="number"
          step="0.01"
          min={0}
          defaultValue={0}
          className="mt-1"
        />
        <p className="mt-1 text-xs text-slate-500">{he.admin.apartments.initialHint}</p>
      </div>

      <div>
        <Label htmlFor="notes">{he.common.notes}</Label>
        <Textarea id="notes" name="notes" rows={2} className="mt-1" />
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <input
            type="checkbox"
            checked={createTenant}
            onChange={(e) => setCreateTenant(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600"
          />
          {he.admin.apartments.createTenant}
        </label>

        {createTenant && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="tenantName">{he.admin.apartments.tenantName}</Label>
              <Input id="tenantName" name="tenantName" required={createTenant} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="tenantEmail" hint={he.common.optional}>
                {he.admin.apartments.tenantEmail}
              </Label>
              <Input
                id="tenantEmail"
                name="tenantEmail"
                type="email"
                className="mt-1"
                placeholder="tenant@example.com"
              />
            </div>
            <div>
              <Label htmlFor="tenantUsername">{he.admin.apartments.username}</Label>
              <Input
                id="tenantUsername"
                name="tenantUsername"
                required={createTenant}
                className="mt-1"
                minLength={3}
                title={he.admin.apartments.usernamePattern}
              />
            </div>
            <div>
              <Label htmlFor="tenantPassword" hint="מינ׳ 6 תווים">
                {he.admin.apartments.tenantPassword}
              </Label>
              <Input
                id="tenantPassword"
                name="tenantPassword"
                type="text"
                required={createTenant}
                minLength={6}
                className="mt-1"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => history.back()}>
          {he.common.cancel}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? he.common.creating : he.admin.apartments.new}
        </Button>
      </div>
    </form>
  );
}

