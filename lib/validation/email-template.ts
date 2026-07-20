import { z } from "zod";

const richTextNodeSchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    type: z.string().max(40),
    attrs: z.record(z.string(), z.unknown()).optional(),
    marks: z.array(z.object({
      type: z.string().max(40),
      attrs: z.record(z.string(), z.unknown()).optional(),
    })).optional(),
    text: z.string().max(20_000).optional(),
    content: z.array(richTextNodeSchema).optional(),
  }),
);

export const emailTemplateSchema = z.object({
  name: z.string().trim().min(2, "Donnez un nom au modele.").max(80),
  messageType: z.enum(["first-touch", "follow-up", "date-option"]),
  subjectTemplate: z.string().trim().min(2, "L'objet est requis.").max(180),
  bodyJson: richTextNodeSchema,
});

export type EmailTemplateInput = z.infer<typeof emailTemplateSchema>;
