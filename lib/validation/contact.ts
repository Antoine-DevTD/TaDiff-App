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
  address: z.string().max(300).optional().or(z.literal("")),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  department: z.string().max(120).optional().or(z.literal("")),
  region: z.string().max(120).optional().or(z.literal("")),
  website: z.string().url("Site web invalide").optional().or(z.literal("")),
  capacity: z.string().regex(/^\d*$/, "Jauge invalide").optional().or(z.literal("")),
  latitude: z.string().refine((value) => !value || (Number(value.replace(",", ".")) >= -90 && Number(value.replace(",", ".")) <= 90), "Latitude invalide").optional().or(z.literal("")),
  longitude: z.string().refine((value) => !value || (Number(value.replace(",", ".")) >= -180 && Number(value.replace(",", ".")) <= 180), "Longitude invalide").optional().or(z.literal("")),
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
