import "server-only";

import net from "node:net";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";

type ReminderLine = { name: string; quantity: number; unit: string; venue: string; notes: string };
type ReminderGroup = { companyId: string; showId: string; showTitle: string; date: string; contactId: string; contactName: string; email: string; lines: ReminderLine[] };

function parisDateAfter(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function encodeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(value).toString("base64")}?=`;
}

async function smtpCommand(socket: net.Socket, command: string, expected: number[]) {
  await new Promise<void>((resolve, reject) => {
    const onData = (chunk: Buffer) => {
      const response = chunk.toString("utf8");
      const finalLine = response.split(/\r?\n/).findLast((line) => /^\d{3} /.test(line));
      if (!finalLine) return;
      const code = Number(finalLine.slice(0, 3));
      cleanup();
      if (expected.includes(code)) resolve();
      else reject(new Error(`SMTP ${code}: ${response.trim()}`));
    };
    const onError = (error: Error) => { cleanup(); reject(error); };
    const cleanup = () => { socket.off("data", onData); socket.off("error", onError); };
    socket.on("data", onData);
    socket.on("error", onError);
    if (command) socket.write(`${command}\r\n`);
  });
}

async function sendViaLocalSmtp(to: string, subject: string, text: string) {
  const host = process.env.LOCAL_SMTP_HOST?.trim() || "127.0.0.1";
  const port = Number(process.env.LOCAL_SMTP_PORT || 54325);
  const from = process.env.MATERIAL_REMINDER_FROM?.trim() || "rappels@tadiff.local";
  const socket = net.createConnection({ host, port });
  try {
    await smtpCommand(socket, "", [220]);
    await smtpCommand(socket, "EHLO tadiff.local", [250]);
    await smtpCommand(socket, `MAIL FROM:<${from}>`, [250]);
    await smtpCommand(socket, `RCPT TO:<${to}>`, [250, 251]);
    await smtpCommand(socket, "DATA", [354]);
    const safeBody = text.replace(/\r?\n\./g, "\r\n..").replace(/\r?\n/g, "\r\n");
    socket.write(`From: TaDiff <${from}>\r\nTo: <${to}>\r\nSubject: ${encodeHeader(subject)}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${safeBody}\r\n.\r\n`);
    await smtpCommand(socket, "", [250]);
    await smtpCommand(socket, "QUIT", [221]);
    return `mailpit-${Date.now()}`;
  } finally {
    socket.destroy();
  }
}

async function sendReminderEmail(group: ReminderGroup) {
  const formattedDate = new Date(`${group.date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const list = group.lines.map((line) => `- ${line.name} : ${line.quantity} ${line.unit}${line.venue ? ` · ${line.venue}` : ""}${line.notes ? ` · ${line.notes}` : ""}`).join("\n");
  const text = `Bonjour ${group.contactName},\n\nVoici ce que tu dois apporter pour « ${group.showTitle} » le ${formattedDate} :\n\n${list}\n\nPense à vérifier que tout est prêt avant le départ.\n\nL’équipe TaDiff`;
  const subject = `${group.showTitle} · matériel à prévoir pour le ${new Date(`${group.date}T12:00:00`).toLocaleDateString("fr-FR")}`;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const localSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("127.0.0.1") || process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("localhost");
  if (localSupabase || !apiKey) return sendViaLocalSmtp(group.email, subject, text);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.MATERIAL_REMINDER_FROM?.trim() || "TaDiff <support@tadiff.com>", to: [group.email], subject, text }),
  });
  if (!response.ok) throw new Error(`Resend ${response.status}: ${await response.text()}`);
  const data = await response.json() as { id?: string };
  return data.id ?? null;
}

export async function runMaterialReminders(options: { targetDate?: string; showId?: string } = {}) {
  const targetDate = options.targetDate ?? parisDateAfter(7);
  const supabase = getSupabaseAdminClient();
  let query = supabase.from("show_material_requirements").select("id,company_id,show_id,material_item_id,performance_date,venue,quantity_needed,responsible_contact_id,notes").eq("performance_date", targetDate).not("responsible_contact_id", "is", null);
  if (options.showId) query = query.eq("show_id", options.showId);
  const { data: requirements, error } = await query;
  if (error) throw new Error(error.message);
  if (!requirements?.length) return { targetDate, sent: 0, skipped: 0, missingEmails: 0 };

  const itemIds = [...new Set(requirements.map((row) => row.material_item_id))];
  const contactIds = [...new Set(requirements.flatMap((row) => row.responsible_contact_id ? [row.responsible_contact_id] : []))];
  const showIds = [...new Set(requirements.map((row) => row.show_id))];
  const [itemsResult, contactsResult, showsResult, deliveriesResult] = await Promise.all([
    supabase.from("show_material_items").select("id,name,unit").in("id", itemIds),
    supabase.from("contacts").select("id,name,email").in("id", contactIds),
    supabase.from("shows").select("id,title").in("id", showIds),
    supabase.from("material_reminder_deliveries").select("show_id,performance_date,responsible_contact_id").eq("performance_date", targetDate).in("show_id", showIds),
  ]);
  const readError = itemsResult.error ?? contactsResult.error ?? showsResult.error ?? deliveriesResult.error;
  if (readError) throw new Error(readError.message);
  const items = new Map((itemsResult.data ?? []).map((row) => [row.id, row]));
  const contacts = new Map((contactsResult.data ?? []).map((row) => [row.id, row]));
  const shows = new Map((showsResult.data ?? []).map((row) => [row.id, row]));
  const delivered = new Set((deliveriesResult.data ?? []).map((row) => `${row.show_id}:${row.performance_date}:${row.responsible_contact_id}`));
  const groups = new Map<string, ReminderGroup>();
  let missingEmails = 0;

  for (const row of requirements) {
    if (!row.responsible_contact_id) continue;
    const contact = contacts.get(row.responsible_contact_id);
    const item = items.get(row.material_item_id);
    const show = shows.get(row.show_id);
    if (!contact?.email || !item || !show) { missingEmails += 1; continue; }
    const key = `${row.show_id}:${row.performance_date}:${row.responsible_contact_id}`;
    const group = groups.get(key) ?? { companyId: row.company_id, showId: row.show_id, showTitle: show.title, date: row.performance_date, contactId: contact.id, contactName: contact.name, email: contact.email, lines: [] };
    group.lines.push({ name: item.name, quantity: Number(row.quantity_needed), unit: item.unit, venue: row.venue ?? "", notes: row.notes ?? "" });
    groups.set(key, group);
  }

  let sent = 0;
  let skipped = 0;
  for (const [key, group] of groups) {
    if (delivered.has(key)) { skipped += 1; continue; }
    const providerMessageId = await sendReminderEmail(group);
    const { error: insertError } = await supabase.from("material_reminder_deliveries").insert({ company_id: group.companyId, show_id: group.showId, performance_date: group.date, responsible_contact_id: group.contactId, recipient_email: group.email, provider_message_id: providerMessageId });
    if (insertError) throw new Error(insertError.message);
    sent += 1;
  }
  return { targetDate, sent, skipped, missingEmails };
}
