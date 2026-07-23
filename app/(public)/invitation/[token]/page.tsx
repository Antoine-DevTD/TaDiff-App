import { CalendarDays, MapPin, Theater } from "lucide-react";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { InvitationResponse } from "./invitation-response";

export const dynamic = "force-dynamic";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
    notFound();
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_public_performance_invitation", {
    invitation_token: token,
  });
  const invitation = data?.[0];

  if (error || !invitation) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-[72vh] w-full max-w-3xl items-center px-4 py-12 sm:px-6">
      <Card className="w-full overflow-hidden p-0">
        <div className="border-b border-border bg-accent px-6 py-7 text-white sm:px-8">
          <p className="text-xs uppercase tracking-[0.16em] text-white/75">Invitation</p>
          <h1 className="mt-3 text-3xl font-semibold">{invitation.show_title ?? "Prochaine représentation"}</h1>
          <p className="mt-2 text-sm text-white/85">Proposee par {invitation.company_name}</p>
        </div>
        <div className="space-y-7 p-6 sm:p-8">
          <p className="text-lg leading-8">
            Bonjour {invitation.recipient_name}, la compagnie serait heureuse de vous accueillir
            lors de cette prochaine représentation.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <InvitationDetail
              icon={<CalendarDays className="h-5 w-5" aria-hidden />}
              label="Date"
              value={new Date(invitation.performance_date).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            />
            <InvitationDetail
              icon={invitation.venue ? <MapPin className="h-5 w-5" aria-hidden /> : <Theater className="h-5 w-5" aria-hidden />}
              label="Lieu"
              value={invitation.venue || "Le lieu vous sera confirme par la compagnie"}
            />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Pourrons-nous compter sur votre presence ?</h2>
            <p className="mt-1 text-sm text-muted">Votre réponse est transmise directement a la compagnie.</p>
          </div>
          <InvitationResponse initialResponse={invitation.response} token={token} />
        </div>
      </Card>
    </main>
  );
}

function InvitationDetail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-24 gap-3 rounded-md border border-border bg-panel-strong/45 p-4">
      <span className="mt-0.5 text-accent">{icon}</span>
      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
        <p className="mt-2 font-medium">{value}</p>
      </div>
    </div>
  );
}
