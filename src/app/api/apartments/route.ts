import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { apartmentCreateSchema } from "@/lib/validators";
import { ApiError, errorResponse, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    await requireAdmin();
    const apartments = await prisma.apartment.findMany({
      orderBy: { name: "asc" },
      include: {
        tenant: {
          select: { id: true, name: true, username: true, status: true },
        },
        _count: { select: { submissions: true } },
      },
    });
    return ok({ apartments });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const input = apartmentCreateSchema.parse(body);

    // Check name uniqueness
    const dup = await prisma.apartment.findUnique({ where: { name: input.name } });
    if (dup) throw new ApiError("CONFLICT", "An apartment with this name already exists.");

    if (input.tenant) {
      const dupUser = await prisma.user.findUnique({
        where: { username: input.tenant.username },
      });
      if (dupUser)
        throw new ApiError("CONFLICT", "Username already taken.");
    }

    const apartment = await prisma.apartment.create({
      data: {
        name: input.name,
        notes: input.notes ?? null,
        status: input.status,
        initialMeterReading: input.initialMeterReading,
        tenant: input.tenant
          ? {
              create: {
                name: input.tenant.name,
                username: input.tenant.username,
                password: await bcrypt.hash(input.tenant.password, 10),
                email: input.tenant.email ?? null,
                role: "TENANT",
                status: "ACTIVE",
              },
            }
          : undefined,
      },
      include: { tenant: true },
    });

    await writeAuditLog({
      userId: session.user.id,
      action: "apartment.create",
      entityType: "Apartment",
      entityId: apartment.id,
      details: { name: apartment.name },
    });

    return ok({ apartment }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
