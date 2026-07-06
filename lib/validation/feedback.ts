import { z } from "zod";

export const feedbackKinds = ["bug", "idee", "avis"] as const;
export const feedbackStatuses = ["nouveau", "en_cours", "traite"] as const;

export const feedbackSchema = z.object({
  kind: z.enum(feedbackKinds),
  message: z.string().min(3, "Dites-nous en un peu plus").max(2000, "Message trop long"),
  page: z.string().max(120).optional(),
});

export type FeedbackFormInput = z.input<typeof feedbackSchema>;
export type FeedbackFormValues = z.infer<typeof feedbackSchema>;

export const feedbackStatusSchema = z.object({
  status: z.enum(feedbackStatuses),
  response: z.string().max(2000).optional(),
});

export type FeedbackStatusFormInput = z.input<typeof feedbackStatusSchema>;
