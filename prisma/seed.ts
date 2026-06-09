/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME ?? "admin";
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
const SEED_ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "מנהל האתר";

const BIT_PHONE = process.env.BIT_PHONE ?? "0500000000";
const BIT_NAME = process.env.BIT_RECIPIENT_NAME ?? "בעל הדירות";
const BIT_INSTRUCTIONS =
  "פתח את אפליקציית ביט, שלח את הסכום המוצג למספר הטלפון, " +
  "והוסף את שם הדירה בהערה. לאחר השליחה סמן את הדיווח כשולם.";

const RATE_SHEKELS = 0.6432; // 64.32 אגורות לקו״ח

async function upsertSetting(key: string, value: string) {
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

async function main() {
  console.log("→ Seeding application settings...");
  await upsertSetting("electricity.rateAgorot", "64.32");
  await upsertSetting("bit.phone", BIT_PHONE);
  await upsertSetting("bit.name", BIT_NAME);
  await upsertSetting("bit.instructions", BIT_INSTRUCTIONS);

  console.log("→ Upserting admin user...");
  const adminPass = await bcrypt.hash(SEED_ADMIN_PASSWORD, 10);
  await prisma.user.upsert({
    where: { username: SEED_ADMIN_USERNAME.toLowerCase() },
    create: {
      username: SEED_ADMIN_USERNAME.toLowerCase(),
      password: adminPass,
      name: SEED_ADMIN_NAME,
      role: "ADMIN",
      status: "ACTIVE",
    },
    update: { password: adminPass, name: SEED_ADMIN_NAME, role: "ADMIN" },
  });

  console.log("→ Creating sample apartments and tenants...");
  const tenantPass = await bcrypt.hash("tenant123", 10);
  const sampleApartments = [
    { name: "דירה 1א", initialMeterReading: 12000, tenant: { name: "אליס כהן", username: "alice", email: "alice@example.com" } },
    { name: "דירה 1ב", initialMeterReading: 8400, tenant: { name: "בועז לוי", username: "boaz", email: "boaz@example.com" } },
    { name: "דירה 2א", initialMeterReading: 15700, tenant: { name: "חן מזרחי", username: "chen", email: "chen@example.com" } },
    { name: "דירה 2ב", initialMeterReading: 9300, tenant: null },
  ];

  for (const a of sampleApartments) {
    const apt = await prisma.apartment.upsert({
      where: { name: a.name },
      create: {
        name: a.name,
        initialMeterReading: a.initialMeterReading,
        status: "ACTIVE",
        notes: null,
      },
      update: {},
    });
    if (a.tenant) {
      await prisma.user.upsert({
        where: { username: a.tenant.username },
        create: {
          username: a.tenant.username,
          password: tenantPass,
          name: a.tenant.name,
          email: a.tenant.email,
          role: "TENANT",
          status: "ACTIVE",
          apartmentId: apt.id,
        },
        update: { apartmentId: apt.id, name: a.tenant.name, password: tenantPass },
      });
    }
  }

  console.log("→ Creating a sample billing cycle...");
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  const label = `${start.toLocaleString("he", { month: "long" })} ${start.getFullYear()}`;

  const masterPrevious = 45200;
  const masterCurrent = 48400;
  const totalConsumption = masterCurrent - masterPrevious; // 3200
  const totalBillAmount = Math.round(totalConsumption * RATE_SHEKELS * 100) / 100;

  const cycle = await prisma.billingCycle.upsert({
    where: { label },
    create: {
      label,
      utility: "ELECTRICITY",
      totalBillAmount,
      masterMeterPrevious: masterPrevious,
      masterMeterCurrent: masterCurrent,
      totalConsumption,
      ratePerKwh: RATE_SHEKELS,
      startDate: start,
      endDate: end,
      status: "OPEN",
    },
    update: {},
  });

  console.log("→ Creating sample submissions...");
  const seedSubmissions: Array<{
    apartmentName: string;
    reading: number;
    status: "PENDING" | "APPROVED";
    paymentStatus?: "PENDING" | "PAID";
  }> = [
    { apartmentName: "דירה 1א", reading: 12750, status: "APPROVED", paymentStatus: "PAID" },
    { apartmentName: "דירה 1ב", reading: 9180, status: "APPROVED", paymentStatus: "PENDING" },
    { apartmentName: "דירה 2א", reading: 16380, status: "PENDING" },
  ];

  for (const seed of seedSubmissions) {
    const apt = await prisma.apartment.findUnique({ where: { name: seed.apartmentName } });
    if (!apt) continue;
    const prev = apt.initialMeterReading;
    const consumption = Math.max(0, seed.reading - prev);
    const amountDue = Math.round(consumption * cycle.ratePerKwh * 100) / 100;

    const existing = await prisma.submission.findFirst({
      where: { apartmentId: apt.id, billingCycleId: cycle.id },
    });
    if (existing) continue;

    const submission = await prisma.submission.create({
      data: {
        apartmentId: apt.id,
        billingCycleId: cycle.id,
        previousReading: prev,
        confirmedReading: seed.reading,
        consumption,
        ratePerKwh: cycle.ratePerKwh,
        amountDue,
        status: seed.status,
        reviewedAt: seed.status === "APPROVED" ? new Date() : null,
      },
    });

    if (seed.status === "APPROVED") {
      await prisma.payment.create({
        data: {
          submissionId: submission.id,
          amount: amountDue,
          status: seed.paymentStatus ?? "PENDING",
          method: "bit",
          paidAt: seed.paymentStatus === "PAID" ? new Date() : null,
        },
      });
    }
  }

  console.log("\n✓ Seed complete.");
  console.log("  Admin: %s / %s", SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD);
  console.log("  Sample tenants:");
  console.log("    alice / tenant123  (דירה 1א — דיווח שולם)");
  console.log("    boaz  / tenant123  (דירה 1ב — ממתין לתשלום)");
  console.log("    chen  / tenant123  (דירה 2א — ממתין לאישור)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
