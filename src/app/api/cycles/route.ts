import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { billingCycleCreateSchema } from "@/lib/validators";
import { ApiError, errorResponse, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { deriveCycleFigures } from "@/lib/billing";
import { getElectricityRateShekels } from "@/lib/electricity-rate";
import { he } from "@/lib/i18n/he";

export async function GET() {
  try {
    await requireAdmin();
    const cycles = await prisma.billingCycle.findMany({
      orderBy: { startDate: "desc" },
      include: { _count: { select: { submissions: true } } },
    });
    return ok({ cycles });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const input = billingCycleCreateSchema.parse(body);

    const dup = await prisma.billingCycle.findUnique({ where: { label: input.label } });
    if (dup)
      throw new ApiError("CONFLICT", he.errors.cycleExists);

    const { totalConsumption } = deriveCycleFigures({
      masterMeterPrevious: input.masterMeterPrevious,
      masterMeterCurrent: input.masterMeterCurrent,
    });

    // מחיר הקו"ח נקבע בהגדרות — רק מנהל יכול לשנות
    const ratePerKwh = await getElectricityRateShekels();

    const cycle = await prisma.billingCycle.create({
      data: {
        label: input.label,
        utility: input.utility,
        totalBillAmount: input.totalBillAmount,
        masterMeterPrevious: input.masterMeterPrevious,
        masterMeterCurrent: input.masterMeterCurrent,
        totalConsumption,
        ratePerKwh,
        startDate: input.startDate,
        endDate: input.endDate,
        notes: input.notes ?? null,
        status: "OPEN",
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      action: "cycle.create",
      entityType: "BillingCycle",
      entityId: cycle.id,
      details: { label: cycle.label, ratePerKwh: cycle.ratePerKwh },
    });

    return ok({ cycle }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
