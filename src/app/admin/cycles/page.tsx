import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, THead, TBody, TR, TH, TD, Empty } from "@/components/ui/Table";
import { Plus } from "lucide-react";
import { formatCurrency, formatDate, formatKwh, formatRateShekels } from "@/lib/utils";
import { he } from "@/lib/i18n/he";

export const dynamic = "force-dynamic";

export default async function CyclesPage() {
  const cycles = await prisma.billingCycle.findMany({
    orderBy: { startDate: "desc" },
    include: { _count: { select: { submissions: true } } },
  });

  return (
    <div>
      <PageHeader
        title={he.admin.cycles.title}
        description={he.admin.cycles.desc}
        actions={
          <Link href="/admin/cycles/new">
            <Button>
              <Plus className="h-4 w-4" />
              {he.admin.cycles.new}
            </Button>
          </Link>
        }
      />

      {cycles.length === 0 ? (
        <Empty>
          {he.admin.cycles.noCycles}{" "}
          <Link href="/admin/cycles/new" className="text-brand-600 underline">
            {he.admin.cycles.createFirst}
          </Link>
        </Empty>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>{he.admin.cycles.label}</TH>
              <TH>{he.admin.overview.period}</TH>
              <TH>{he.admin.cycles.totalBill}</TH>
              <TH>{he.admin.cycles.totalKwh}</TH>
              <TH>{he.rate.label}</TH>
              <TH>{he.common.status}</TH>
              <TH className="text-right">{he.admin.apartments.submissions}</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {cycles.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium text-slate-900">{c.label}</TD>
                <TD className="whitespace-nowrap text-xs text-slate-500">
                  {formatDate(c.startDate)} → {formatDate(c.endDate)}
                </TD>
                <TD>{formatCurrency(c.totalBillAmount)}</TD>
                <TD>{formatKwh(c.totalConsumption)}</TD>
                <TD className="font-medium">{formatRateShekels(c.ratePerKwh)}</TD>
                <TD>
                  <StatusBadge kind="cycle" status={c.status} />
                </TD>
                <TD className="text-right">{c._count.submissions}</TD>
                <TD className="text-right">
                  <Link
                    href={`/admin/cycles/${c.id}`}
                    className="text-sm font-medium text-brand-600 hover:underline"
                  >
                    {he.admin.apartments.manage} →
                  </Link>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
