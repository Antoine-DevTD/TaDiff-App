"use server";

import { z } from "zod";
import type { Json } from "@/types/database.types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const responseSchema = z.object({ token: z.string().uuid(), participantId: z.string().uuid().nullable(), displayName: z.string().trim().max(100), comment: z.string().trim().max(500), responses: z.array(z.object({ slotId: z.string().uuid(), availability: z.enum(["yes", "maybe", "no"]) })).min(1) });
export async function submitRehearsalResponse(input: z.input<typeof responseSchema>): Promise<{ ok: boolean; message: string; participantId?: string }> {
  const parsed = responseSchema.safeParse(input); if (!parsed.success) return { ok: false, message: "Répondez à chaque créneau et indiquez votre nom." };
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("submit_public_rehearsal_response", { p_token: parsed.data.token, p_participant_id: parsed.data.participantId, p_display_name: parsed.data.displayName, p_comment: parsed.data.comment, p_responses: parsed.data.responses as Json });
  if (error) return { ok: false, message: error.message };
  const result = data && typeof data === "object" && !Array.isArray(data) ? data as { participantId?: string } : {};
  return { ok: true, message: "Vos disponibilités ont bien été transmises à la compagnie.", participantId: result.participantId };
}
