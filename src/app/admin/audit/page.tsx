import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { Table, THead, TBody, TR, TH, TD, Empty } from "@/components/ui/Table";
import { formatDateTime } from "@/lib/utils";
import { he } from "@/lib/i18n/he";

export const dynamic = "force-dynamic";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const logs = await prisma.auditLog.findMany({
    where: sp.q
      ? {
          OR: [
            { action: { contains: sp.q } },
            { entityType: { contains: sp.q } },
            { entityId: { contains: sp.q } },
            { user: { username: { contains: sp.q } } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      user: { select: { name: true, username: true, role: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title={he.admin.audit.title}
        description={he.admin.audit.desc}
      />

      {logs.length === 0 ? (
        <Empty>{he.admin.audit.noEntries}</Empty>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>{he.admin.audit.time}</TH>
              <TH>{he.admin.audit.user}</TH>
              <TH>{he.admin.audit.action}</TH>
              <TH>{he.admin.audit.entity}</TH>
              <TH>{he.admin.audit.details}</TH>
            </TR>
          </THead>
          <TBody>
            {logs.map((l) => (
              <TR key={l.id}>
                <TD className="whitespace-nowrap text-xs text-slate-500">
                  {formatDateTime(l.createdAt)}
                </TD>
                <TD>
                  {l.user ? (
                    <>
                      {l.user.name ?? l.user.username}{" "}
                      <span className="text-xs text-slate-500">
                        ({he.roles[l.user.role as keyof typeof he.roles] ?? l.user.role})
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">{he.admin.audit.system}</span>
                  )}
                </TD>
                <TD className="font-mono text-xs">{l.action}</TD>
                <TD>
                  {l.entityType ? (
                    <>
                      {l.entityType}{" "}
                      {l.entityId && (
                        <span className="text-xs text-slate-400">#{l.entityId.slice(0, 6)}</span>
                      )}
                    </>
                  ) : (
                    "—"
                  )}
                </TD>
                <TD>
                  {l.details ? (
                    <details className="max-w-md">
                      <summary className="cursor-pointer text-xs text-brand-600">
                        {he.admin.audit.view}
                      </summary>
                      <pre className="mt-1 max-w-full overflow-auto rounded bg-slate-50 p-2 text-xs">
                        {JSON.stringify(JSON.parse(l.details), null, 2)}
                      </pre>
                    </details>
                  ) : (
                    "—"
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
