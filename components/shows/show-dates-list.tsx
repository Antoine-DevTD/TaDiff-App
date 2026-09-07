import Link from "next/link";
import { getShowDates } from "@/lib/show-dates";

export async function ShowDatesList({ showId }: { showId: string }) {
  const { dates, error } = await getShowDates(showId);
  return (
    <section className="mb-6 border-b border-border pb-6" aria-labelledby="scheduled-show-dates">
      <h3 id="scheduled-show-dates" className="text-sm font-semibold">Représentations et agenda du spectacle</h3>
      <p className="mt-1 text-xs text-muted">Les représentations saisies dans les exploitations et les événements de l’agenda, dont les répétitions confirmées. Les créneaux proposés restent dans l’onglet Répétitions.</p>
      {error ? <p className="mt-3 text-sm text-danger" role="alert">{error}</p> : dates.length ? (
        <ul className="mt-3 divide-y divide-border">{dates.map((date) => (
          <li key={date.id}>
            <Link href={date.href} className="flex flex-col gap-1 py-3 text-sm hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-medium">{date.title}</p><p className="text-xs text-muted">{date.kind}{date.status ? ` · ${date.status}` : ""}{date.location ? ` · ${date.location}` : ""}</p></div>
              <p><time dateTime={date.date}>{new Date(`${date.date}T12:00:00`).toLocaleDateString("fr-FR")}</time>{date.time ? ` · ${date.time.slice(0, 5)}${date.endTime ? `–${date.endTime.slice(0, 5)}` : ""}` : ""}</p>
            </Link>
          </li>
        ))}</ul>
      ) : <p className="mt-3 text-sm text-muted">Aucune représentation ni événement d’agenda rattaché à ce spectacle.</p>}
    </section>
  );
}
