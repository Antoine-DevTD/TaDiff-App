import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(2, "Le nom est requis"),
  organization: z.string().min(2, "La structure est requise"),
  role: z.string().optional(),
  email: z
    .string()
    .email("Email invalide")
    .optional()
    .or(z.literal("")),
  phone: z.string().max(40, "Telephone trop long").optional().or(z.literal("")),
  city: z.string().optional(),
  status: z.enum(["Prospect", "En discussion", "Partenaire"]),
  tags: z.array(z.string().min(1)).optional(),
});

export type ContactFormValues = z.infer<typeof contactSchema>;
