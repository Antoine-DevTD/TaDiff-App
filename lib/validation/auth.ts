import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "8 caracteres minimum"),
});

export const signupSchema = loginSchema.extend({
  companyName: z.string().min(2, "Nom de structure requis"),
  profile: z.enum(["company", "producer", "artist"]),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignupFormValues = z.infer<typeof signupSchema>;
