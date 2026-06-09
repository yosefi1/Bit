import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { apartmentUpdateSchema } from "@/lib/validators";
import { ApiError, errorResponse, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const apartment = await prisma.apartment.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, username: true, status: true, email: true } },
        submissions: {
          orderBy: { submittedAt: "desc" },
          include: {
            billingCycle: { select: { id: true, label: true } },
            payment: true,
          },
        },
      },
    });
    if (!apartment) throw new ApiError("NOT_FOUND", "Apartment not found");
    return ok({ apartment });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireAdmin();
    const { id } = await ctx.params;
    const body = await req.json();
    const input = apartmentUpdateSchema.parse(body);

    if (input.name) {
      const dup = await prisma.apartment.findFirst({
        where: { name: input.name, NOT: { id } },
      });
      if (dup) throw new ApiError("CONFLICT", "An apartment with this name already exists.");
    }

    const apartment = await prisma.apartment.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.initialMeterReading !== undefined
          ? { initialMeterReading: input.initialMeterReading }
          : {}),
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      action: "apartment.update",
      entityType: "Apartment",
      entityId: apartment.id,
      details: input as Record<string, unknown>,
    });

    return ok({ apartment });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireAdmin();
    const { id } = await ctx.params;

    const apt = await prisma.apartment.findUnique({
      where: { id },
      include: { tenant: true },
    });
    if (!apt) throw new ApiError("NOT_FOUND", "Apartment not found");

    // Cascading delete handles submissions; tenant user is unset via SetNull
    // on User.apartmentId. We *also* delete the tenant user so usernames free up.
    await prisma.$transaction(async (tx) => {
      await tx.apartment.delete({ where: { id } });
      if (apt.tenant) {
        await tx.user.delete({ where: { id: apt.tenant.id } }).catch(() => {});
      }
    });

    await writeAuditLog({
      userId: session.user.id,
      action: "apartment.delete",
      entityType: "Apartment",
      entityId: id,
      details: { name: apt.name },
    });

    return ok({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
