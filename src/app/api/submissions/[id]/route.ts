import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireAdmin } from "@/lib/session";
import { submissionAdminUpdateSchema } from "@/lib/validators";
import { ApiError, errorResponse, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { computeSubmissionFigures } from "@/lib/billing";
import { notify } from "@/lib/notifications";
import { getElectricityRateShekels } from "@/lib/electricity-rate";
import { he } from "@/lib/i18n/he";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        apartment: { include: { tenant: true } },
        billingCycle: true,
        payment: true,
      },
    });
    if (!submission) throw new ApiError("NOT_FOUND", "Submission not found");

    if (
      session.user.role !== "ADMIN" &&
      submission.apartmentId !== session.user.apartmentId
    ) {
      throw new ApiError("FORBIDDEN", "Not allowed.");
    }
    return ok({ submission });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireAdmin();
    const { id } = await ctx.params;
    const body = await req.json();
    const input = submissionAdminUpdateSchema.parse(body);

    const existing = await prisma.submission.findUnique({
      where: { id },
      include: { billingCycle: true, payment: true },
    });
    if (!existing) throw new ApiError("NOT_FOUND", "Submission not found");

    const confirmedReading = input.confirmedReading ?? existing.confirmedReading;
    const previousReading = input.previousReading ?? existing.previousReading;

    const ratePerKwh = await getElectricityRateShekels();
    const figures = computeSubmissionFigures({
      confirmedReading,
      previousReading,
      ratePerKwh,
    });

    const nextStatus = input.status ?? existing.status;

    const submission = await prisma.$transaction(async (tx) => {
      const updated = await tx.submission.update({
        where: { id },
        data: {
          confirmedReading,
          previousReading,
          consumption: figures.consumption,
          amountDue: figures.amountDue,
          ratePerKwh,
          adminComment: input.adminComment ?? existing.adminComment,
          rejectionReason: input.rejectionReason ?? existing.rejectionReason,
          imageUrl: input.imageUrl ?? existing.imageUrl,
          status: nextStatus,
          reviewedAt:
            nextStatus !== existing.status && nextStatus !== "PENDING"
              ? new Date()
              : existing.reviewedAt,
        },
      });

      // Auto-create Payment record when a submission is approved.
      if (nextStatus === "APPROVED") {
        await tx.payment.upsert({
          where: { submissionId: id },
          create: {
            submissionId: id,
            amount: figures.amountDue,
            status: "PENDING",
          },
          update: { amount: figures.amountDue },
        });
      }

      // Remove payment if reverting to non-approved
      if (nextStatus !== "APPROVED" && existing.payment) {
        await tx.payment.delete({ where: { submissionId: id } }).catch(() => {});
      }

      return updated;
    });

    await writeAuditLog({
      userId: session.user.id,
      action:
        input.status === "APPROVED"
          ? "submission.approve"
          : input.status === "REJECTED"
            ? "submission.reject"
            : "submission.update",
      entityType: "Submission",
      entityId: id,
      details: {
        changed: Object.keys(input),
        consumption: figures.consumption,
        amountDue: figures.amountDue,
      },
    });

    if (input.status === "APPROVED")
      notify("submission.approved", { to: {}, meta: { submissionId: id } }).catch(() => {});
    if (input.status === "REJECTED")
      notify("submission.rejected", { to: {}, meta: { submissionId: id } }).catch(() => {});

    return ok({ submission });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireAdmin();
    const { id } = await ctx.params;
    const existing = await prisma.submission.findUnique({ where: { id } });
    if (!existing) throw new ApiError("NOT_FOUND", "Submission not found");
    await prisma.submission.delete({ where: { id } });
    await writeAuditLog({
      userId: session.user.id,
      action: "submission.delete",
      entityType: "Submission",
      entityId: id,
    });
    return ok({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
