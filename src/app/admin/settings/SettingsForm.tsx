"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { he } from "@/lib/i18n/he";

export function SettingsForm({
  initial,
}: {
  initial: { phone: string; name: string; instructions: string };
}) {
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
      phone: String(f.get("phone") || ""),
      name: String(f.get("name") || ""),
      instructions: String(f.get("instructions") || ""),
    };
    try {
      const res = await fetch("/api/settings/bit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || he.errors.generic);
        return;
      }
      setSuccess(he.common.success);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert tone="danger">{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="phone">{he.bit.recipientPhone}</Label>
          <Input
            id="phone"
            name="phone"
            required
            defaultValue={initial.phone}
            className="mt-1"
            placeholder="050-1234567"
            dir="ltr"
          />
        </div>
        <div>
          <Label htmlFor="name">{he.bit.recipientName}</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={initial.name}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="instructions">{he.bit.instructions}</Label>
        <Textarea
          id="instructions"
          name="instructions"
          rows={4}
          defaultValue={initial.instructions}
          className="mt-1"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? he.common.saving : he.common.save}
        </Button>
      </div>
    </form>
  );
}
