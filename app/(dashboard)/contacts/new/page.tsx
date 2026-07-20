import { ContactForm } from "@/components/forms/contact-form";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewContactPage() {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Nouveau contact</CardTitle>
        <CardDescription>Ajoutez une personne, un lieu, un partenaire ou un autre contact utile.</CardDescription>
      </CardHeader>
      <ContactForm />
    </Card>
  );
}
