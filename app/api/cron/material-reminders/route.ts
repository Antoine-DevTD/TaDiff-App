import { NextRequest, NextResponse } from "next/server";
import { runMaterialReminders } from "@/lib/material-reminders";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
  }
  try {
    return NextResponse.json(await runMaterialReminders());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Rappel impossible." }, { status: 500 });
  }
}
