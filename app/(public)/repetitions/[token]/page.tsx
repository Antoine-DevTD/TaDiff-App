import { CalendarDays, MapPin, Users } from "lucide-react";
import { notFound } from "next/navigation";
import type { Json } from "@/types/database.types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ResponseForm } from "./response-form";

export const dynamic = "force-dynamic";
type PublicPoll = {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  showResponses: boolean;
  showTitle: string;
  companyName: string;
  participants: Array<{
    id: string;
    name: string;
    comment: string | null;
    respondedAt: string | null;
  }>;
  slots: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string | null;
    confirmed: boolean;
  }>;
  responses: Array<{
    participantId: string;
    slotId: string;
    availability: "yes" | "maybe" | "no";
  }>;
};

export default async function RehearsalPollPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_public_rehearsal_poll", {
    p_token: token,
  });
  if (error || !data) notFound();
  const poll = data as Json as unknown as PublicPoll;
  const canRespond =
    poll.status === "open" &&
    (!poll.deadline || poll.deadline >= new Date().toISOString().slice(0, 10));
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="border-b border-border pb-7">
        <p className="text-sm font-medium text-accent">{poll.companyName}</p>
        <h1 className="mt-2 text-3xl font-semibold text-balance">
          {poll.title}
        </h1>
        <p className="mt-2 text-lg text-muted">{poll.showTitle}</p>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <span className="flex items-center gap-2">
            <Users aria-hidden className="h-4 w-4" />
            {poll.participants.length} personne(s) invitée(s)
          </span>
          <span className="flex items-center gap-2">
            <CalendarDays aria-hidden className="h-4 w-4" />
            {poll.slots.length} créneau(x)
          </span>
          {poll.slots.some((slot) => slot.location) ? (
            <span className="flex items-center gap-2">
              <MapPin aria-hidden className="h-4 w-4" />
              Lieu indiqué avec chaque créneau
            </span>
          ) : null}
        </div>
        {poll.deadline ? (
          <p className="mt-4 text-sm font-medium">
            Merci de répondre avant le{" "}
            {new Date(`${poll.deadline}T12:00:00`).toLocaleDateString("fr-FR")}.
          </p>
        ) : null}
      </header>
      <div className="mt-8 grid min-w-0 gap-10">
        {canRespond ? (
          <ResponseForm
            participants={poll.participants}
            responses={poll.responses}
            slots={poll.slots}
            token={token}
          />
        ) : (
          <section className="border-y border-border py-8">
            <h2 className="text-xl font-semibold">Ce sondage est fermé</h2>
            <p className="mt-2 text-sm text-muted">
              Les créneaux restent consultables, mais la compagnie ne prend plus
              de réponses.
            </p>
            <ul className="mt-6 divide-y divide-border">
              {poll.slots.map((slot) => (
                <li className="py-4" key={slot.id}>
                  {new Date(`${slot.date}T12:00:00`).toLocaleDateString(
                    "fr-FR",
                    { weekday: "long", day: "numeric", month: "long" },
                  )}{" "}
                  · {slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}
                </li>
              ))}
            </ul>
          </section>
        )}
        {poll.showResponses ? (
          <aside className="h-fit border border-border bg-panel p-5">
            <h2 className="font-semibold">Réponses de l’équipe</h2>
            <ul className="mt-4 space-y-3">
              {poll.participants.map((participant) => (
                <li
                  className="flex items-center justify-between gap-3 text-sm"
                  key={participant.id}
                >
                  <span>{participant.name}</span>
                  <span
                    className={
                      participant.respondedAt
                        ? "font-medium text-success"
                        : "text-muted"
                    }
                  >
                    {participant.respondedAt ? "Répondu" : "En attente"}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </div>
    </main>
  );
}
