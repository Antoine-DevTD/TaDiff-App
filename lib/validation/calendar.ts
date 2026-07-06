import { z } from "zod";

export const calendarEventSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(160),
  eventDate: z.string().min(1, "La date est requise"),
  kind: z.enum(["event", "deadline", "show"]),
  relatedShowId: z.string().uuid().optional().or(z.literal("")),
  note: z.string().max(600).optional().or(z.literal("")),
});

export type CalendarEventInput = z.input<typeof calendarEventSchema>;
export type CalendarEventValues = z.infer<typeof calendarEventSchema>;
