import { z } from "zod";

export const billingStatuses = ["trial", "active", "comped", "past_due", "cancelled"] as const;

export const adminBillingSchema = z.object({
  billingStatus: z.enum(billingStatuses),
  planCode: z.string().max(60).optional(),
  compedUntil: z.string().optional(),
  billingNotes: z.string().max(500, "La note est trop longue").optional(),
});

export type AdminBillingFormInput = z.input<typeof adminBillingSchema>;
export type AdminBillingFormValues = z.infer<typeof adminBillingSchema>;
