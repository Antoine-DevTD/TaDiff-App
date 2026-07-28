import { z } from "zod";

export const betaDisciplines = [
  "Theatre",
  "Jeune public",
  "Pluridisciplinaire",
] as const;

export const betaSignupSchema = z.object({
  companyName: z.string().min(2, "Le nom de compagnie est requis"),
  contactName: z.string().min(2, "Le nom du contact est requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().max(40, "Téléphone trop long").optional(),
  city: z.string().max(120, "Ville trop longue").optional(),
  discipline: z.enum(betaDisciplines, { error: "Choisissez une discipline proposée" }),
  mainNeed: z.string().trim().max(800, "Le besoin est trop long").default(""),
});

export type BetaSignupFormInput = z.input<typeof betaSignupSchema>;
export type BetaSignupFormValues = z.infer<typeof betaSignupSchema>;
