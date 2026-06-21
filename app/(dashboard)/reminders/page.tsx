import { ReminderForm } from "@/components/reminders/reminder-form";
import { RemindersWorkspace } from "@/components/reminders/reminders-workspace";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getReminders } from "@/lib/supabase/queries";

export default async function RemindersPage() {
  const reminders = await getReminders();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Relances</h2>
        <p className="mt-1 text-sm text-muted">
          La vue d execution pour traiter les suivis du jour sans se perdre.
        </p>
      </div>

      {reminders.length === 0 ? (
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
          <EmptyState
            title="Aucune relance"
            description="Ajoutez une relance manuelle ou creez-la depuis une opportunite pipeline."
          />
          <Card>
            <CardHeader>
              <CardTitle>Ajouter une relance</CardTitle>
              <CardDescription>
                Notez une action, une date et une priorite. Les relances pipeline arrivent ici.
              </CardDescription>
            </CardHeader>
            <ReminderForm />
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <RemindersWorkspace reminders={reminders} />
          <Card>
            <CardHeader>
              <CardTitle>Ajouter une relance</CardTitle>
              <CardDescription>
                Ajoutez un suivi manuel quand il ne vient pas encore du pipeline.
              </CardDescription>
            </CardHeader>
            <ReminderForm />
          </Card>
        </div>
      )}
    </div>
  );
}
