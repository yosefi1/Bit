import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePageTenant } from "@/lib/session";
import { getBitConfig } from "@/lib/bit";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import { formatCurrency, formatDateTime, formatKwh, formatRateShekels } from "@/lib/utils";
import { he } from "@/lib/i18n/he";
import { PayWithBit } from "./PayWithBit";

export const dynamic = "force-dynamic";

export default async function TenantSubmissionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ just?: string }>;
}) {
  const session = await requirePageTenant();
  const { id } = await params;
  const sp = await searchParams;

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: { billingCycle: true, payment: true, apartment: true },
  });
  if (!submission) notFound();
  if (submission.apartmentId !== session.user.apartmentId) notFound();

  const bit = await getBitConfig();
  const showPay = submission.status === "APPROVED" && submission.payment;

  return (
    <div>
      <PageHeader
        title={submission.billingCycle.label}
        description={`${he.tenant.submittedAt} ${formatDateTime(submission.submittedAt)}`}
        actions={
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            ← {he.tenant.dashboard}
          </Link>
        }
      />

      {sp.just && (
        <Alert tone="success" className="mb-4" title={he.tenant.submissionReceived}>
          {he.tenant.submissionReceivedDesc}
        </Alert>
      )}

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3">
        {showPay && (
          <div id="pay" className="order-1 lg:order-2 lg:col-span-1">
            <PayWithBit
              submissionId={submission.id}
              amount={submission.payment!.amount}
              apartmentName={submission.apartment.name}
              status={submission.payment!.status}
              bit={bit}
            />
          </div>
        )}

        <div className="order-2 space-y-4 lg:order-1 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{he.tenant.calculation}</CardTitle>
              <StatusBadge kind="submission" status={submission.status} />
            </CardHeader>
            <CardBody>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Row k={he.tenant.previousReading} v={formatKwh(submission.previousReading)} />
                <Row k={he.tenant.yourReading} v={formatKwh(submission.confirmedReading)} />
                <Row k={he.submit.consumption} v={formatKwh(submission.consumption)} />
                <Row k={he.submit.ratePerKwh} v={formatRateShekels(submission.ratePerKwh)} />
                <Row
                  k={he.tenant.amountDue}
                  v={
                    <span className="text-2xl font-bold text-slate-900">
                      {formatCurrency(submission.amountDue)}
                    </span>
                  }
                />
                {submission.payment && (
                  <Row
                    k={he.admin.submissions.payment}
                    v={<StatusBadge kind="payment" status={submission.payment.status} />}
                  />
                )}
              </dl>

              {submission.status === "REJECTED" && submission.rejectionReason && (
                <Alert tone="danger" className="mt-4" title={he.status.submission.REJECTED}>
                  {submission.rejectionReason}
                </Alert>
              )}
              {submission.adminComment && (
                <Alert tone="info" className="mt-4" title={he.tenant.adminComment}>
                  {submission.adminComment}
                </Alert>
              )}
            </CardBody>
          </Card>

          {submission.imageUrl ? (
            <Card>
              <CardHeader>
                <CardTitle>{he.tenant.meterPhoto}</CardTitle>
              </CardHeader>
              <CardBody>
                <a
                  href={submission.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-lg border border-slate-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={submission.imageUrl}
                    alt={he.tenant.meterPhoto}
                    className="max-h-96 w-full object-contain"
                  />
                </a>
              </CardBody>
            </Card>
          ) : (
            <Alert tone="warning" title={he.tenant.noMeterPhoto}>
              {he.tenant.noMeterPhotoDesc}
            </Alert>
          )}
        </div>

        {!showPay && (
          <div className="order-3 lg:col-span-1">
            {submission.status === "PENDING" ? (
              <Alert tone="info" title={he.tenant.waitingApproval}>
                {he.tenant.waitingApprovalDesc}
              </Alert>
            ) : (
              <Alert tone="warning" title={he.tenant.noPaymentDue}>
                {submission.status === "REJECTED"
                  ? he.tenant.rejectedCorrect
                  : he.tenant.noPaymentAssoc}
              </Alert>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{k}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-800">{v}</dd>
    </div>
  );
}
