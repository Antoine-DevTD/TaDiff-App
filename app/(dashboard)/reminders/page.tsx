import { ReminderForm } from "@/components/reminders/reminder-form";
import { RemindersWorkspace } from "@/components/reminders/reminders-workspace";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getReminders } from "@/lib/supabase/queries";

export default async function RemindersPage() {
  const reminders = await getReminders();

  return (
    <div className="space-y-6">
      {reminders.length === 0 ? (
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
          <EmptyState
            title="Rien a faire pour l&apos;instant"
            description="Ajoutez une action manuelle ou creez-la depuis une date possible."
          />
          <Card>
            <CardHeader>
              <CardTitle>Ajouter une action</CardTitle>
              <CardDescription>
                Notez ce qu&apos;il faut faire, pour quand, et avec quelle priorite.
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
              <CardTitle>Ajouter une action</CardTitle>
              <CardDescription>
                Ajoutez un suivi manuel quand il ne vient pas encore d&apos;une date possible.
              </CardDescription>
            </CardHeader>
            <ReminderForm />
          </Card>
        </div>
      )}
    </div>
  );
}
