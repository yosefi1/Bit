import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageTenant } from "@/lib/session";
import { PageHeader } from "@/components/shared/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getPreviousReadingForApartment } from "@/lib/billing";
import { SubmitReadingFlow } from "./SubmitReadingFlow";
import { formatKwh, formatRateShekels } from "@/lib/utils";
import { he } from "@/lib/i18n/he";
import { submissionStatusLabel } from "@/lib/i18n/he";

export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const session = await requirePageTenant();
  const apartmentId = session.user.apartmentId!;

  const [apartment, cycle, previousReading] = await Promise.all([
    prisma.apartment.findUnique({ where: { id: apartmentId } }),
    prisma.billingCycle.findFirst({
      where: { status: "OPEN" },
      orderBy: { startDate: "desc" },
    }),
    getPreviousReadingForApartment(apartmentId),
  ]);

  if (!apartment) return null;

  if (!cycle) {
    return (
      <div>
        <PageHeader title={he.submit.title} />
        <Alert tone="info" title={he.submit.noOpenCycleTitle}>
          {he.submit.noOpenCycleDesc}
          <div className="mt-3">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                {he.submit.backToDashboard}
              </Button>
            </Link>
          </div>
        </Alert>
      </div>
    );
  }

  const existing = await prisma.submission.findFirst({
    where: {
      apartmentId,
      billingCycleId: cycle.id,
      status: { not: "REJECTED" },
    },
  });

  if (existing) {
    return (
      <div>
        <PageHeader title={he.submit.title} />
        <Alert tone="info" title={he.submit.alreadySubmittedTitle}>
          {he.submit.alreadySubmittedStatus}:{" "}
          <strong>{submissionStatusLabel(existing.status)}</strong>.{" "}
          <Link href={`/dashboard/submission/${existing.id}`} className="underline">
            {he.submit.viewHere}.
          </Link>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={he.submit.title}
        description={`${he.submit.forCycle}: ${cycle.label}`}
      />

      <Card className="mb-6">
        <CardBody>
          <dl className="grid gap-3 sm:grid-cols-3">
            <Stat label={he.submit.ratePerKwh} value={formatRateShekels(cycle.ratePerKwh)} />
            <Stat label={he.tenant.previousReading} value={formatKwh(previousReading)} />
            <Stat label={he.admin.cycles.label} value={cycle.label} />
          </dl>
        </CardBody>
      </Card>

      <SubmitReadingFlow
        cycleId={cycle.id}
        ratePerKwh={cycle.ratePerKwh}
        previousReading={previousReading}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-base font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
