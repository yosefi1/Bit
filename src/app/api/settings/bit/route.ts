import { NextRequest } from "next/server";
import { requireAdmin, requireSession } from "@/lib/session";
import { errorResponse, ok } from "@/lib/api";
import { getBitConfig, setBitConfig } from "@/lib/bit";
import { bitSettingsSchema } from "@/lib/validators";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    await requireSession();
    const cfg = await getBitConfig();
    return ok({ config: cfg });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const input = bitSettingsSchema.parse(body);
    const cfg = await setBitConfig(input);
    await writeAuditLog({
      userId: session.user.id,
      action: "settings.bit.update",
      entityType: "AppSetting",
      details: input,
    });
    return ok({ config: cfg });
  } catch (err) {
    return errorResponse(err);
  }
}
