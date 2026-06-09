import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageTenant } from "@/lib/session";
import { PageHeader } from "@/components/shared/PageHeader";
import { Table, THead, TBody, TR, TH, TD, Empty } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate, formatKwh } from "@/lib/utils";
import { he } from "@/lib/i18n/he";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const session = await requirePageTenant();
  const submissions = await prisma.submission.findMany({
    where: { apartmentId: session.user.apartmentId! },
    orderBy: { submittedAt: "desc" },
    include: { billingCycle: true, payment: true },
  });

  return (
    <div>
      <PageHeader title={he.tenant.historyTitle} description={he.tenant.historyDesc} />
      {submissions.length === 0 ? (
        <Empty>{he.tenant.noSubmissions}</Empty>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>{he.common.date}</TH>
              <TH>{he.admin.cycles.label}</TH>
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
            {submissions.map((s) => (
              <TR key={s.id}>
                <TD className="whitespace-nowrap text-xs text-slate-500">
                  {formatDate(s.submittedAt)}
                </TD>
                <TD>{s.billingCycle.label}</TD>
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
                    "—"
                  )}
                </TD>
                <TD className="text-right">
                  <Link
                    href={`/dashboard/submission/${s.id}`}
                    className="text-sm font-medium text-brand-600 hover:underline"
                  >
                    {he.common.view} →
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
