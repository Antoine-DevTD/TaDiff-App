import { WilliamBubble } from "@/components/william/william-bubble";
import { WilliamCreditWelcome } from "@/components/william/william-credit-welcome";
import {
  getGrantOpportunities,
  getLatestTreasurySnapshot,
  getReminders,
  getShowDocuments,
  getShows,
} from "@/lib/supabase/queries";
import { buildWilliamTips } from "@/lib/william";
import { getAiEntitlement } from "@/lib/ai/entitlement";

export async function WilliamAssistant() {
  const [reminders, grants, documents, treasury, entitlement, shows] = await Promise.all([
    getReminders(),
    getGrantOpportunities(),
    getShowDocuments(),
    getLatestTreasurySnapshot(),
    getAiEntitlement(),
    getShows(),
  ]);

  const tips = buildWilliamTips({ reminders, grants, documents, treasury });

  const unavailableReason = entitlement
    ? "William n’est pas activé pour ce compte actuellement. Contactez l’équipe TaDiff pour vérifier cet accès."
    : "Impossible de vérifier votre accès à William pour le moment. Actualisez la page pour réessayer.";

  return <><WilliamCreditWelcome bonusBalance={entitlement?.bonusBalance ?? 0} /><WilliamBubble aiEnabled={Boolean(entitlement?.enabled)} unavailableReason={unavailableReason} tips={tips} shows={shows.map(({ id, title }) => ({ id, title }))} /></>;
}
