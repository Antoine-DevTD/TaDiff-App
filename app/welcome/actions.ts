"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasSupabaseEnv } from "@/lib/env";
import { demoWebinarEmail } from "@/lib/demo-webinar";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  getConfiguredStorageProvider,
  removePrivateObject,
  type StorageProvider,
} from "@/lib/storage/server";

const welcomeOnboardingSchema = z.object({
  fullName: z.string().trim().min(2, "Indiquez votre nom."),
  companyName: z.string().trim().min(2, "Indiquez le nom de la compagnie."),
  logoUrl: z.string().trim().url("URL invalide").optional().or(z.literal("")),
  replay: z.boolean().optional(),
  showReadiness: z.enum(["ready", "later"]),
});

export type WelcomeOnboardingValues = z.infer<typeof welcomeOnboardingSchema>;

export type WelcomeOnboardingResult = {
  ok: boolean;
  message: string;
  nextPath: string;
};

export async function resetWebinarDemoWorkspace(): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!hasSupabaseEnv() || process.env.TADIFF_E2E_MODE === "playwright-local") {
    return { ok: true, message: "Espace de démonstration réinitialisé." };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email?.toLowerCase() !== demoWebinarEmail) {
    return {
      ok: false,
      message: "La réinitialisation est réservée au compte du webinaire.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.company_id) {
    return {
      ok: false,
      message: profileError?.message ?? "Espace de démonstration introuvable.",
    };
  }

  const [{ data: showDocuments }, { data: workVersions }, { data: companyDocuments }] =
    await Promise.all([
      supabase
        .from("show_documents")
        .select("storage_path,storage_provider")
        .eq("company_id", profile.company_id)
        .not("storage_path", "is", null),
      supabase
        .from("show_work_document_versions")
        .select("storage_path,storage_provider")
        .eq("company_id", profile.company_id),
      supabase
        .from("company_documents")
        .select("storage_path,storage_provider")
        .eq("company_id", profile.company_id)
        .not("storage_path", "is", null),
    ]);

  const storedObjects = [
    ...(showDocuments ?? []),
    ...(workVersions ?? []),
    ...(companyDocuments ?? []),
  ].flatMap((item) =>
    item.storage_path
      ? [{
          storagePath: item.storage_path,
          provider: item.storage_provider as StorageProvider | null,
        }]
      : [],
  );

  await Promise.allSettled(
    storedObjects.map((item) =>
      removePrivateObject(
        item.provider || getConfiguredStorageProvider(),
        item.storagePath,
      ),
    ),
  );

  const { error: resetError } = await supabase.rpc("reset_webinar_demo_workspace");

  if (resetError) {
    return {
      ok: false,
      message: resetError.message.includes("schema cache")
        ? "Appliquez les migrations 057 et 058 avant de relancer la démonstration."
        : resetError.message,
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/shows");
  revalidatePath("/pipeline");
  revalidatePath("/reminders");
  revalidatePath("/documents");
  revalidatePath("/subventions");
  revalidatePath("/calendar");
  revalidatePath("/finances");

  return {
    ok: true,
    message: "L'espace de démonstration a été entièrement remis à zéro.",
  };
}

export async function completeWelcomeOnboarding(
  values: WelcomeOnboardingValues,
): Promise<WelcomeOnboardingResult> {
  const parsed = welcomeOnboardingSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Certaines informations de bienvenue sont incompletes.",
      nextPath: "/welcome",
    };
  }

  if (!hasSupabaseEnv()) {
    return {
      ok: true,
      message: "Mode demo : espace prepare localement.",
      nextPath: "/dashboard?startTour=1",
    };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message: "Session introuvable. Reconnectez-vous pour terminer l'accueil.",
      nextPath: "/login",
    };
  }

  if (parsed.data.replay && user.email?.toLowerCase() !== demoWebinarEmail) {
    return {
      ok: false,
      message: "La relecture du parcours est reservee au compte du webinaire.",
      nextPath: "/dashboard",
    };
  }

  await supabase.auth.updateUser({
    data: {
      company_name: parsed.data.companyName,
      full_name: parsed.data.fullName,
    },
  });

  const { data: companyId, error: workspaceError } = await supabase.rpc("ensure_workspace", {
    company_name: parsed.data.companyName,
  });

  if (workspaceError || !companyId) {
    return {
      ok: false,
      message: workspaceError?.message ?? "Impossible de preparer votre espace.",
      nextPath: "/welcome",
    };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName })
    .eq("id", user.id);

  if (profileError) {
    return { ok: false, message: profileError.message, nextPath: "/welcome" };
  }

  const { error: companyError } = await supabase
    .from("companies")
    .update({
      name: parsed.data.companyName,
      logo_url: parsed.data.logoUrl || null,
    })
    .eq("id", companyId);

  if (companyError) {
    return { ok: false, message: companyError.message, nextPath: "/welcome" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");

  return {
    ok: true,
    message:
      parsed.data.showReadiness === "ready"
        ? "Espace pret. William va vous guider vers votre premier spectacle."
        : "Espace pret. William va vous montrer le cockpit.",
    nextPath: parsed.data.replay
      ? "/dashboard?startTour=1&webinarReplay=1"
      : "/dashboard?startTour=1",
  };
}
