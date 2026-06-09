import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { tenantAssignSchema, tenantUpdateSchema } from "@/lib/validators";
import { ApiError, errorResponse, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";

interface Ctx {
  params: Promise<{ id: string }>;
}

/** Assign a brand-new tenant user to an apartment that currently has none. */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireAdmin();
    const { id: apartmentId } = await ctx.params;
    const body = await req.json();
    const input = tenantAssignSchema.parse(body);

    const apt = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      include: { tenant: true },
    });
    if (!apt) throw new ApiError("NOT_FOUND", "Apartment not found");
    if (apt.tenant)
      throw new ApiError(
        "CONFLICT",
        "This apartment already has a tenant. Edit the existing tenant instead."
      );

    const dup = await prisma.user.findUnique({ where: { username: input.username } });
    if (dup) throw new ApiError("CONFLICT", "Username already taken.");

    const user = await prisma.user.create({
      data: {
        name: input.name,
        username: input.username,
        password: await bcrypt.hash(input.password, 10),
        email: input.email ?? null,
        role: "TENANT",
        status: "ACTIVE",
        apartmentId,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      action: "tenant.assign",
      entityType: "Apartment",
      entityId: apartmentId,
      details: { tenantId: user.id, username: user.username },
    });

    return ok(
      { tenant: { id: user.id, name: user.name, username: user.username } },
      { status: 201 }
    );
  } catch (err) {
    return errorResponse(err);
  }
}

/** Update an existing tenant's credentials/info. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireAdmin();
    const { id: apartmentId } = await ctx.params;
    const body = await req.json();
    const input = tenantUpdateSchema.parse(body);

    const apt = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      include: { tenant: true },
    });
    if (!apt?.tenant) throw new ApiError("NOT_FOUND", "Tenant not found for this apartment");

    if (input.username && input.username !== apt.tenant.username) {
      const dup = await prisma.user.findUnique({ where: { username: input.username } });
      if (dup) throw new ApiError("CONFLICT", "Username already taken.");
    }

    const updated = await prisma.user.update({
      where: { id: apt.tenant.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.username !== undefined ? { username: input.username } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.password
          ? { password: await bcrypt.hash(input.password, 10) }
          : {}),
      },
      select: { id: true, name: true, username: true, email: true, status: true },
    });

    await writeAuditLog({
      userId: session.user.id,
      action: "tenant.update",
      entityType: "User",
      entityId: updated.id,
      details: {
        changed: Object.keys(input).filter((k) => k !== "password"),
        passwordChanged: !!input.password,
      },
    });

    return ok({ tenant: updated });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Remove the tenant from an apartment (deletes the tenant user). */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await requireAdmin();
    const { id: apartmentId } = await ctx.params;
    const apt = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      include: { tenant: true },
    });
    if (!apt?.tenant) throw new ApiError("NOT_FOUND", "Tenant not found");
    await prisma.user.delete({ where: { id: apt.tenant.id } });
    await writeAuditLog({
      userId: session.user.id,
      action: "tenant.remove",
      entityType: "Apartment",
      entityId: apartmentId,
      details: { tenantId: apt.tenant.id },
    });
    return ok({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
