import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDateTime, formatKwh, formatRateShekels } from "@/lib/utils";
import { SubmissionReviewForm } from "./SubmissionReviewForm";
import { PaymentControls } from "./PaymentControls";
import { he } from "@/lib/i18n/he";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      apartment: { include: { tenant: true } },
      billingCycle: true,
      payment: true,
    },
  });
  if (!submission) notFound();

  return (
    <div>
      <PageHeader
        title={`${submission.apartment.name} · ${submission.billingCycle.label}`}
        description={`${he.admin.submissions.submitted} ${formatDateTime(submission.submittedAt)} · ${submission.apartment.tenant?.name ?? he.admin.submissions.unknown}`}
        actions={
          <Link
            href="/admin/submissions"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            ← {he.common.back}
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>{he.admin.submissions.meterImage}</CardTitle>
            </CardHeader>
            <CardBody>
              {submission.imageUrl ? (
                <a
                  href={submission.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-lg border border-slate-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={submission.imageUrl}
                    alt={he.admin.submissions.meterImage}
                    className="w-full"
                  />
                </a>
              ) : (
                <p className="text-sm text-slate-500">{he.admin.submissions.noImage}</p>
              )}
              {submission.imageOriginalName && (
                <p className="mt-2 text-xs text-slate-500">
                  {submission.imageOriginalName}
                </p>
              )}
            </CardBody>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{he.admin.submissions.ocrResult}</CardTitle>
            </CardHeader>
            <CardBody className="space-y-1 text-sm">
              <Row
                k={he.admin.submissions.detected}
                v={submission.ocrReading != null ? formatKwh(submission.ocrReading) : "—"}
              />
              <Row
                k={he.submit.confidence}
                v={
                  submission.ocrConfidence != null
                    ? `${Math.round(submission.ocrConfidence * 100)}%`
                    : "—"
                }
              />
              {submission.ocrRawText && (
                <div className="mt-2">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    {he.admin.submissions.rawOcr}
                  </div>
                  <pre className="mt-1 max-h-32 overflow-auto rounded bg-slate-50 p-2 text-xs text-slate-700">
                    {submission.ocrRawText}
                  </pre>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{he.admin.submissions.calculation}</CardTitle>
              <StatusBadge kind="submission" status={submission.status} />
            </CardHeader>
            <CardBody>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Row k={he.tenant.previousReading} v={formatKwh(submission.previousReading)} />
                <Row
                  k={he.admin.submissions.tenantConfirmed}
                  v={formatKwh(submission.confirmedReading)}
                />
                <Row k={he.submit.consumption} v={formatKwh(submission.consumption)} />
                <Row k={he.rate.label} v={formatRateShekels(submission.ratePerKwh)} />
                <Row
                  k={he.admin.submissions.amountDue}
                  v={
                    <span className="text-lg font-semibold">
                      {formatCurrency(submission.amountDue)}
                    </span>
                  }
                />
              </dl>
            </CardBody>
          </Card>

          <SubmissionReviewForm
            id={submission.id}
            initial={{
              confirmedReading: submission.confirmedReading,
              previousReading: submission.previousReading,
              adminComment: submission.adminComment,
              rejectionReason: submission.rejectionReason,
            }}
            status={submission.status}
          />

          {submission.payment && (
            <PaymentControls
              submissionId={submission.id}
              payment={{
                amount: submission.payment.amount,
                status: submission.payment.status,
                method: submission.payment.method,
                reference: submission.payment.reference,
                notes: submission.payment.notes,
                paidAt: submission.payment.paidAt?.toISOString() ?? null,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{k}</dt>
      <dd className="text-sm font-medium text-slate-800">{v}</dd>
    </div>
  );
}
