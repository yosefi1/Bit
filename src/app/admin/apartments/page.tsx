import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/shared/PageHeader";
import { Table, THead, TBody, TR, TH, TD, Empty } from "@/components/ui/Table";
import { he } from "@/lib/i18n/he";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ApartmentsPage() {
  const apartments = await prisma.apartment.findMany({
    orderBy: { name: "asc" },
    include: {
      tenant: { select: { id: true, name: true, username: true, status: true } },
      _count: { select: { submissions: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title={he.admin.apartments.title}
        description={he.admin.apartments.desc}
        actions={
          <Link href="/admin/apartments/new">
            <Button>
              <Plus className="h-4 w-4" />
              {he.admin.apartments.new}
            </Button>
          </Link>
        }
      />

      {apartments.length === 0 ? (
        <Empty>
          {he.admin.apartments.noApartments}{" "}
          <Link href="/admin/apartments/new" className="text-brand-600 underline">
            {he.admin.apartments.addFirst}
          </Link>
        </Empty>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>{he.admin.apartments.name}</TH>
              <TH>{he.admin.apartments.tenant}</TH>
              <TH>{he.admin.apartments.username}</TH>
              <TH>{he.common.status}</TH>
              <TH className="text-right">{he.admin.apartments.submissions}</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {apartments.map((a) => (
              <TR key={a.id}>
                <TD className="font-medium text-slate-900">{a.name}</TD>
                <TD>
                  {a.tenant ? (
                    a.tenant.name
                  ) : (
                    <span className="text-slate-400">{he.admin.apartments.unassigned}</span>
                  )}
                </TD>
                <TD>
                  {a.tenant ? (
                    <span className="font-mono text-xs">@{a.tenant.username}</span>
                  ) : (
                    "—"
                  )}
                </TD>
                <TD>
                  <StatusBadge kind="apartment" status={a.status} />
                </TD>
                <TD className="text-right">{a._count.submissions}</TD>
                <TD className="text-right">
                  <Link
                    href={`/admin/apartments/${a.id}`}
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
