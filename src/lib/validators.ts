import { z } from "zod";
import { USERNAME_REGEX, normalizeUsername } from "./username";

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(40)
  .refine((v) => USERNAME_REGEX.test(v.normalize("NFC")), {
    message: "שם משתמש: אותיות (עברית/לatin), מספרים, . _ -",
  })
  .transform(normalizeUsername);

export const apartmentCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  notes: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  initialMeterReading: z.coerce.number().min(0).default(0),
  tenant: z
    .object({
      name: z.string().trim().min(1).max(200),
      username: usernameSchema,
      password: z.string().min(6).max(200),
      email: z.string().trim().email().optional().nullable(),
    })
    .optional(),
});
export type ApartmentCreateInput = z.infer<typeof apartmentCreateSchema>;

export const apartmentUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  initialMeterReading: z.coerce.number().min(0).optional(),
});
export type ApartmentUpdateInput = z.infer<typeof apartmentUpdateSchema>;

export const tenantUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  username: usernameSchema.optional(),
  password: z.string().min(6).max(200).optional(),
  email: z.string().trim().email().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const tenantAssignSchema = z.object({
  name: z.string().trim().min(1).max(200),
  username: usernameSchema,
  password: z.string().min(6).max(200),
  email: z.string().trim().email().optional().nullable(),
});

/* --------------------------- Billing Cycles ---------------------------- */

export const billingCycleCreateSchema = z
  .object({
    label: z.string().trim().min(1).max(80),
    utility: z.enum(["ELECTRICITY", "WATER", "GAS", "MAINTENANCE"]).default("ELECTRICITY"),
    totalBillAmount: z.coerce.number().positive(),
    masterMeterPrevious: z.coerce.number().min(0),
    masterMeterCurrent: z.coerce.number().min(0),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((v) => v.masterMeterCurrent > v.masterMeterPrevious, {
    message: "Current master meter must be greater than previous",
    path: ["masterMeterCurrent"],
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });
export type BillingCycleCreateInput = z.infer<typeof billingCycleCreateSchema>;

export const billingCycleUpdateSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  totalBillAmount: z.coerce.number().positive().optional(),
  masterMeterPrevious: z.coerce.number().min(0).optional(),
  masterMeterCurrent: z.coerce.number().min(0).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(["OPEN", "CLOSED"]).optional(),
});

/* ----------------------------- Submissions ----------------------------- */

export const submissionCreateSchema = z.object({
  billingCycleId: z.string().min(1),
  confirmedReading: z.coerce.number().min(0),
  imageUrl: z.string().optional().nullable(),
  imageOriginalName: z.string().optional().nullable(),
  ocrReading: z.coerce.number().min(0).optional().nullable(),
  ocrConfidence: z.coerce.number().min(0).max(1).optional().nullable(),
  ocrRawText: z.string().optional().nullable(),
});
export type SubmissionCreateInput = z.infer<typeof submissionCreateSchema>;

export const submissionAdminUpdateSchema = z.object({
  confirmedReading: z.coerce.number().min(0).optional(),
  previousReading: z.coerce.number().min(0).optional(),
  imageUrl: z.string().optional().nullable(),
  adminComment: z.string().max(2000).optional().nullable(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  rejectionReason: z.string().max(2000).optional().nullable(),
});

/* ------------------------------- Payments ------------------------------ */

export const paymentUpdateSchema = z.object({
  status: z.enum(["PENDING", "PAID", "CANCELLED"]),
  method: z.string().max(50).optional().nullable(),
  reference: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

/* ------------------------------- Settings ------------------------------ */

export const bitSettingsSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .regex(/^[0-9+\-\s]+$/, "מספר טלפון לא תקין"),
  name: z.string().trim().min(1).max(120),
  instructions: z.string().trim().max(2000),
});

export const electricityRateSchema = z.object({
  rateAgorot: z.coerce
    .number()
    .positive("מחיר חייב להיות חיובי")
    .max(9999, "מחיר גבוה מדי"),
});
