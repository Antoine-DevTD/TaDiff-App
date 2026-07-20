import { z } from "zod";

export const showEmailProfileSchema = z.object({
  logline: z.string().max(280, "La logline est trop longue").optional(),
  themes: z.array(z.string().min(1).max(60)).max(8, "Ajoutez au maximum 8 thematiques"),
  targetAudience: z.string().max(400, "Le public est trop long").optional(),
  emailPitch: z.string().max(1200, "La presentation est trop longue").optional(),
});

export type ShowEmailProfileInput = z.infer<typeof showEmailProfileSchema>;
