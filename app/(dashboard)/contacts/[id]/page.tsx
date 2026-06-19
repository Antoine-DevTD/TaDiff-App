import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ContactDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const { id } = await params;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fiche contact</CardTitle>
        <CardDescription>Route dynamique preparee pour `{id}`.</CardDescription>
      </CardHeader>
    </Card>
  );
}
