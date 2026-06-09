import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { getBitConfig } from "@/lib/bit";
import { getElectricityRateAgorot } from "@/lib/electricity-rate";
import { SettingsForm } from "./SettingsForm";
import { ElectricityRateForm } from "./ElectricityRateForm";
import { he } from "@/lib/i18n/he";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [bitCfg, rateAgorot] = await Promise.all([
    getBitConfig(),
    getElectricityRateAgorot(),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={he.admin.settings.title}
        description={he.admin.settings.desc}
      />

      <Card>
        <CardHeader>
          <CardTitle>{he.admin.settings.electricity}</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="mb-4 text-sm text-slate-500">{he.admin.settings.electricityDesc}</p>
          <ElectricityRateForm initialRateAgorot={rateAgorot} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{he.bit.settingsTitle}</CardTitle>
        </CardHeader>
        <CardBody>
          <SettingsForm initial={bitCfg} />
        </CardBody>
      </Card>
    </div>
  );
}
