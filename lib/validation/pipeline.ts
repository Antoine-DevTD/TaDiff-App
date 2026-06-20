import { z } from "zod";

export const opportunitySchema = z.object({
  title: z.string().min(2, "Le titre est requis"),
  contactId: z.string().optional(),
  showId: z.string().optional(),
  stage: z.enum([
    "A qualifier",
    "Contacte",
    "Relance prevue",
    "Negociation",
    "Confirme",
    "Perdu",
  ]),
  value: z.coerce.number().min(0, "Le montant doit etre positif"),
  probability: z.coerce.number().min(0).max(100),
  nextAction: z.string().optional(),
  nextFollowUpAt: z.string().optional(),
});

export const reminderSchema = z.object({
  title: z.string().min(2, "Le titre est requis"),
  dueDate: z.string().min(1, "La date est requise"),
  relatedTo: z.string().optional(),
  priority: z.enum(["low", "normal", "high"]),
  opportunityId: z.string().optional(),
  contactId: z.string().optional(),
});

export type OpportunityFormInput = z.input<typeof opportunitySchema>;
export type OpportunityFormValues = z.infer<typeof opportunitySchema>;
export type ReminderFormInput = z.input<typeof reminderSchema>;
export type ReminderFormValues = z.infer<typeof reminderSchema>;
