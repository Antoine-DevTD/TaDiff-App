import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShowForm } from "@/components/forms/show-form";

export default function NewShowPage() {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Nouveau spectacle</CardTitle>
        <CardDescription>Ajoutez une creation au catalogue de diffusion.</CardDescription>
      </CardHeader>
      <ShowForm />
    </Card>
  );
}
