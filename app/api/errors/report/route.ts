import { NextResponse } from "next/server";
import { z } from "zod";
import { reportApplicationError } from "@/lib/error-reporting";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({ message: z.string().min(1).max(1000), code: z.string().max(100).optional(), route: z.string().max(240).optional(), source: z.string().max(80).optional() });

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).maybeSingle();
  await reportApplicationError({ ...parsed.data, companyId: profile?.company_id, reporterEmail: user.email });
  return NextResponse.json({ ok: true });
}
