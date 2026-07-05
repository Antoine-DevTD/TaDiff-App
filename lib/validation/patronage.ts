import { z } from "zod";

export const patronageStatuses = ["Prospect", "Argumentaire", "Negociation", "Signe"] as const;

export const patronageSchema = z.object({
  companyName: z.string().min(2, "Le nom de l'entreprise est requis"),
  contactName: z.string().max(120).optional(),
  amount: z.coerce.number().min(0, "Le montant doit etre positif"),
  status: z.enum(patronageStatuses),
  nextAction: z.string().max(300).optional(),
  nextFollowUpAt: z.string().optional(),
});

export type PatronageFormInput = z.input<typeof patronageSchema>;
export type PatronageFormValues = z.infer<typeof patronageSchema>;
