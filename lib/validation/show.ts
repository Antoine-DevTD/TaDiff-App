import { z } from "zod";

export const showSchema = z.object({
  title: z.string().min(2, "Le titre est requis"),
  discipline: z.string().min(2, "La discipline est requise"),
  status: z.enum(["En diffusion", "Creation", "En pause"]),
  nextDate: z.string().optional(),
  budget: z.coerce.number().min(0, "Le budget doit etre positif").optional(),
  detailedBudgetEnabled: z.coerce.boolean().default(false),
  posterUrl: z.string().url("Lien d'affiche invalide").optional().or(z.literal("")),
  captureUrl: z.string().url("Lien de captation invalide").refine(
    (value) => !value || /(?:youtube\.com|youtu\.be|vimeo\.com)/i.test(value),
    "Utilisez un lien YouTube ou Vimeo",
  ).optional().or(z.literal("")),
  notes: z.string().max(1200, "La note est trop longue").optional(),
});

export type ShowFormInput = z.input<typeof showSchema>;
export type ShowFormValues = z.infer<typeof showSchema>;
