import { EmailWorkspace } from "@/components/campaigns/email-workspace";
import { Badge } from "@/components/ui/badge";
import { getContacts, getEmailCampaigns, getShows } from "@/lib/supabase/queries";

export default async function CampaignsPage() {
  const [contacts, shows, campaigns] = await Promise.all([
    getContacts(),
    getShows(),
    getEmailCampaigns(),
  ]);

  return (
    <div className="space-y-6">
      <EmailWorkspace contacts={contacts} shows={shows} />

      {campaigns.length > 0 ? (
        <details className="group rounded-lg border border-border bg-panel">
          <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
            <span className="flex items-center justify-between gap-3">
              Historique et campagnes
              <span className="text-xs font-normal text-muted">{campaigns.length} element(s)</span>
            </span>
          </summary>
          <div className="grid gap-3 border-t border-border p-5 lg:grid-cols-3">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-md border border-border bg-panel-strong/45 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{campaign.name}</p>
                  <Badge tone={campaign.status === "Envoyee" ? "success" : campaign.status === "Prete" ? "warning" : "neutral"}>
                    {campaign.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted">{campaign.audience}</p>
                <p className="mt-3 text-xs text-muted">
                  {campaign.sentCount.toLocaleString("fr-FR")} envoi(s) - {campaign.openRate}% d&apos;ouverture
                </p>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
