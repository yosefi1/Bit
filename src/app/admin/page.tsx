import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency, formatDateTime, formatKwh, formatRateShekels } from "@/lib/utils";
import { he } from "@/lib/i18n/he";
import Link from "next/link";
import { Building2, FileClock, Wallet, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

async function getOverview() {
  const [apartments, pending, paid, unpaid, currentCycle, recent] = await Promise.all([
    prisma.apartment.count(),
    prisma.submission.count({ where: { status: "PENDING" } }),
    prisma.payment.count({ where: { status: "PAID" } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.billingCycle.findFirst({
      where: { status: "OPEN" },
      orderBy: { startDate: "desc" },
      include: {
        submissions: { include: { payment: true } },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { name: true, username: true, role: true } } },
    }),
  ]);

  const monthlyTotal =
    currentCycle?.submissions.reduce(
      (acc, s) => acc + (s.status === "APPROVED" ? s.amountDue : 0),
      0
    ) ?? 0;
  const monthlyCollected =
    currentCycle?.submissions.reduce(
      (acc, s) => acc + (s.payment?.status === "PAID" ? s.amountDue : 0),
      0
    ) ?? 0;

  return { apartments, pending, paid, unpaid, currentCycle, recent, monthlyTotal, monthlyCollected };
}

export default async function AdminOverviewPage() {
  const o = await getOverview();

  return (
    <div>
      <PageHeader
        title={he.admin.overview.title}
        description={he.admin.overview.desc}
        actions={
          <Link
            href="/admin/cycles/new"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {he.admin.overview.newCycle}
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={he.admin.overview.apartments}
          value={o.apartments}
          icon={<Building2 className="h-5 w-5" />}
          href="/admin/apartments"
        />
        <StatCard
          label={he.admin.overview.pendingSubmissions}
          value={o.pending}
          tone={o.pending > 0 ? "warning" : "neutral"}
          icon={<FileClock className="h-5 w-5" />}
          href="/admin/submissions?status=PENDING"
        />
        <StatCard
          label={he.admin.overview.paidPayments}
          value={o.paid}
          tone="success"
          icon={<Wallet className="h-5 w-5" />}
        />
        <StatCard
          label={he.admin.overview.unpaidPayments}
          value={o.unpaid}
          tone={o.unpaid > 0 ? "danger" : "neutral"}
          icon={<AlertCircle className="h-5 w-5" />}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{he.admin.overview.currentCycle}</CardTitle>
          </CardHeader>
          <CardBody>
            {o.currentCycle ? (
              <dl className="space-y-2 text-sm">
                <Row k={he.admin.cycles.label} v={o.currentCycle.label} />
                <Row
                  k={he.admin.overview.period}
                  v={`${formatDateTime(o.currentCycle.startDate)} → ${formatDateTime(o.currentCycle.endDate)}`}
                />
                <Row k={he.admin.overview.totalBill} v={formatCurrency(o.currentCycle.totalBillAmount)} />
                <Row
                  k={he.admin.overview.totalConsumption}
                  v={formatKwh(o.currentCycle.totalConsumption)}
                />
                <Row
                  k={he.rate.label}
                  v={formatRateShekels(o.currentCycle.ratePerKwh)}
                />
                <Row
                  k={he.admin.overview.approvedThisCycle}
                  v={formatCurrency(o.monthlyTotal)}
                />
                <Row k={he.admin.overview.collected} v={formatCurrency(o.monthlyCollected)} />
              </dl>
            ) : (
              <div className="text-sm text-slate-500">
                {he.admin.overview.noCycle}{" "}
                <Link href="/admin/cycles/new" className="text-brand-600 underline">
                  {he.admin.overview.createCycle}
                </Link>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{he.admin.overview.recentActivity}</CardTitle>
            <Link
              href="/admin/audit"
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              {he.common.viewAll}
            </Link>
          </CardHeader>
          <CardBody className="space-y-3">
            {o.recent.length === 0 && (
              <p className="text-sm text-slate-500">{he.admin.overview.noActivity}</p>
            )}
            {o.recent.map((log) => (
              <div key={log.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <div className="font-medium text-slate-800">{log.action}</div>
                  <div className="text-xs text-slate-500">
                    {log.user
                      ? `${log.user.name ?? log.user.username} (${he.roles[log.user.role as keyof typeof he.roles] ?? log.user.role})`
                      : he.admin.overview.system}
                  </div>
                </div>
                <span className="whitespace-nowrap text-xs text-slate-400">
                  {formatDateTime(log.createdAt)}
                </span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = "neutral",
  href,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: "neutral" | "warning" | "danger" | "success";
  href?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-slate-50 text-slate-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-red-50 text-red-600",
    success: "bg-emerald-50 text-emerald-600",
  };
  const content = (
    <Card className="hover:shadow-md transition-shadow">
      <CardBody className="flex items-center gap-4">
        <div className={`rounded-lg p-3 ${tones[tone]}`}>{icon}</div>
        <div>
          <div className="text-2xl font-semibold text-slate-900">{value}</div>
          <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        </div>
      </CardBody>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{k}</dt>
      <dd className="text-sm font-medium text-slate-800">{v}</dd>
    </div>
  );
}
