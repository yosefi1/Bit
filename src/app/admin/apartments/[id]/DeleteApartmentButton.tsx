"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { he } from "@/lib/i18n/he";

export function DeleteApartmentButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (!confirm(`${he.admin.apartments.deleteConfirm} (${name})`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/apartments/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data?.error?.message || he.admin.apartments.deleteFailed);
        return;
      }
      router.push("/admin/apartments");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="danger" onClick={onDelete} disabled={loading} size="sm">
      <Trash2 className="h-4 w-4" />
      {loading ? he.common.deleting : he.common.delete}
    </Button>
  );
}
