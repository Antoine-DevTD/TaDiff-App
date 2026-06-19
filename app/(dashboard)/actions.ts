"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateWorkspace } from "@/lib/supabase/workspace";
import { contactSchema, type ContactFormValues } from "@/lib/validation/contact";
import { showSchema, type ShowFormInput } from "@/lib/validation/show";

type ActionResult = {
  ok: boolean;
  message: string;
};

export async function createShow(values: ShowFormInput): Promise<ActionResult> {
  const parsed = showSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le formulaire spectacle contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : spectacle valide, non enregistre." };
  }

  const workspace = await getOrCreateWorkspace();

  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("shows").insert({
    company_id: workspace.companyId,
    title: parsed.data.title,
    discipline: parsed.data.discipline,
    status: parsed.data.status,
    next_date: parsed.data.nextDate || null,
    budget: parsed.data.budget ?? 0,
    notes: parsed.data.notes || null,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/shows");
  revalidatePath("/dashboard");

  return { ok: true, message: "Spectacle cree." };
}

export async function createContact(values: ContactFormValues): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, message: "Le formulaire contact contient des erreurs." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: true, message: "Mode demo : contact valide, non enregistre." };
  }

  const workspace = await getOrCreateWorkspace();

  if (!workspace.companyId) {
    return { ok: false, message: workspace.error ?? "Compagnie introuvable." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("contacts").insert({
    company_id: workspace.companyId,
    name: parsed.data.name,
    organization: parsed.data.organization,
    role: parsed.data.role || null,
    email: parsed.data.email || null,
    city: parsed.data.city || null,
    status: parsed.data.status,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/contacts");
  revalidatePath("/dashboard");

  return { ok: true, message: "Contact cree." };
}
