import { ReminderForm } from "@/components/reminders/reminder-form";
import { RemindersList } from "@/components/reminders/reminders-list";
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
          Une vue simple pour ne rater aucun suivi de diffusion.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ajouter une relance</CardTitle>
          <CardDescription>
            Notez une action, une date et une priorite. Les relances pipeline arrivent ici.
          </CardDescription>
        </CardHeader>
        <ReminderForm />
      </Card>

      {reminders.length === 0 ? (
        <EmptyState
          title="Aucune relance"
          description="Ajoutez une relance manuelle ou creez-la depuis une opportunite pipeline."
        />
      ) : (
        <RemindersList reminders={reminders} />
      )}
    </div>
  );
}
