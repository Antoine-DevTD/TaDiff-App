import { z } from "zod";

export const quoteStatuses = [
  "A preparer",
  "Envoye",
  "Acompte attendu",
  "Solde attendu",
  "Archive",
] as const;

export const quoteSchema = z.object({
  title: z.string().min(2, "L'objet du devis est requis"),
  organization: z.string().min(2, "La structure est requise"),
  status: z.enum(quoteStatuses),
  amount: z.coerce.number().min(0, "Le montant doit etre positif"),
  depositDue: z.coerce.number().min(0, "L'acompte doit etre positif"),
  balanceDue: z.coerce.number().min(0, "Le solde doit etre positif"),
  dueDate: z.string().optional(),
});

export type QuoteFormInput = z.input<typeof quoteSchema>;
export type QuoteFormValues = z.infer<typeof quoteSchema>;
