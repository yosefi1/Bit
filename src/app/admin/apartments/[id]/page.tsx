import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, THead, TBody, TR, TH, TD, Empty } from "@/components/ui/Table";
import { ApartmentEditForms } from "./ApartmentEditForms";
import { formatCurrency, formatDateTime, formatKwh } from "@/lib/utils";
import { DeleteApartmentButton } from "./DeleteApartmentButton";
import { he } from "@/lib/i18n/he";

export const dynamic = "force-dynamic";

export default async function ApartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const apartment = await prisma.apartment.findUnique({
    where: { id },
    include: {
      tenant: { select: { id: true, name: true, username: true, email: true, status: true } },
      submissions: {
        orderBy: { submittedAt: "desc" },
        include: { billingCycle: { select: { label: true } }, payment: true },
      },
    },
  });
  if (!apartment) notFound();

  return (
    <div>
      <PageHeader
        title={apartment.name}
        description={he.admin.apartments.desc}
        actions={<DeleteApartmentButton id={apartment.id} name={apartment.name} />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ApartmentEditForms apartment={apartment} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{he.admin.apartments.history}</CardTitle>
        </CardHeader>
        <CardBody>
          {apartment.submissions.length === 0 ? (
            <Empty>{he.admin.apartments.noHistory}</Empty>
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
                </TR>
              </THead>
              <TBody>
                {apartment.submissions.map((s) => (
                  <TR key={s.id}>
                    <TD className="whitespace-nowrap">
                      {formatDateTime(s.submittedAt)}
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
                        <span className="text-xs text-slate-400">—</span>
                      )}
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
