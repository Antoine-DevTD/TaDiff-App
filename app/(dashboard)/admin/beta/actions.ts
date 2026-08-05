"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { renderBetaEmailTemplate } from "@/lib/beta-access";
import { isSuperAdmin } from "@/lib/supabase/admin";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin-client";
import { getSupabaseServerClient, getSupabaseServerUser } from "@/lib/supabase/server";

const idsSchema = z.array(z.string().uuid()).min(1).max(30);
const emailSchema = z.object({
  signupIds: idsSchema,
  subject: z.string().trim().min(3).max(180),
  body: z.string().trim().min(20).max(12_000),
});
const paymentSchema = z.object({ signupId: z.string().uuid(), reference: z.string().trim().min(3).max(240) });
const inviteSchema = z.object({ signupIds: idsSchema });
const resendInviteSchema = z.object({ signupId: z.string().uuid() });

type Result = { ok: boolean; message: string; succeeded?: number; failed?: number };

async function requireSuperAdmin() {
  if (!(await isSuperAdmin()) || !hasSupabaseAdminEnv()) return null;
  const { data: { user } } = await getSupabaseServerUser();
  if (!user) return null;
  return { admin: getSupabaseAdminClient(), actorId: user.id };
}

export async function sendBetaPaymentEmails(input: z.input<typeof emailSchema>): Promise<Result> {
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Selection ou contenu du mail invalide." };
  const access = await requireSuperAdmin();
  if (!access) return { ok: false, message: "Action reservee au super-admin." };
  const { admin, actorId: actor } = access;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const paymentUrl = process.env.BETA_PAYMENT_LINK_URL?.trim();
  const from = process.env.BETA_SIGNUP_NOTIFICATION_FROM?.trim() || "TaDiff <support@tadiff.com>";
  if (!apiKey || !paymentUrl) return { ok: false, message: "RESEND_API_KEY ou BETA_PAYMENT_LINK_URL manque sur le serveur." };
  try {
    const url = new URL(paymentUrl);
    if (url.protocol !== "https:") throw new Error();
  } catch {
    return { ok: false, message: "BETA_PAYMENT_LINK_URL doit etre une URL HTTPS valide." };
  }

  const { data: signups, error } = await admin.from("beta_signups").select("id,company_name,contact_name,email,status,is_demo").in("id", parsed.data.signupIds);
  if (error || !signups) return { ok: false, message: "Impossible de charger les inscriptions selectionnees." };
  let succeeded = 0;
  let failed = 0;

  for (const signup of signups) {
    if (signup.is_demo || signup.status !== "reserved") { failed += 1; continue; }
    const context = { firstName: signup.contact_name.trim().split(/\s+/)[0] || signup.contact_name, companyName: signup.company_name, email: signup.email, paymentUrl };
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [signup.email], subject: renderBetaEmailTemplate(parsed.data.subject, context), text: renderBetaEmailTemplate(parsed.data.body, context) }),
    }).catch(() => null);
    const now = new Date().toISOString();
    if (response?.ok) {
      succeeded += 1;
      await admin.from("beta_signups").update({ payment_email_sent_at: now, payment_email_sent_by: actor, last_access_error: null }).eq("id", signup.id);
      await admin.from("beta_access_events").insert({ beta_signup_id: signup.id, actor_id: actor, event_type: "payment_email_sent" });
    } else {
      failed += 1;
      const detail = response ? `Resend HTTP ${response.status}` : "Resend indisponible";
      await admin.from("beta_signups").update({ last_access_error: detail }).eq("id", signup.id);
      await admin.from("beta_access_events").insert({ beta_signup_id: signup.id, actor_id: actor, event_type: "payment_email_failed", detail });
    }
  }
  revalidatePath("/admin/beta");
  return { ok: failed === 0, message: `${succeeded} mail(s) envoye(s), ${failed} echec(s).`, succeeded, failed };
}

