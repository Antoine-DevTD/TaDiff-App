import { z } from "zod";

export const contactSchema = z.object({
  contactType: z.enum(["person", "venue"]),
  venueId: z.string().uuid().optional().or(z.literal("")),
  name: z.string().min(2, "Le nom est requis"),
  organization: z.string(),
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
  directorName: z.string().max(200).optional().or(z.literal("")),
  directorEmail: z.string().email("Email du directeur invalide").optional().or(z.literal("")),
  directorPhone: z.string().max(40, "Telephone trop long").optional().or(z.literal("")),
}).superRefine((value, context) => {
  if (value.contactType === "person" && value.organization.trim().length < 2) {
    context.addIssue({ code: "custom", message: "La structure est requise", path: ["organization"] });
  }
});

export type ContactFormValues = z.infer<typeof contactSchema>;
