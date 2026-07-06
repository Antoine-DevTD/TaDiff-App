import { WilliamBubble } from "@/components/william/william-bubble";
import {
  getGrantOpportunities,
  getLatestTreasurySnapshot,
  getReminders,
  getShowDocuments,
} from "@/lib/supabase/queries";
import { buildWilliamTips } from "@/lib/william";

export async function WilliamAssistant() {
  const [reminders, grants, documents, treasury] = await Promise.all([
    getReminders(),
    getGrantOpportunities(),
    getShowDocuments(),
    getLatestTreasurySnapshot(),
  ]);

  const tips = buildWilliamTips({ reminders, grants, documents, treasury });

  return <WilliamBubble tips={tips} />;
}
