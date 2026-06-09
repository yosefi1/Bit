import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireAdmin } from "@/lib/session";
import { paymentUpdateSchema } from "@/lib/validators";
import { ApiError, errorResponse, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { notify } from "@/lib/notifications";

interface Ctx {
  params: Promise<{ submissionId: string }>;
}

/**
 * Tenants may transition their own payment from PENDING -> PAID (claim they
 * paid via Bit). Admins can set any status. The owner reviews the bank/Bit
 * confirmation manually and can revert if needed.
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { submissionId } = await ctx.params;
    const body = await req.json();
    const input = paymentUpdateSchema.parse(body);

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { payment: true, apartment: true },
    });
    if (!submission) throw new ApiError("NOT_FOUND", "Submission not found");
    if (!submission.payment)
      throw new ApiError(
        "BAD_REQUEST",
        "No payment record yet — the submission must be approved first."
      );

    const isAdmin = session.user.role === "ADMIN";
    const isOwner =
      session.user.role === "TENANT" &&
      submission.apartmentId === session.user.apartmentId;
    if (!isAdmin && !isOwner)
      throw new ApiError("FORBIDDEN", "Not allowed.");
    if (!isAdmin && input.status === "CANCELLED")
      throw new ApiError("FORBIDDEN", "Only admins can cancel a payment.");

    const payment = await prisma.payment.update({
      where: { submissionId },
      data: {
        status: input.status,
        method: input.method ?? submission.payment.method,
        reference: input.reference ?? submission.payment.reference,
        notes: input.notes ?? submission.payment.notes,
        paidAt:
          input.status === "PAID"
            ? new Date()
            : input.status === "PENDING"
              ? null
              : submission.payment.paidAt,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      action: "payment.update",
      entityType: "Payment",
      entityId: payment.id,
      details: { status: input.status, method: input.method ?? null },
    });

    if (input.status === "PAID")
      notify("payment.marked_paid", { to: {}, meta: { submissionId } }).catch(() => {});

    return ok({ payment });
  } catch (err) {
    return errorResponse(err);
  }
}
