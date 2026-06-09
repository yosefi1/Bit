import { NextRequest } from "next/server";
import { requireAdmin, requireSession } from "@/lib/session";
import { errorResponse, ok } from "@/lib/api";
import {
  getElectricityRateAgorot,
  setElectricityRateAgorot,
  agorotToShekels,
} from "@/lib/electricity-rate";
import { electricityRateSchema } from "@/lib/validators";
import { writeAuditLog } from "@/lib/audit";

/** כל משתמש מחובר יכול לראות את המחיר (ללא אפשרות עריכה). */
export async function GET() {
  try {
    await requireSession();
    const agorot = await getElectricityRateAgorot();
    return ok({
      rateAgorot: agorot,
      rateShekels: agorotToShekels(agorot),
    });
  } catch (err) {
    return errorResponse(err);
  }
}

/** רק מנהל יכול לשנות את מחיר הקו"ח. */
export async function PUT(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const input = electricityRateSchema.parse(body);
    const agorot = await setElectricityRateAgorot(input.rateAgorot);

    await writeAuditLog({
      userId: session.user.id,
      action: "settings.electricity.update",
      entityType: "AppSetting",
      details: { rateAgorot: agorot },
    });

    return ok({
      rateAgorot: agorot,
      rateShekels: agorotToShekels(agorot),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
