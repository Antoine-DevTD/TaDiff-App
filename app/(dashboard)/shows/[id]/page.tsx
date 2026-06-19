import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ShowDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ShowDetailPage({ params }: ShowDetailPageProps) {
  const { id } = await params;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fiche spectacle</CardTitle>
        <CardDescription>Route dynamique preparee pour `{id}`.</CardDescription>
      </CardHeader>
    </Card>
  );
}
