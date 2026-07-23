import { PatronageWorkspace } from "@/components/patronage/patronage-workspace";
import { PlannedFeatureNotice } from "@/components/ui/planned-feature";
import { hasSupabaseEnv } from "@/lib/env";
import { getPatronageDeals } from "@/lib/supabase/queries";

export default async function MecenatPage() {
  const deals = await getPatronageDeals();

  return <div className="space-y-6">
    {hasSupabaseEnv() ? null : <PlannedFeatureNotice detail="Sans base Supabase connectée, le suivi mécénat affiche un jeu de démonstration." kind="demo-data" />}
    <PatronageWorkspace deals={deals} />
  </div>;
}
