export const dailyFeedbackAreas = [
  { value: "agenda_actions", label: "Agenda et actions" },
  { value: "shows", label: "Spectacles" },
  { value: "contacts_venues", label: "Contacts et lieux" },
  { value: "diffusion_exploitation", label: "Diffusion et exploitation" },
  { value: "treasury", label: "Trésorerie" },
  { value: "documents_funding", label: "Documents et subventions" },
  { value: "emails", label: "Emails" },
  { value: "william", label: "William" },
  { value: "navigation", label: "Navigation" },
] as const;

export type DailyFeedbackArea = (typeof dailyFeedbackAreas)[number]["value"];

export type DailyFeedbackPrompt = {
  usageDate: string;
  lastUsedAt: string;
};

export const dailyFeedbackCooldownDays = 3;

export function isWithinDailyFeedbackCooldown(dismissedOn: string, todayKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dismissedOn) || !/^\d{4}-\d{2}-\d{2}$/.test(todayKey)) {
    return false;
  }

  const dismissedDate = new Date(`${dismissedOn}T12:00:00`);
  const today = new Date(`${todayKey}T12:00:00`);
  const elapsedDays = Math.round((today.getTime() - dismissedDate.getTime()) / 86_400_000);

  return elapsedDays >= 0 && elapsedDays < dailyFeedbackCooldownDays;
}

export function getUsageDateLabel(usageDate: string, today = new Date()) {
  const [year, month, day] = usageDate.split("-").map(Number);
  const usage = new Date(year, month - 1, day, 12);
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  const differenceInDays = Math.round((localToday.getTime() - usage.getTime()) / 86_400_000);

  if (differenceInDays === 1) return "hier";

  return `le ${new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
  }).format(usage)}`;
}
