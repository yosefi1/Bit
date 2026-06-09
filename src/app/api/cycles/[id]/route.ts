import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { billingCycleUpdateSchema } from "@/lib/validators";
import { ApiError, errorResponse, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { deriveCycleFigures } from "@/lib/billing";
import { getElectricityRateShekels } from "@/lib/electricity-rate";
import { he } from "@/lib/i18n/he";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
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
    if (!cycle) throw new ApiError("NOT_FOUND", he.errors.notFound);
    return ok({ cycle });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireAdmin();
    const { id } = await ctx.params;
    const body = await req.json();
    const input = billingCycleUpdateSchema.parse(body);

    const existing = await prisma.billingCycle.findUnique({ where: { id } });
    if (!existing) throw new ApiError("NOT_FOUND", he.errors.notFound);

    const merged = {
      masterMeterPrevious: input.masterMeterPrevious ?? existing.masterMeterPrevious,
      masterMeterCurrent: input.masterMeterCurrent ?? existing.masterMeterCurrent,
    };
    const needsRecalc =
      input.masterMeterPrevious !== undefined ||
      input.masterMeterCurrent !== undefined;

    const figures = needsRecalc ? deriveCycleFigures(merged) : null;
    const ratePerKwh = needsRecalc ? await getElectricityRateShekels() : undefined;

    const cycle = await prisma.billingCycle.update({
      where: { id },
      data: {
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
        ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
        ...(input.totalBillAmount !== undefined
          ? { totalBillAmount: input.totalBillAmount }
          : {}),
        ...(needsRecalc
          ? {
              masterMeterPrevious: merged.masterMeterPrevious,
              masterMeterCurrent: merged.masterMeterCurrent,
              totalConsumption: figures!.totalConsumption,
              ratePerKwh: ratePerKwh!,
            }
          : {}),
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      action: "cycle.update",
      entityType: "BillingCycle",
      entityId: cycle.id,
      details: { changed: Object.keys(input), recalculated: needsRecalc },
    });

    return ok({ cycle });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireAdmin();
    const { id } = await ctx.params;
    const c = await prisma.billingCycle.findUnique({
      where: { id },
      include: { _count: { select: { submissions: true } } },
    });
    if (!c) throw new ApiError("NOT_FOUND", he.errors.notFound);
    if (c._count.submissions > 0)
      throw new ApiError(
        "CONFLICT",
        "לא ניתן למחוק מחזור עם דיווחים. סגור אותו במקום."
      );
    await prisma.billingCycle.delete({ where: { id } });
    await writeAuditLog({
      userId: session.user.id,
      action: "cycle.delete",
      entityType: "BillingCycle",
      entityId: id,
      details: { label: c.label },
    });
    return ok({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
