import { z } from "zod";
import { dailyFeedbackAreas } from "@/lib/daily-feedback";

const areaValues = dailyFeedbackAreas.map((area) => area.value) as [
  (typeof dailyFeedbackAreas)[number]["value"],
  ...(typeof dailyFeedbackAreas)[number]["value"][],
];

export const dailyFeedbackSchema = z
  .object({
    usageDate: z.iso.date(),
    problemAreas: z.array(z.enum(areaValues)).max(dailyFeedbackAreas.length),
    noProblem: z.boolean(),
    note: z.string().max(2000, "La note est trop longue.").optional(),
    suggestion: z.string().max(2000, "La suggestion est trop longue.").optional(),
    page: z.string().max(120).optional(),
  })
  .refine((value) => (value.noProblem ? value.problemAreas.length === 0 : value.problemAreas.length > 0), {
    message: "Sélectionnez une zone ou Aucun problème.",
    path: ["problemAreas"],
  });

export type DailyFeedbackInput = z.infer<typeof dailyFeedbackSchema>;
