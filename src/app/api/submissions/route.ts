import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { submissionCreateSchema } from "@/lib/validators";
import { ApiError, errorResponse, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import {
  computeSubmissionFigures,
  getPreviousReadingForApartment,
} from "@/lib/billing";
import { notify } from "@/lib/notifications";
import { getElectricityRateShekels } from "@/lib/electricity-rate";
import { he } from "@/lib/i18n/he";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const url = new URL(req.url);

    const filters = {
      cycleId: url.searchParams.get("cycleId") || undefined,
      apartmentId: url.searchParams.get("apartmentId") || undefined,
      status: url.searchParams.get("status") || undefined,
    };

    if (session.user.role === "TENANT") {
      // Tenants only see their own submissions
      if (!session.user.apartmentId) return ok({ submissions: [] });
      filters.apartmentId = session.user.apartmentId;
    }

    const submissions = await prisma.submission.findMany({
      where: {
        ...(filters.cycleId ? { billingCycleId: filters.cycleId } : {}),
        ...(filters.apartmentId ? { apartmentId: filters.apartmentId } : {}),
        ...(filters.status
          ? { status: filters.status as "PENDING" | "APPROVED" | "REJECTED" }
          : {}),
      },
      orderBy: { submittedAt: "desc" },
      include: {
        apartment: { include: { tenant: { select: { name: true, username: true } } } },
        billingCycle: { select: { id: true, label: true, ratePerKwh: true } },
        payment: true,
      },
    });
    return ok({ submissions });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (session.user.role !== "TENANT" || !session.user.apartmentId) {
      throw new ApiError("FORBIDDEN", he.errors.forbidden);
    }
    const apartmentId = session.user.apartmentId;
    const body = await req.json();
    const input = submissionCreateSchema.parse(body);

    const cycle = await prisma.billingCycle.findUnique({
      where: { id: input.billingCycleId },
    });
    if (!cycle) throw new ApiError("NOT_FOUND", he.errors.notFound);
    if (cycle.status !== "OPEN")
      throw new ApiError("BAD_REQUEST", he.errors.cycleClosed);

    // Don't allow more than one submission per apartment per cycle unless the
    // previous one was rejected.
    const existing = await prisma.submission.findFirst({
      where: { apartmentId, billingCycleId: cycle.id, status: { not: "REJECTED" } },
    });
    if (existing)
      throw new ApiError("CONFLICT", he.errors.alreadySubmitted);

    const previousReading = await getPreviousReadingForApartment(apartmentId);
    const ratePerKwh = await getElectricityRateShekels();
    const { consumption, amountDue } = computeSubmissionFigures({
      confirmedReading: input.confirmedReading,
      previousReading,
      ratePerKwh,
    });

    const apartmentCount = await prisma.apartment.count({
      where: { status: "ACTIVE" },
    });
    const fairShare = apartmentCount > 0 ? cycle.totalConsumption / apartmentCount : Infinity;
    if (consumption > Math.max(fairShare * 10, 1000)) {
      throw new ApiError("BAD_REQUEST", he.errors.consumptionTooHigh);
    }

    if (!input.imageUrl?.trim()) {
      throw new ApiError("BAD_REQUEST", he.submit.imageRequired);
    }

    const submission = await prisma.submission.create({
      data: {
        apartmentId,
        billingCycleId: cycle.id,
        previousReading,
        ocrReading: input.ocrReading ?? null,
        ocrConfidence: input.ocrConfidence ?? null,
        ocrRawText: input.ocrRawText ?? null,
        confirmedReading: input.confirmedReading,
        consumption,
        ratePerKwh,
        amountDue,
        imageUrl: input.imageUrl,
        imageOriginalName: input.imageOriginalName ?? null,
        status: "PENDING",
      },
      include: { apartment: true, billingCycle: true },
    });

    await writeAuditLog({
      userId: session.user.id,
      action: "submission.create",
      entityType: "Submission",
      entityId: submission.id,
      details: {
        apartmentId,
        cycleId: cycle.id,
        confirmedReading: input.confirmedReading,
        consumption,
        amountDue,
      },
    });

    notify("submission.created", {
      to: { name: session.user.name ?? session.user.username },
      meta: { submissionId: submission.id, amountDue },
    }).catch(() => {});

    return ok({ submission }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
