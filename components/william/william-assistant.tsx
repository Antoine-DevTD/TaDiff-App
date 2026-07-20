import { WilliamBubble } from "@/components/william/william-bubble";
import {
  getGrantOpportunities,
  getLatestTreasurySnapshot,
  getReminders,
  getShowDocuments,
} from "@/lib/supabase/queries";
import { buildWilliamTips } from "@/lib/william";
import { getAiEntitlement } from "@/lib/ai/entitlement";

export async function WilliamAssistant() {
  const [reminders, grants, documents, treasury, entitlement] = await Promise.all([
    getReminders(),
    getGrantOpportunities(),
    getShowDocuments(),
    getLatestTreasurySnapshot(),
    getAiEntitlement(),
  ]);

  const tips = buildWilliamTips({ reminders, grants, documents, treasury });

  return <WilliamBubble aiEnabled={Boolean(entitlement?.enabled)} tips={tips} />;
}
