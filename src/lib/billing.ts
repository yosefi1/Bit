import { prisma } from "./prisma";
import { ApiError } from "./api";
import { round2 } from "./utils";
import { he } from "./i18n/he";

/**
 * Returns the most recent "approved" submission's confirmed reading for an
 * apartment, or the apartment's initial reading if none exists yet.
 *
 * The "previous reading" semantics is intentionally global across cycles —
 * meters are cumulative, so the latest approved reading is always the baseline
 * for the next submission, regardless of which cycle it was made under.
 */
export async function getPreviousReadingForApartment(
  apartmentId: string,
  excludeSubmissionId?: string
): Promise<number> {
  const last = await prisma.submission.findFirst({
    where: {
      apartmentId,
      status: "APPROVED",
      ...(excludeSubmissionId ? { id: { not: excludeSubmissionId } } : {}),
    },
    orderBy: { submittedAt: "desc" },
    select: { confirmedReading: true },
  });
  if (last) return last.confirmedReading;

  const apt = await prisma.apartment.findUnique({
    where: { id: apartmentId },
    select: { initialMeterReading: true },
  });
  if (!apt) throw new ApiError("NOT_FOUND", "Apartment not found");
  return apt.initialMeterReading;
}

/**
 * Derive the canonical numbers for a billing cycle from its inputs.
 *
 *   totalConsumption = masterMeterCurrent - masterMeterPrevious
 *   ratePerKwh       = totalBillAmount / totalConsumption
 *
 * Both are rounded to 4 decimals so calculations are stable.
 */
export function deriveCycleFigures(input: {
  masterMeterPrevious: number;
  masterMeterCurrent: number;
}): { totalConsumption: number } {
  const totalConsumption = Math.max(
    0,
    input.masterMeterCurrent - input.masterMeterPrevious
  );
  if (totalConsumption === 0) {
    throw new ApiError(
      "BAD_REQUEST",
      "צריכה כוללת אפס — בדוק את קריאות המונה הראשי."
    );
  }
  // המחיר נקבע בהגדרות על ידי המנהל — לא מחושב מחשבון החשמל
  return {
    totalConsumption: round2(totalConsumption),
  };
}

/**
 * Compute consumption + amount due for a submission given the cycle rate
 * and the previous reading.
 */
export function computeSubmissionFigures(opts: {
  confirmedReading: number;
  previousReading: number;
  ratePerKwh: number;
}): { consumption: number; amountDue: number } {
  if (opts.confirmedReading < opts.previousReading) {
    throw new ApiError("BAD_REQUEST", he.errors.readingTooLow);
  }
  const consumption = round2(opts.confirmedReading - opts.previousReading);
  const amountDue = round2(consumption * opts.ratePerKwh);
  return { consumption, amountDue };
}
