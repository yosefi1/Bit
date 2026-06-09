"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { he } from "@/lib/i18n/he";
import { normalizeUsername } from "@/lib/username";

interface Tenant {
  id: string;
  name: string;
  username: string;
  email: string | null;
  status: "ACTIVE" | "INACTIVE";
}

interface Apartment {
  id: string;
  name: string;
  notes: string | null;
  status: "ACTIVE" | "INACTIVE";
  initialMeterReading: number;
  tenant: Tenant | null;
}

export function ApartmentEditForms({ apartment }: { apartment: Apartment }) {
  return (
    <>
      <ApartmentForm apartment={apartment} />
      <TenantForm apartment={apartment} />
    </>
  );
}

function ApartmentForm({ apartment }: { apartment: Apartment }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    const f = new FormData(e.currentTarget);
    const payload = {
      name: String(f.get("name") || ""),
      notes: String(f.get("notes") || "") || null,
      status: String(f.get("status") || "ACTIVE"),
      initialMeterReading: Number(f.get("initialMeterReading") || 0),
    };
    try {
      const res = await fetch(`/api/apartments/${apartment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || he.admin.apartments.updateFailed);
        return;
      }
      setSuccess(he.admin.apartments.updated);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{he.admin.apartments.details}</CardTitle>
      </CardHeader>
      <CardBody>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}
          {success && <Alert tone="success">{success}</Alert>}

          <div>
            <Label htmlFor="name">{he.admin.apartments.name}</Label>
            <Input
              id="name"
              name="name"
              defaultValue={apartment.name}
              required
              className="mt-1"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="status">{he.common.status}</Label>
              <select
                id="status"
                name="status"
                defaultValue={apartment.status}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                <option value="ACTIVE">{he.status.apartment.ACTIVE}</option>
                <option value="INACTIVE">{he.status.apartment.INACTIVE}</option>
              </select>
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
                defaultValue={apartment.initialMeterReading}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">{he.common.notes}</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={apartment.notes ?? ""}
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? he.common.saving : he.common.save}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function TenantForm({ apartment }: { apartment: Apartment }) {
  const router = useRouter();
  const tenant = apartment.tenant;
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password") || "");
    const payload: Record<string, unknown> = {
      name: String(f.get("name") || ""),
      username: normalizeUsername(String(f.get("username") || "")),
      email: String(f.get("email") || "") || null,
      status: String(f.get("status") || "ACTIVE"),
    };
    if (password) payload.password = password;

    try {
      const res = await fetch(`/api/apartments/${apartment.id}/tenant`, {
        method: tenant ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          tenant
            ? payload
            : { ...payload, password: password || "changeme123" }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || he.errors.generic);
        return;
      }
      setSuccess(tenant ? he.admin.apartments.tenantUpdated : he.admin.apartments.tenantCreated);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function onRemove() {
    if (!tenant) return;
    if (!confirm(he.admin.apartments.removeTenantConfirm)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/apartments/${apartment.id}/tenant`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data?.error?.message || he.admin.apartments.removeFailed);
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {he.admin.apartments.tenantCreds}{" "}
          {!tenant && he.admin.apartments.unassignedTitle}
        </CardTitle>
        {tenant && (
          <Button variant="ghost" size="sm" onClick={onRemove}>
            {he.admin.apartments.removeTenant}
          </Button>
        )}
      </CardHeader>
      <CardBody>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}
          {success && <Alert tone="success">{success}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="t-name">{he.admin.apartments.tenantName}</Label>
              <Input
                id="t-name"
                name="name"
                required
                defaultValue={tenant?.name ?? ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="t-email" hint={he.common.optional}>
                {he.admin.apartments.tenantEmail}
              </Label>
              <Input
                id="t-email"
                name="email"
                type="email"
                defaultValue={tenant?.email ?? ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="t-username">{he.admin.apartments.username}</Label>
              <Input
                id="t-username"
                name="username"
                required
                minLength={3}
                defaultValue={tenant?.username ?? ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="t-status">{he.common.status}</Label>
              <select
                id="t-status"
                name="status"
                defaultValue={tenant?.status ?? "ACTIVE"}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm"
              >
                <option value="ACTIVE">{he.status.user.ACTIVE}</option>
                <option value="INACTIVE">{he.status.user.INACTIVE}</option>
              </select>
            </div>
          </div>

          <div>
            <Label
              htmlFor="t-password"
              hint={tenant ? he.admin.apartments.passwordKeep : "מינ׳ 6 תווים"}
            >
              {he.admin.apartments.tenantPassword}
            </Label>
            <Input
              id="t-password"
              name="password"
              type="text"
              minLength={tenant ? 0 : 6}
              required={!tenant}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading
                ? he.common.saving
                : tenant
                  ? he.admin.apartments.updateTenant
                  : he.admin.apartments.createTenantBtn}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