export async function markBetaPaymentEmailsSent(input: z.input<typeof inviteSchema>): Promise<Result> {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Selection invalide." };
  const access = await requireSuperAdmin();
  if (!access) return { ok: false, message: "Action reservee au super-admin." };
  const { admin, actorId: actor } = access;
  const { data: signups, error } = await admin
    .from("beta_signups")
    .select("id,status,is_demo")
    .in("id", parsed.data.signupIds);
  if (error || !signups) return { ok: false, message: "Impossible de charger les inscriptions." };

  const eligibleIds = signups
    .filter((signup) => !signup.is_demo && signup.status === "reserved")
    .map((signup) => signup.id);
  if (eligibleIds.length === 0) return { ok: false, message: "Aucune inscription eligible dans la selection." };

  const now = new Date().toISOString();
  const { error: updateError } = await admin
    .from("beta_signups")
    .update({ payment_email_sent_at: now, payment_email_sent_by: actor, last_access_error: null })
    .in("id", eligibleIds);
  if (updateError) return { ok: false, message: "Impossible d'enregistrer l'envoi manuel des mails." };

  await admin.from("beta_access_events").insert(
    eligibleIds.map((signupId) => ({
      beta_signup_id: signupId,
      actor_id: actor,
      event_type: "payment_email_sent" as const,
      detail: "Mail de paiement envoye manuellement hors de TaDiff",
    })),
  );
  revalidatePath("/admin/beta");
  return {
    ok: true,
    message: `${eligibleIds.length} mail(s) marque(s) comme envoye(s) manuellement.`,
    succeeded: eligibleIds.length,
    failed: parsed.data.signupIds.length - eligibleIds.length,
  };
}

export async function confirmBetaPayment(input: z.input<typeof paymentSchema>): Promise<Result> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Une reference Stripe ou une note est obligatoire." };
  const access = await requireSuperAdmin();
  if (!access) return { ok: false, message: "Action reservee au super-admin." };
  const { admin, actorId: actor } = access;
  const now = new Date().toISOString();
  const { data, error } = await admin.from("beta_signups").update({ payment_confirmed_at: now, payment_confirmed_by: actor, payment_reference: parsed.data.reference, last_access_error: null }).eq("id", parsed.data.signupId).eq("is_demo", false).eq("status", "reserved").select("id").maybeSingle();
  if (error || !data) return { ok: false, message: "Inscription introuvable ou non eligible." };
  await admin.from("beta_access_events").insert({ beta_signup_id: data.id, actor_id: actor, event_type: "payment_confirmed", detail: parsed.data.reference });
  revalidatePath("/admin/beta");
  return { ok: true, message: "Paiement marque comme verifie." };
}

