import { z } from "zod";

export const calendarEventSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(160),
  eventDate: z.string().min(1, "La date est requise"),
  kind: z.enum(["event", "deadline", "show"]),
  relatedShowId: z.string().max(80).optional().or(z.literal("")),
  note: z.string().max(600).optional().or(z.literal("")),
  allDay: z.boolean().default(true),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  location: z.string().max(180).optional().or(z.literal("")),
}).superRefine((event, context) => {
  if (!event.allDay && !event.startTime) {
    context.addIssue({
      code: "custom",
      message: "Indiquez une heure de debut.",
      path: ["startTime"],
    });
  }
});

export type CalendarEventInput = z.input<typeof calendarEventSchema>;
export type CalendarEventValues = z.infer<typeof calendarEventSchema>;
