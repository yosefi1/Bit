import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, THead, TBody, TR, TH, TD, Empty } from "@/components/ui/Table";
import { formatCurrency, formatDateTime, formatKwh } from "@/lib/utils";
import { SubmissionFilters } from "./SubmissionFilters";
import { he } from "@/lib/i18n/he";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    cycleId?: string;
    apartmentId?: string;
  }>;
}) {
  const sp = await searchParams;
  const where: Prisma.SubmissionWhereInput = {};
  if (sp.status && ["PENDING", "APPROVED", "REJECTED"].includes(sp.status)) {
    where.status = sp.status as "PENDING" | "APPROVED" | "REJECTED";
  }
  if (sp.cycleId) where.billingCycleId = sp.cycleId;
  if (sp.apartmentId) where.apartmentId = sp.apartmentId;
  if (sp.q) {
    where.apartment = {
      OR: [
        { name: { contains: sp.q } },
        { tenant: { name: { contains: sp.q } } },
        { tenant: { username: { contains: sp.q } } },
      ],
    };
  }

  const [submissions, cycles, apartments] = await Promise.all([
    prisma.submission.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      include: {
        apartment: { include: { tenant: { select: { name: true, username: true } } } },
        billingCycle: { select: { label: true } },
        payment: true,
      },
      take: 200,
    }),
    prisma.billingCycle.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, label: true },
    }),
    prisma.apartment.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title={he.admin.submissions.title}
        description={he.admin.submissions.desc}
      />

      <SubmissionFilters cycles={cycles} apartments={apartments} initial={sp} />

      {submissions.length === 0 ? (
        <Empty>{he.admin.submissions.noMatch}</Empty>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>{he.admin.submissions.submitted}</TH>
              <TH>{he.admin.apartments.name}</TH>
              <TH>{he.admin.apartments.tenant}</TH>
              <TH>{he.admin.cycles.label}</TH>
              <TH>{he.submit.yourReading}</TH>
              <TH>{he.submit.consumption}</TH>
              <TH>{he.common.amount}</TH>
              <TH>{he.common.status}</TH>
              <TH>{he.admin.submissions.payment}</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {submissions.map((s) => (
              <TR key={s.id}>
                <TD className="whitespace-nowrap text-xs text-slate-500">
                  {formatDateTime(s.submittedAt)}
                </TD>
                <TD className="font-medium">{s.apartment.name}</TD>
                <TD>{s.apartment.tenant?.name ?? "—"}</TD>
                <TD>{s.billingCycle.label}</TD>
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
                <TD className="text-right">
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
    </div>
  );
}