export async function inviteBetaSignups(input: z.input<typeof inviteSchema>): Promise<Result> {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Selection invalide." };
  const access = await requireSuperAdmin();
  if (!access) return { ok: false, message: "Action reservee au super-admin." };
  const { admin, actorId: actor } = access;
  const { data: signups, error } = await admin.from("beta_signups").select("id,email,contact_name,company_name,main_need,discipline,payment_confirmed_at,invitation_sent_at,is_demo").in("id", parsed.data.signupIds);
  if (error || !signups) return { ok: false, message: "Impossible de charger les inscriptions." };
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://tadiff.com").replace(/\/$/, "");
  let succeeded = 0;
  let failed = 0;
  for (const signup of signups) {
    if (signup.is_demo || !signup.payment_confirmed_at || signup.invitation_sent_at) { failed += 1; continue; }
    const claimTime = new Date().toISOString();
    const { data: claimed } = await admin.from("beta_signups")
      .update({ invitation_sent_at: claimTime, invitation_sent_by: actor })
      .eq("id", signup.id)
      .is("invitation_sent_at", null)
      .select("id")
      .maybeSingle();
    if (!claimed) { failed += 1; continue; }
    const { data, error: inviteError } = await admin.auth.admin.inviteUserByEmail(signup.email, {
      data: {
        company_name: signup.company_name,
        discipline: signup.discipline,
        full_name: signup.contact_name,
        main_need: signup.main_need,
      },
      redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent("/reset-password?next=/welcome")}`,
    });
    if (!inviteError && data.user) {
      succeeded += 1;
      await admin.from("beta_signups").update({ invited_user_id: data.user.id, last_access_error: null }).eq("id", signup.id);
      await admin.from("beta_access_events").insert({ beta_signup_id: signup.id, actor_id: actor, event_type: "invitation_sent" });
    } else {
      failed += 1;
      const detail = inviteError?.message.slice(0, 240) || "Invitation Supabase impossible";
      await admin.from("beta_signups").update({ invitation_sent_at: null, invitation_sent_by: null, last_access_error: detail }).eq("id", signup.id);
      await admin.from("beta_access_events").insert({ beta_signup_id: signup.id, actor_id: actor, event_type: "invitation_failed", detail });
    }
  }
  revalidatePath("/admin/beta");
  return { ok: failed === 0, message: `${succeeded} invitation(s) envoyee(s), ${failed} ignoree(s) ou en echec.`, succeeded, failed };
}

export async function creditBetaWilliam(input: z.input<typeof inviteSchema>): Promise<Result> {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Sélection invalide." };
  if (!(await requireSuperAdmin())) return { ok: false, message: "Action réservée au super-admin." };
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_credit_beta_william", { p_signup_ids: parsed.data.signupIds });
  if (error) return { ok: false, message: error.message.includes("schema cache") ? "Appliquez la migration SQL 065 avant de créditer William." : error.message };
  const result = data?.[0];
  revalidatePath("/admin/beta");
  revalidatePath("/admin");
  return {
    ok: (result?.credited_count ?? 0) > 0,
    message: `${result?.credited_count ?? 0} compte(s) crédité(s) de 200 000 tokens, ${result?.skipped_count ?? 0} ignoré(s).`,
  };
}

export async function resendBetaInvitation(input: z.input<typeof resendInviteSchema>): Promise<Result> {
  const parsed = resendInviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Inscription invalide." };
  const access = await requireSuperAdmin();
  if (!access) return { ok: false, message: "Action reservee au super-admin." };
  const { admin, actorId: actor } = access;
  const { data: signup, error } = await admin
    .from("beta_signups")
    .select("id,email,contact_name,company_name,main_need,discipline,payment_confirmed_at,invitation_sent_at,invited_user_id,account_created_at,is_demo,status")
    .eq("id", parsed.data.signupId)
    .maybeSingle();

  if (error || !signup || signup.is_demo || signup.status !== "reserved") {
    return { ok: false, message: "Inscription introuvable ou non eligible." };
  }
  if (!signup.payment_confirmed_at) {
    return { ok: false, message: "Verifiez d'abord le paiement avant de renvoyer l'invitation." };
  }
  if (!signup.invitation_sent_at || !signup.invited_user_id) {
    return { ok: false, message: "Envoyez d'abord une premiere invitation." };
  }
  if (signup.account_created_at) {
    return { ok: false, message: "Le compte est deja cree. Utilisez plutot le mot de passe oublie." };
  }

  const { data: invitedUser } = await admin.auth.admin.getUserById(signup.invited_user_id);
  if (invitedUser.user?.email_confirmed_at) {
    return { ok: false, message: "L'adresse est deja confirmee. Utilisez plutot le mot de passe oublie." };
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://tadiff.com").replace(/\/$/, "");
  const { data, error: inviteError } = await admin.auth.admin.inviteUserByEmail(signup.email, {
    data: {
      company_name: signup.company_name,
      discipline: signup.discipline,
      full_name: signup.contact_name,
      main_need: signup.main_need,
    },
    redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent("/reset-password?next=/welcome")}`,
  });

  if (inviteError || !data.user) {
    const detail = inviteError?.message.slice(0, 240) || "Invitation Supabase impossible";
    await admin.from("beta_signups").update({ last_access_error: detail }).eq("id", signup.id);
    await admin.from("beta_access_events").insert({ beta_signup_id: signup.id, actor_id: actor, event_type: "invitation_failed", detail: `Renvoi : ${detail}` });
    revalidatePath("/admin/beta");
    return { ok: false, message: `Invitation non renvoyee : ${detail}` };
  }

  const now = new Date().toISOString();
  await admin.from("beta_signups").update({ invitation_sent_at: now, invitation_sent_by: actor, invited_user_id: data.user.id, last_access_error: null }).eq("id", signup.id);
  await admin.from("beta_access_events").insert({ beta_signup_id: signup.id, actor_id: actor, event_type: "invitation_sent", detail: "Invitation renvoyee manuellement" });
  revalidatePath("/admin/beta");
  return { ok: true, message: `Invitation renvoyee a ${signup.email}.` };
}
