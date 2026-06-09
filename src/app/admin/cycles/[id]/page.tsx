import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, THead, TBody, TR, TH, TD, Empty } from "@/components/ui/Table";
import { formatCurrency, formatDate, formatKwh, formatRateShekels } from "@/lib/utils";
import { CycleControls } from "./CycleControls";
import { he } from "@/lib/i18n/he";

export const dynamic = "force-dynamic";

export default async function CycleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cycle = await prisma.billingCycle.findUnique({
    where: { id },
    include: {
      submissions: {
        include: {
          apartment: { include: { tenant: true } },
          payment: true,
        },
        orderBy: { submittedAt: "desc" },
      },
    },
  });
  if (!cycle) notFound();

  const submittedTotal = cycle.submissions.reduce((acc, s) => acc + s.consumption, 0);
  const approvedTotal = cycle.submissions
    .filter((s) => s.status === "APPROVED")
    .reduce((acc, s) => acc + s.amountDue, 0);
  const paidTotal = cycle.submissions
    .filter((s) => s.payment?.status === "PAID")
    .reduce((acc, s) => acc + s.amountDue, 0);

  return (
    <div>
      <PageHeader
        title={cycle.label}
        description={`${formatDate(cycle.startDate)} → ${formatDate(cycle.endDate)}`}
        actions={
          <CycleControls
            id={cycle.id}
            status={cycle.status}
            hasSubmissions={cycle.submissions.length > 0}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={he.admin.cycles.totalBill} value={formatCurrency(cycle.totalBillAmount)} />
        <Stat label={he.admin.cycles.totalKwh} value={formatKwh(cycle.totalConsumption)} />
        <Stat label={he.rate.label} value={formatRateShekels(cycle.ratePerKwh)} />
        <Stat
          label={he.common.status}
          value={<StatusBadge kind="cycle" status={cycle.status} />}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat label={he.admin.cycles.submittedKwh} value={formatKwh(submittedTotal)} />
        <Stat label={he.admin.cycles.approvedCharges} value={formatCurrency(approvedTotal)} />
        <Stat label={he.admin.overview.collected} value={formatCurrency(paidTotal)} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{he.admin.cycles.submissionsInCycle}</CardTitle>
        </CardHeader>
        <CardBody>
          {cycle.submissions.length === 0 ? (
            <Empty>{he.admin.cycles.noSubmissionsCycle}</Empty>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>{he.admin.apartments.name}</TH>
                  <TH>{he.admin.apartments.tenant}</TH>
                  <TH>{he.submit.previousHint}</TH>
                  <TH>{he.submit.yourReading}</TH>
                  <TH>{he.submit.consumption}</TH>
                  <TH>{he.common.amount}</TH>
                  <TH>{he.common.status}</TH>
                  <TH>{he.admin.submissions.payment}</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {cycle.submissions.map((s) => (
                  <TR key={s.id}>
                    <TD className="font-medium">{s.apartment.name}</TD>
                    <TD>{s.apartment.tenant?.name ?? "—"}</TD>
                    <TD>{formatKwh(s.previousReading)}</TD>
                    <TD>{formatKwh(s.confirmedReading)}</TD>
                    <TD>{formatKwh(s.consumption)}</TD>
                    <TD>{formatCurrency(s.amountDue)}</TD>
                    <TD>
                      <StatusBadge kind="submission" status={s.status} />
                    </TD>
                    <TD>
                      {s.payment ? (
                        <StatusBadge kind="payment" status={s.payment.status} />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TD>
                    <TD>
                      <Link
                        href={`/admin/submissions/${s.id}`}
                        className="text-sm font-medium text-brand-600 hover:underline"
                      >
                        {he.admin.submissions.open} →
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Card>
      <CardBody>
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
      </CardBody>
    </Card>
  );
}
