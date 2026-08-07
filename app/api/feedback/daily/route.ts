import { NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/env";
import type { DailyFeedbackPrompt } from "@/lib/daily-feedback";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dailyFeedbackSchema } from "@/lib/validation/daily-feedback";

export async function GET() {
  if (!hasSupabaseEnv()) return NextResponse.json({ prompt: null });

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data, error } = await supabase.rpc("get_daily_feedback_prompt");

  if (error) {
    return NextResponse.json({ prompt: null }, { status: 200 });
  }

  const row = data?.[0];
  const prompt: DailyFeedbackPrompt | null = row
    ? { usageDate: row.usage_date, lastUsedAt: row.last_used_at }
    : null;

  return NextResponse.json({ prompt });
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ ok: true, message: "Mode démo : retour bien reçu." });
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const parsed = dailyFeedbackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Retour invalide." },
      { status: 400 },
    );
  }

  const { error } = await supabase.rpc("submit_daily_feedback", {
    p_usage_date: parsed.data.usageDate,
    p_problem_areas: parsed.data.problemAreas,
    p_no_problem: parsed.data.noProblem,
    p_note: parsed.data.note?.trim() || null,
    p_suggestion: parsed.data.suggestion?.trim() || null,
    p_page: parsed.data.page || null,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, message: "Le retour n’a pas pu être envoyé. Réessayez dans un instant." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, message: "Merci, votre retour a bien été envoyé." });
}
