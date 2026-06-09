import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { NewApartmentForm } from "./NewApartmentForm";
import { he } from "@/lib/i18n/he";

export default function NewApartmentPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader
        title={he.admin.apartments.new}
        description={he.admin.apartments.newDesc}
      />
      <Card>
        <CardBody>
          <NewApartmentForm />
        </CardBody>
      </Card>
    </div>
  );
}
