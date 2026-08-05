import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const allowedTypes = new Set<EmailOtpType>([
  "email",
  "invite",
  "magiclink",
  "recovery",
  "signup",
]);

function safeNextPath(value: string | null, type: EmailOtpType) {
  if (value?.startsWith("/") && !value.startsWith("//")) return value;
  if (type === "invite") return "/reset-password?next=/welcome";
  if (type === "recovery") return "/reset-password";
  return "/welcome";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const rawType = requestUrl.searchParams.get("type");

  if (!tokenHash || !rawType || !allowedTypes.has(rawType as EmailOtpType)) {
    return NextResponse.redirect(new URL("/login?auth=invalid_link", requestUrl.origin));
  }

  const type = rawType as EmailOtpType;
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) {
    return NextResponse.redirect(new URL("/login?auth=expired_link", requestUrl.origin));
  }

  return NextResponse.redirect(
    new URL(safeNextPath(requestUrl.searchParams.get("next"), type), requestUrl.origin),
  );
}
