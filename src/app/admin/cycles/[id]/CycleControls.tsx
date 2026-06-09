"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Lock, Unlock, Trash2 } from "lucide-react";
import { he } from "@/lib/i18n/he";

export function CycleControls({
  id,
  status,
  hasSubmissions,
}: {
  id: string;
  status: "OPEN" | "CLOSED";
  hasSubmissions: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggleStatus() {
    setLoading(true);
    try {
      const next = status === "OPEN" ? "CLOSED" : "OPEN";
      const res = await fetch(`/api/cycles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d?.error?.message || he.errors.generic);
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function onDelete() {
    if (!confirm(he.admin.cycles.deleteConfirm)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/cycles/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        alert(d?.error?.message || he.admin.cycles.deleteFailed);
        return;
      }
      router.push("/admin/cycles");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={toggleStatus} disabled={loading} size="sm">
        {status === "OPEN" ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
        {status === "OPEN" ? he.admin.cycles.closeCycle : he.admin.cycles.reopenCycle}
      </Button>
      {!hasSubmissions && (
        <Button variant="danger" onClick={onDelete} disabled={loading} size="sm">
          <Trash2 className="h-4 w-4" />
          {he.common.delete}
        </Button>
      )}
    </div>
  );
}
