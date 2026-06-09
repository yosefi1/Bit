import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TH, TD, Empty } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatKwh, formatRateShekels } from "@/lib/utils";
import { he } from "@/lib/i18n/he";
import type { Prisma } from "@prisma/client";

type ApartmentWithSubs = Prisma.ApartmentGetPayload<{
  include: {
    tenant: true;
    submissions: { include: { payment: true } };
  };
}>;

type CycleWithSubs = Prisma.BillingCycleGetPayload<{
  include: {
    submissions: {
      include: { apartment: { include: { tenant: true } }; payment: true };
    };
  };
}>;

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [cycles, apartments] = await Promise.all([
    prisma.billingCycle.findMany({
      orderBy: { startDate: "desc" },
      include: {
        submissions: {
          include: {
            apartment: { include: { tenant: true } },
            payment: true,
          },
        },
      },
    }),
    prisma.apartment.findMany({
      include: {
        tenant: true,
        submissions: { include: { payment: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const outstanding = apartments.map((a) => {
    const owed = a.submissions
      .filter(
        (s) =>
          s.status === "APPROVED" &&
          (!s.payment || s.payment.status !== "PAID")
      )
      .reduce((acc, s) => acc + s.amountDue, 0);
    return { id: a.id, name: a.name, tenant: a.tenant?.name ?? "—", owed };
  });
  const totalOutstanding = outstanding.reduce((a, b) => a + b.owed, 0);

  return (
    <div>
      <PageHeader
        title={he.admin.reports.title}
        description={he.admin.reports.desc}
      />

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{he.admin.reports.monthlySummary}</CardTitle>
          </CardHeader>
          <CardBody>
            {cycles.length === 0 ? (
              <Empty>{he.admin.reports.noCycles}</Empty>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>{he.admin.cycles.label}</TH>
                    <TH>{he.common.status}</TH>
                    <TH className="text-right">{he.admin.cycles.totalBill}</TH>
                    <TH className="text-right">{he.admin.cycles.totalKwh}</TH>
                    <TH className="text-right">{he.rate.label}</TH>
                    <TH className="text-right">{he.admin.reports.submissionsCol}</TH>
                    <TH className="text-right">{he.admin.cycles.approvedCharges}</TH>
                    <TH className="text-right">{he.admin.reports.collectedCol}</TH>
                    <TH className="text-right">{he.admin.reports.outstandingCol}</TH>
                  </TR>
                </THead>
                <TBody>
                  {cycles.map((c) => {
                    const approved = c.submissions
                      .filter((s) => s.status === "APPROVED")
                      .reduce((a, s) => a + s.amountDue, 0);
                    const collected = c.submissions
                      .filter((s) => s.payment?.status === "PAID")
                      .reduce((a, s) => a + s.amountDue, 0);
                    const cycleOutstanding = approved - collected;
                    return (
                      <TR key={c.id}>
                        <TD className="font-medium">{c.label}</TD>
                        <TD>
                          <StatusBadge kind="cycle" status={c.status} />
                        </TD>
                        <TD className="text-right">{formatCurrency(c.totalBillAmount)}</TD>
                        <TD className="text-right">{formatKwh(c.totalConsumption)}</TD>
                        <TD className="text-right">{formatRateShekels(c.ratePerKwh)}</TD>
                        <TD className="text-right">{c.submissions.length}</TD>
                        <TD className="text-right font-medium">{formatCurrency(approved)}</TD>
                        <TD className="text-right text-emerald-700">{formatCurrency(collected)}</TD>
                        <TD className={`text-right font-medium ${cycleOutstanding > 0 ? "text-red-700" : "text-slate-500"}`}>
                          {formatCurrency(cycleOutstanding)}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{he.admin.reports.outstanding}</CardTitle>
            <span className="text-sm font-medium text-slate-600">
              {he.admin.reports.totalOwed}:{" "}
              <span className="text-red-700">{formatCurrency(totalOutstanding)}</span>
            </span>
          </CardHeader>
          <CardBody>
            {outstanding.length === 0 ? (
              <Empty>{he.admin.reports.noApartments}</Empty>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>{he.admin.apartments.name}</TH>
                    <TH>{he.admin.apartments.tenant}</TH>
                    <TH className="text-right">{he.admin.reports.outstandingCol}</TH>
                  </TR>
                </THead>
                <TBody>
                  {outstanding
                    .sort((a, b) => b.owed - a.owed)
                    .map((o) => (
                      <TR key={o.id}>
                        <TD className="font-medium">{o.name}</TD>
                        <TD>{o.tenant}</TD>
                        <TD
                          className={`text-right font-medium ${o.owed > 0 ? "text-red-700" : "text-slate-400"}`}
                        >
                          {formatCurrency(o.owed)}
                        </TD>
                      </TR>
                    ))}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{he.admin.reports.consumptionMatrix}</CardTitle>
          </CardHeader>
          <CardBody>
            <ConsumptionMatrix apartments={apartments} cycles={cycles} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function ConsumptionMatrix({
  apartments,
  cycles,
}: {
  apartments: ApartmentWithSubs[];
  cycles: CycleWithSubs[];
}) {
  const recent = cycles.slice(0, 6);
  if (recent.length === 0) return <Empty>{he.admin.reports.noData}</Empty>;

  const recentIds = new Set(recent.map((c) => c.id));
  const map = new Map<string, Map<string, number>>();
  for (const apt of apartments) {
    const row = new Map<string, number>();
    for (const c of recent) row.set(c.id, 0);
    for (const s of apt.submissions) {
      if (recentIds.has(s.billingCycleId)) {
        row.set(s.billingCycleId, (row.get(s.billingCycleId) ?? 0) + s.consumption);
      }
    }
    map.set(apt.id, row);
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>{he.admin.apartments.name}</TH>
          {recent.map((c) => (
            <TH key={c.id} className="text-right">
              {c.label}
            </TH>
          ))}
          <TH className="text-right">{he.admin.reports.totalCol}</TH>
        </TR>
      </THead>
      <TBody>
        {apartments.map((apt) => {
          const row = map.get(apt.id);
          const total = Array.from(row?.values() ?? []).reduce((a, b) => a + b, 0);
          return (
            <TR key={apt.id}>
              <TD className="font-medium">{apt.name}</TD>
              {recent.map((c) => (
                <TD key={c.id} className="text-right">
                  {(row?.get(c.id) ?? 0) > 0 ? formatKwh(row!.get(c.id)!) : "—"}
                </TD>
              ))}
              <TD className="text-right font-medium">
                {total > 0 ? formatKwh(total) : "—"}
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
