const calendarContent = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//TaDiff//Beta Launch//FR",
  "CALSCALE:GREGORIAN",
  "METHOD:PUBLISH",
  "BEGIN:VEVENT",
  "UID:beta-launch-20260806@tadiff.com",
  "DTSTAMP:20260728T120000Z",
  "DTSTART:20260806T080000Z",
  "DTEND:20260806T090000Z",
  "SUMMARY:Ouverture de la bêta TaDiff",
  "DESCRIPTION:Ouverture de votre cockpit TaDiff et début de la bêta accompagnée.",
  "URL:https://tadiff.com",
  "STATUS:CONFIRMED",
  "END:VEVENT",
  "END:VCALENDAR",
  "",
].join("\r\n");

export function GET() {
  return new Response(calendarContent, {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Content-Disposition": 'attachment; filename="ouverture-beta-tadiff.ics"',
      "Content-Type": "text/calendar; charset=utf-8",
    },
  });
}
