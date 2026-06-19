import { ContactForm } from "@/components/forms/contact-form";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewContactPage() {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Nouveau contact</CardTitle>
        <CardDescription>Validation locale Zod, persistance Supabase a brancher.</CardDescription>
      </CardHeader>
      <ContactForm />
    </Card>
  );
}
