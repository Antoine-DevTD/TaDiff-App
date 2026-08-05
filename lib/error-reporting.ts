import { createHash } from "node:crypto";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin-client";

type ErrorReport = { message: string; code?: string; route?: string; source?: string; companyId?: string | null; reporterEmail?: string | null };

function clean(value: string, limit: number) {
  return value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);
}

export async function reportApplicationError(report: ErrorReport) {
  if (!hasSupabaseAdminEnv()) return;
  const message = clean(report.message || "Erreur sans message", 1000);
  const route = clean(report.route || "", 240);
  const code = clean(report.code || "", 100);
  const source = clean(report.source || "application", 80);
  const fingerprint = createHash("sha256").update(`${source}|${route}|${code}|${message.replace(/[0-9a-f-]{16,}/gi, "#")}`).digest("hex");
  const admin = getSupabaseAdminClient();
  const { data: existing } = await admin.from("application_error_groups").select("id,occurrence_count,company_ids,reporter_emails").eq("fingerprint", fingerprint).maybeSingle();
  const companyIds = Array.from(new Set([...(existing?.company_ids ?? []), ...(report.companyId ? [report.companyId] : [])]));
  const reporterEmails = Array.from(new Set([...(existing?.reporter_emails ?? []), ...(report.reporterEmail ? [clean(report.reporterEmail, 320)] : [])]));
  const now = new Date().toISOString();
  if (existing) await admin.from("application_error_groups").update({ occurrence_count: existing.occurrence_count + 1, company_ids: companyIds, reporter_emails: reporterEmails, last_seen_at: now, resolved_at: null, resolved_by: null, updated_at: now }).eq("id", existing.id);
  else await admin.from("application_error_groups").insert({ fingerprint, message, error_code: code, route, source, company_ids: companyIds, reporter_emails: reporterEmails });

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (apiKey) await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.ERROR_NOTIFICATION_FROM?.trim() || "TaDiff Support <support@tadiff.com>", to: [process.env.ERROR_NOTIFICATION_EMAIL?.trim() || "titouan.laporte98@gmail.com"], subject: `[TaDiff] Erreur ${existing ? `répétée ×${existing.occurrence_count + 1}` : "détectée"}`, text: `${message}\n\nSource : ${source}\nPage : ${route || "inconnue"}\nCode : ${code || "aucun"}` }) }).catch(() => undefined);
}
