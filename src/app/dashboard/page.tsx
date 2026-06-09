import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageSession } from "@/lib/session";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDateTime, formatKwh, formatRateShekels } from "@/lib/utils";
import { getPreviousReadingForApartment } from "@/lib/billing";
import { he } from "@/lib/i18n/he";
import { Camera, History } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TenantDashboardPage() {
  const session = await requirePageSession();
  if (session.user.role !== "TENANT") return null;
  if (!session.user.apartmentId) {
    return (
      <div>
        <PageHeader title={he.tenant.welcome} />
        <Alert tone="warning" title={he.tenant.noApartment}>
          {he.tenant.noApartmentDesc}
        </Alert>
      </div>
    );
  }

  const apartmentId = session.user.apartmentId;
  const [apartment, currentCycle, lastSubmission, previousReading] =
    await Promise.all([
      prisma.apartment.findUnique({ where: { id: apartmentId } }),
      prisma.billingCycle.findFirst({
        where: { status: "OPEN" },
        orderBy: { startDate: "desc" },
      }),
      prisma.submission.findFirst({
        where: { apartmentId },
        orderBy: { submittedAt: "desc" },
        include: { billingCycle: true, payment: true },
      }),
      getPreviousReadingForApartment(apartmentId),
    ]);

  if (!apartment) return null;

  const openSubmission = currentCycle
    ? await prisma.submission.findFirst({
        where: {
          apartmentId,
          billingCycleId: currentCycle.id,
          status: { not: "REJECTED" },
        },
        include: { payment: true },
      })
    : null;

  return (
    <div>
      <PageHeader
        title={apartment.name}
        description={`${he.tenant.welcome}${session.user.name ? ", " + session.user.name : ""}.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={he.tenant.currentRate}
          value={currentCycle ? formatRateShekels(currentCycle.ratePerKwh) : he.common.noData}
        />
        <Stat label={he.tenant.previousReading} value={formatKwh(previousReading)} />
        <Stat
          label={he.tenant.openCycle}
          value={currentCycle?.label ?? he.common.noData}
          tone={currentCycle ? "brand" : "neutral"}
        />
        <Stat
          label={he.tenant.latestStatus}
          value={
            openSubmission ? (
              <StatusBadge kind="submission" status={openSubmission.status} />
            ) : (
              <span className="text-sm text-slate-500">{he.tenant.notSubmitted}</span>
            )
          }
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{he.tenant.thisCycle}</CardTitle>
          </CardHeader>
          <CardBody>
            {!currentCycle ? (
              <p className="text-sm text-slate-500">{he.tenant.noOpenCycle}</p>
            ) : openSubmission ? (
              <SubmittedSummary submission={openSubmission} />
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  {he.tenant.cycleOpenedPrefix}{" "}
                  <span className="font-medium">{currentCycle.label}</span>.{" "}
                  {he.tenant.rateThisCycle}{" "}
                  <span className="font-medium">
                    {formatRateShekels(currentCycle.ratePerKwh)}
                  </span>
                  . {he.tenant.previousMeterWas}{" "}
                  <span className="font-medium">{formatKwh(previousReading)}</span>.
                </p>
                <Link href="/dashboard/submit">
                  <Button size="lg">
                    <Camera className="h-4 w-4" />
                    {he.tenant.submitMeter}
                  </Button>
                </Link>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{he.tenant.lastBill}</CardTitle>
            <Link
              href="/dashboard/history"
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              <History className="ms-1 inline h-3 w-3" /> {he.tenant.fullHistory}
            </Link>
          </CardHeader>
          <CardBody>
            {lastSubmission ? (
              <dl className="space-y-2 text-sm">
                <Row k={he.tenant.cycle} v={lastSubmission.billingCycle.label} />
                <Row k={he.tenant.submitted} v={formatDateTime(lastSubmission.submittedAt)} />
                <Row k={he.submit.consumption} v={formatKwh(lastSubmission.consumption)} />
                <Row k={he.common.amount} v={formatCurrency(lastSubmission.amountDue)} />
                <Row
                  k={he.common.status}
                  v={<StatusBadge kind="submission" status={lastSubmission.status} />}
                />
                <Row
                  k={he.admin.submissions.payment}
                  v={
                    lastSubmission.payment ? (
                      <StatusBadge kind="payment" status={lastSubmission.payment.status} />
                    ) : (
                      "—"
                    )
                  }
                />
              </dl>
            ) : (
              <p className="text-sm text-slate-500">{he.tenant.noSubmissions}</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "neutral" | "brand";
}) {
  return (
    <Card className={tone === "brand" ? "border-brand-200 bg-brand-50/40" : ""}>
      <CardBody>
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
      </CardBody>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{k}</dt>
      <dd className="text-sm font-medium text-slate-800">{v}</dd>
    </div>
  );
}

function SubmittedSummary({
  submission,
}: {
  submission: {
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    consumption: number;
    amountDue: number;
    confirmedReading: number;
    previousReading: number;
    payment: { status: "PENDING" | "PAID" | "CANCELLED" } | null;
  };
}) {
  return (
    <div className="space-y-4">
      <dl className="grid gap-3 sm:grid-cols-2">
        <Row
          k={he.common.status}
          v={<StatusBadge kind="submission" status={submission.status} />}
        />
        <Row
          k={he.admin.submissions.payment}
          v={
            submission.payment ? (
              <StatusBadge kind="payment" status={submission.payment.status} />
            ) : (
              "—"
            )
          }
        />
        <Row k={he.tenant.previousReading} v={formatKwh(submission.previousReading)} />
        <Row k={he.tenant.confirmedReading} v={formatKwh(submission.confirmedReading)} />
        <Row k={he.submit.consumption} v={formatKwh(submission.consumption)} />
        <Row k={he.tenant.amountDue} v={formatCurrency(submission.amountDue)} />
      </dl>
      <div className="flex flex-wrap gap-2">
        <Link href={`/dashboard/submission/${submission.id}`}>
          <Button variant="outline">{he.common.view}</Button>
        </Link>
        {submission.status === "APPROVED" &&
          submission.payment &&
          submission.payment.status !== "PAID" && (
            <Link href={`/dashboard/submission/${submission.id}#pay`}>
              <Button variant="success">{he.tenant.payWithBit}</Button>
            </Link>
          )}
      </div>
    </div>
  );
}
