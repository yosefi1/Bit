import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { NewCycleForm } from "./NewCycleForm";
import { he } from "@/lib/i18n/he";

export default function NewCyclePage() {
  return (
    <div className="max-w-2xl">
      <PageHeader
        title={he.admin.cycles.new}
        description={he.admin.cycles.newDesc}
      />
      <Card>
        <CardBody>
          <NewCycleForm />
        </CardBody>
      </Card>
    </div>
  );
}
