"use client";

import { BellPlus, Mail, MapPin, UsersRound } from "lucide-react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Contact } from "@/types";

const franceCenter: [number, number] = [46.65, 2.45];

const statusColors: Record<Contact["status"], string> = {
  Prospect: "#172554",
  "En discussion": "#f59e0b",
  Partenaire: "#16a34a",
};

export function VenueMap({
  contacts,
  venues,
  onCreateAction,
  onWrite,
}: {
  contacts: Contact[];
  venues: Contact[];
  onCreateAction: (venue: Contact) => void;
  onWrite: (venue: Contact) => void;
}) {
  const mappedVenues = useMemo(
    () => venues.filter((venue) => typeof venue.latitude === "number" && typeof venue.longitude === "number"),
    [venues],
  );
  const [selectedId, setSelectedId] = useState<string | null>(mappedVenues[0]?.id ?? null);
  const selectedVenue = mappedVenues.find((venue) => venue.id === selectedId) ?? null;
  const directors = selectedVenue
    ? contacts.filter((contact) => contact.venueId === selectedVenue.id)
    : [];

  if (mappedVenues.length === 0) {
    return (
      <div className="grid min-h-[560px] place-items-center bg-panel-strong/25 px-6 text-center">
        <div className="max-w-md">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent">
            <MapPin className="h-6 w-6" aria-hidden />
          </span>
          <h3 className="mt-4 text-lg font-semibold">Aucun lieu positionné pour le moment</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Ajoutez une latitude et une longitude dans la fiche d&apos;un lieu, ou mappez ces colonnes lors d&apos;un import. La carte se remplira automatiquement.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      aria-label="Carte des lieux"
      className="relative min-h-[620px] overflow-hidden bg-panel-strong"
      role="region"
    >
      <MapContainer
        center={franceCenter}
        className="h-[620px] w-full"
        scrollWheelZoom
        zoom={6}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitVenueBounds venues={mappedVenues} />
        {mappedVenues.map((venue) => (
          <CircleMarker
            key={venue.id}
            center={[venue.latitude!, venue.longitude!]}
            radius={selectedId === venue.id ? 11 : 8}
            pathOptions={{
              color: "#ffffff",
              fillColor: statusColors[venue.status],
              fillOpacity: 0.95,
              opacity: 1,
              weight: selectedId === venue.id ? 4 : 2,
            }}
            eventHandlers={{ click: () => setSelectedId(venue.id) }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <strong>{venue.name}</strong>
              <br />
              {venue.city || "Ville à renseigner"}
              {venue.capacity ? ` · ${venue.capacity} places` : ""}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      {selectedVenue ? (
        <aside className="absolute bottom-4 left-4 right-4 z-[500] rounded-lg border border-border bg-panel/95 p-4 shadow-xl shadow-ink/15 backdrop-blur sm:bottom-auto sm:right-auto sm:top-4 sm:w-80">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{selectedVenue.name}</p>
              <p className="mt-1 text-sm text-muted">
                {[selectedVenue.address, selectedVenue.postalCode, selectedVenue.city].filter(Boolean).join(" · ") || "Adresse à renseigner"}
              </p>
            </div>
            <span
              className="mt-1 h-3 w-3 shrink-0 rounded-full ring-4 ring-panel-strong"
              style={{ backgroundColor: statusColors[selectedVenue.status] }}
              title={selectedVenue.status}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-y border-border py-3 text-sm">
            <div>
              <p className="text-xs text-muted">Jauge</p>
              <p className="mt-1 font-medium">{selectedVenue.capacity ? `${selectedVenue.capacity} places` : "À renseigner"}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Direction</p>
              <p className="mt-1 truncate font-medium">{directors[0]?.name || "À renseigner"}</p>
            </div>
          </div>
          <div className="mt-3 space-y-1 text-sm">
            <p className={cn(!selectedVenue.phone && "text-muted")}>{selectedVenue.phone || "Téléphone à renseigner"}</p>
            <p className={cn(!selectedVenue.email && "text-muted")}>{selectedVenue.email || "Email à renseigner"}</p>
          </div>
          <div className="mt-4 flex gap-2">
            <Button className="flex-1 gap-2" type="button" onClick={() => onCreateAction(selectedVenue)}>
              <BellPlus className="h-4 w-4" aria-hidden />
              Ajouter une action
            </Button>
            <Button
              className="h-10 w-10 p-0"
              disabled={!selectedVenue.email}
              variant="secondary"
              type="button"
              title="Écrire au lieu"
              aria-label={`Écrire à ${selectedVenue.name}`}
              onClick={() => onWrite(selectedVenue)}
            >
              <Mail className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </aside>
      ) : null}

      <div className="absolute right-4 top-4 z-[500] hidden rounded-md border border-border bg-panel/92 px-3 py-2 text-xs text-muted shadow-sm backdrop-blur sm:flex sm:items-center sm:gap-2">
        <UsersRound className="h-4 w-4 text-accent" aria-hidden />
        {mappedVenues.length} lieu{mappedVenues.length > 1 ? "x" : ""} sur la carte
      </div>
    </div>
  );
}

function FitVenueBounds({ venues }: { venues: Contact[] }) {
  const map = useMap();
  const signature = venues.map((venue) => `${venue.id}:${venue.latitude}:${venue.longitude}`).join("|");

  useEffect(() => {
    if (venues.length === 1) {
      map.setView([venues[0].latitude!, venues[0].longitude!], 10, { animate: false });
      return;
    }
    map.fitBounds(venues.map((venue) => [venue.latitude!, venue.longitude!] as [number, number]), {
      padding: [44, 44],
      maxZoom: 10,
      animate: false,
    });
  }, [map, signature, venues]);

  return null;
}
