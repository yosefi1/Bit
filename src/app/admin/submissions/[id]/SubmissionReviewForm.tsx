"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Check, X, Save } from "lucide-react";
import { he } from "@/lib/i18n/he";

type Status = "PENDING" | "APPROVED" | "REJECTED";

export function SubmissionReviewForm({
  id,
  initial,
  status,
}: {
  id: string;
  initial: {
    confirmedReading: number;
    previousReading: number;
    adminComment: string | null;
    rejectionReason: string | null;
  };
  status: Status;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(action: "save" | "approve" | "reject", form?: HTMLFormElement) {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const f = form ? new FormData(form) : null;
      const payload: Record<string, unknown> = {};
      if (f) {
        payload.confirmedReading = Number(f.get("confirmedReading") || 0);
        payload.previousReading = Number(f.get("previousReading") || 0);
        payload.adminComment = String(f.get("adminComment") || "") || null;
        payload.rejectionReason = String(f.get("rejectionReason") || "") || null;
      }
      if (action === "approve") payload.status = "APPROVED";
      if (action === "reject") payload.status = "REJECTED";
      if (action === "save" && status !== "APPROVED" && status !== "REJECTED")
        payload.status = "PENDING";

      const res = await fetch(`/api/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || he.errors.generic);
        return;
      }
      setSuccess(
        action === "approve"
          ? he.admin.submissions.approvedMsg
          : action === "reject"
            ? he.admin.submissions.rejectedMsg
            : he.admin.submissions.savedMsg
      );
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{he.admin.submissions.adminReview}</CardTitle>
      </CardHeader>
      <CardBody>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit("save", e.currentTarget);
          }}
          className="space-y-4"
          id="review-form"
        >
          {error && <Alert tone="danger">{error}</Alert>}
          {success && <Alert tone="success">{success}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="previousReading" hint="קו״ח">
                {he.tenant.previousReading}
              </Label>
              <Input
                id="previousReading"
                name="previousReading"
                type="number"
                step="0.01"
                min={0}
                defaultValue={initial.previousReading}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="confirmedReading" hint="קו״ח">
                {he.admin.submissions.confirmedReading}
              </Label>
              <Input
                id="confirmedReading"
                name="confirmedReading"
                type="number"
                step="0.01"
                min={0}
                defaultValue={initial.confirmedReading}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="adminComment">{he.admin.submissions.adminComment}</Label>
            <Textarea
              id="adminComment"
              name="adminComment"
              defaultValue={initial.adminComment ?? ""}
              rows={2}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="rejectionReason">{he.admin.submissions.rejectionReason}</Label>
            <Textarea
              id="rejectionReason"
              name="rejectionReason"
              defaultValue={initial.rejectionReason ?? ""}
              rows={2}
              className="mt-1"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" variant="outline" disabled={loading}>
              <Save className="h-4 w-4" />
              {he.admin.submissions.saveEdits}
            </Button>
            <Button
              type="button"
              variant="success"
              disabled={loading || status === "APPROVED"}
              onClick={() => {
                const form = document.getElementById("review-form") as HTMLFormElement;
                submit("approve", form);
              }}
            >
              <Check className="h-4 w-4" />
              {he.admin.submissions.approve}
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={loading || status === "REJECTED"}
              onClick={() => {
                const form = document.getElementById("review-form") as HTMLFormElement;
                submit("reject", form);
              }}
            >
              <X className="h-4 w-4" />
              {he.admin.submissions.reject}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
