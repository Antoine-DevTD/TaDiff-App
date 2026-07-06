import { z } from "zod";

export const companyProfileSchema = z.object({
  name: z.string().min(2, "Le nom de la compagnie est requis"),
  city: z.string().max(120).optional().or(z.literal("")),
  discipline: z.string().max(120).optional().or(z.literal("")),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  website: z.string().url("Lien invalide").optional().or(z.literal("")),
  siret: z.string().max(40).optional().or(z.literal("")),
  licenseNumber: z.string().max(80).optional().or(z.literal("")),
  logoUrl: z.string().url("Lien invalide").optional().or(z.literal("")),
  description: z.string().max(1200, "La description est trop longue").optional().or(z.literal("")),
});

export type CompanyProfileInput = z.input<typeof companyProfileSchema>;
export type CompanyProfileValues = z.infer<typeof companyProfileSchema>;
