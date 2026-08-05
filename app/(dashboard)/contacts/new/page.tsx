import { ContactForm } from "@/components/forms/contact-form";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getContactCustomization } from "@/lib/supabase/queries";

export default async function NewContactPage() {
  const { definitions } = await getContactCustomization();
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Nouveau contact</CardTitle>
        <CardDescription>Ajoutez une personne, un lieu, un partenaire ou un autre contact utile.</CardDescription>
      </CardHeader>
      <ContactForm customFieldDefinitions={definitions} />
    </Card>
  );
}
