// Generation d'un fichier iCalendar (.ics) a partir des echeances TaDiff.
// Evenements sur la journee entiere (VALUE=DATE). A importer dans Google
// Agenda, Apple Calendrier, Outlook, etc.

export type IcsEvent = {
  uid: string;
  date: string; // ISO (YYYY-MM-DD ou date complete)
  summary: string;
  description?: string;
};

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function toDateStamp(date: Date) {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function toDateValue(input: string) {
  const date = new Date(input);
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

function escapeText(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function buildIcsCalendar(events: IcsEvent[], calendarName = "TaDiff") {
  const stamp = toDateStamp(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TaDiff//Calendrier//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];

  for (const event of events) {
    const start = toDateValue(event.date);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `SUMMARY:${escapeText(event.summary)}`,
    );
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  // iCalendar exige des fins de ligne CRLF.
  return lines.join("\r\n");
}
