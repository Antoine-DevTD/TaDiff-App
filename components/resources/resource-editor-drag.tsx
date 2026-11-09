"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { closestCenter, DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors, type CollisionDetection, type DragMoveEvent } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { createResourceBlock } from "@/lib/resources";
import { findResourceBlock, placeResourceBlock, type BlockDestination } from "@/components/resources/editor-tree";
import type { ResourceBlock, ResourceBlockType } from "@/types/resources";

type DropPosition = { destination: BlockDestination; index: number };
const DropContext = createContext<DropPosition | null>(null);
const sameDestination = (a: BlockDestination, b: BlockDestination) => a?.parentId === b?.parentId && a?.column === b?.column;

export function ResourceDropMarker({ destination, index }: DropPosition) {
  const drop = useContext(DropContext);
  const active = drop?.index === index && sameDestination(drop.destination, destination);
  return <div aria-hidden="true" className="relative h-4">{active ? <div className="absolute inset-x-0 top-1/2 h-0.5 bg-accent"><span className="absolute -left-1 -top-1 size-2.5 rounded-full border-2 border-accent bg-panel" /></div> : null}</div>;
}

export function ResourceDropEnd({ destination, index, disabled, children }: DropPosition & { disabled: boolean; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: destination ? `end:${destination.parentId}:${destination.column}` : "end:page", disabled, data: { kind: "end", destination, index } });
  return <div ref={setNodeRef} className={`min-h-12 rounded-md ${isOver ? "bg-accent/10 outline-2 outline-accent" : ""}`}><ResourceDropMarker destination={destination} index={index} />{children}</div>;
}

export function ResourcePaletteBlock({ type, label, disabled, onAdd, children }: { type: ResourceBlockType; label: string; disabled: boolean; onAdd: () => void; children: ReactNode }) {
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: `palette:${type}`, disabled, data: { kind: "palette", type, label } });
  // Enter/Space retains native button insertion. Mouse/touch can drag into any column.
  const pointerListeners = { ...listeners };
  delete pointerListeners.onKeyDown;
  return <button type="button" ref={setNodeRef} {...pointerListeners} disabled={disabled} onClick={onAdd} title={`${label} · glisser dans la page ou cliquer pour ajouter`} className={`flex min-h-14 min-w-0 touch-manipulation cursor-grab flex-col items-center justify-center gap-1.5 rounded-md border border-border bg-panel px-1 py-2 text-center text-xs font-medium hover:border-accent hover:bg-accent/5 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:cursor-grabbing disabled:cursor-default disabled:opacity-40 xl:min-h-20 xl:py-3 ${isDragging ? "opacity-40" : ""}`}>{children}<span>{label}</span></button>;
}

export function ResourceDragArea({ blocks, busy, onChange, onSelect, onRejected, children }: { blocks: ResourceBlock[]; busy: boolean; onChange: (blocks: ResourceBlock[]) => void; onSelect: (id: string) => void; onRejected: () => void; children: ReactNode }) {
  const [drop, setDrop] = useState<DropPosition | null>(null);
  const [dragLabel, setDragLabel] = useState<string | null>(null);
  const pointerY = useRef<number | null>(null);
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const collisionDetection: CollisionDetection = (args) => {
    pointerY.current = args.pointerCoordinates?.y ?? null;
    const activeBlock = findResourceBlock(blocks, String(args.active.id));
    const containers = args.droppableContainers.filter((container) => {
      if (container.id === args.active.id) return !args.pointerCoordinates;
      return !activeBlock || !findResourceBlock([activeBlock], String(container.id)) && !findResourceBlock([activeBlock], container.data.current?.destination?.parentId);
    });
    if (!args.pointerCoordinates) return closestCenter({ ...args, droppableContainers: containers.filter((container) => container.data.current?.kind === "block" && sameDestination(container.data.current.destination, args.active.data.current?.destination)) });
    const hits = pointerWithin({ ...args, droppableContainers: containers });
    // Nested columns overlap their parent; the smallest hovered target is the intended destination.
    return hits.sort((a, b) => { const ra = args.droppableRects.get(a.id), rb = args.droppableRects.get(b.id); return (ra ? ra.width * ra.height : Infinity) - (rb ? rb.width * rb.height : Infinity); }).slice(0, 1);
  };
  function position(event: DragMoveEvent): DropPosition | null {
    const data = event.over?.data.current;
    if (!data || busy || event.over?.id === event.active.id) return null;
    if (data.kind === "end") return { destination: data.destination, index: data.index };
    if (data.kind !== "block") return null;
    const keyboard = event.activatorEvent.type === "keydown";
    const after = keyboard
      ? sameDestination(event.active.data.current?.destination, data.destination) && event.active.data.current!.index < data.index
      : Boolean(pointerY.current !== null && event.over && pointerY.current > event.over.rect.top + event.over.rect.height / 2);
    return { destination: data.destination, index: data.index + Number(after) };
  }
  function finish(event: DragMoveEvent) {
    const target = position(event); setDrop(null); setDragLabel(null);
    if (!target || busy) return;
    const data = event.active.data.current;
    const block = data?.kind === "palette" ? createResourceBlock(data.type) : findResourceBlock(blocks, String(event.active.id));
    if (!block) return;
    const next = placeResourceBlock(blocks, block, target.destination, target.index);
    if (next === blocks) { onRejected(); return; }
    onChange(next); onSelect(block.id);
  }
  return <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={({ active }) => setDragLabel(active.data.current?.label || "Bloc")} onDragMove={(event) => setDrop(position(event))} onDragOver={(event) => setDrop(position(event))} onDragEnd={finish} onDragCancel={() => { setDrop(null); setDragLabel(null); }} accessibility={{ announcements: { onDragStart: () => "Bloc saisi. Utilisez les flèches pour le déplacer.", onDragOver: ({ over }) => over ? "Nouvel emplacement sélectionné." : "En dehors de la page. Relâcher annule le déplacement.", onDragEnd: ({ over }) => over ? "Déplacement terminé." : "Déplacement annulé.", onDragCancel: () => "Déplacement annulé." }, screenReaderInstructions: { draggable: "Appuyez sur Espace pour saisir un bloc, utilisez les flèches pour le déplacer puis Espace pour le déposer. Échap annule." } }}><DropContext.Provider value={drop}>{children}</DropContext.Provider><DragOverlay dropAnimation={null}>{dragLabel ? <div className="max-w-48 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg">{dragLabel}</div> : null}</DragOverlay></DndContext>;
}
