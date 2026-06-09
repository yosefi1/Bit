"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Search, X } from "lucide-react";
import { he, submissionStatusLabel } from "@/lib/i18n/he";

interface Option {
  id: string;
  label?: string;
  name?: string;
}

export function SubmissionFilters({
  cycles,
  apartments,
  initial,
}: {
  cycles: { id: string; label: string }[];
  apartments: { id: string; name: string }[];
  initial: {
    q?: string;
    status?: string;
    cycleId?: string;
    apartmentId?: string;
  };
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    router.push(`/admin/submissions?${sp.toString()}`);
  }

  function clear() {
    router.push("/admin/submissions");
  }

  return (
    <Card className="mb-4">
      <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="relative">
            <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={he.admin.submissions.searchPlaceholder}
              defaultValue={initial.q ?? ""}
              onKeyDown={(e) => {
                if (e.key === "Enter") update({ q: (e.target as HTMLInputElement).value });
              }}
              className="pe-9"
            />
          </div>
        </div>
        <select
          defaultValue={initial.status ?? ""}
          onChange={(e) => update({ status: e.target.value })}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm"
        >
          <option value="">{he.admin.submissions.allStatuses}</option>
          <option value="PENDING">{submissionStatusLabel("PENDING")}</option>
          <option value="APPROVED">{submissionStatusLabel("APPROVED")}</option>
          <option value="REJECTED">{submissionStatusLabel("REJECTED")}</option>
        </select>
        <select
          defaultValue={initial.cycleId ?? ""}
          onChange={(e) => update({ cycleId: e.target.value })}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm"
        >
          <option value="">{he.admin.submissions.allCycles}</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          defaultValue={initial.apartmentId ?? ""}
          onChange={(e) => update({ apartmentId: e.target.value })}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm"
        >
          <option value="">{he.admin.submissions.allApartments}</option>
          {apartments.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        {(initial.q || initial.status || initial.cycleId || initial.apartmentId) && (
          <Button variant="ghost" size="sm" onClick={clear} className="sm:col-span-2 lg:col-span-5">
            <X className="h-4 w-4" /> {he.common.clearFilters}
          </Button>
        )}
      </CardBody>
    </Card>
  );
}

export type { Option };
