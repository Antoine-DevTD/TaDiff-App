import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import { createPrivateObjectUrls, type StorageProvider } from "@/lib/storage/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type MaterialCategory = "costume" | "accessoire" | "decor" | "technique" | "consommable" | "autre";
export type MaterialStatus = "to_prepare" | "ready" | "to_buy" | "packed";

export type ShowMaterialItem = {
  id: string;
  name: string;
  category: MaterialCategory;
  description: string;
  ownerContactId: string;
  ownerLabel: string;
  defaultResponsibleContactId: string;
  isConsumable: boolean;
  quantityOwned: number;
  unit: string;
  unitCost: number;
  photoUrl: string;
  photoStoragePath: string;
  photoStorageProvider: "supabase" | "r2" | "";
  notes: string;
};

export type ShowMaterialRequirement = {
  id: string;
  itemId: string;
  performanceDate: string;
  performanceTime: string;
  venue: string;
  quantityNeeded: number;
  responsibleContactId: string;
  status: MaterialStatus;
  notes: string;
};

export type ShowMaterialRoadmap = {
  items: ShowMaterialItem[];
  requirements: ShowMaterialRequirement[];
  reminderDates: string[];
  error: string | null;
};

export async function getShowMaterialRoadmap(showId: string): Promise<ShowMaterialRoadmap> {
  if (!hasSupabaseEnv()) return { items: [], requirements: [], reminderDates: [], error: null };
  const supabase = await getSupabaseServerClient();
  const [itemsResult, requirementsResult, deliveriesResult] = await Promise.all([
    supabase.from("show_material_items").select("*").eq("show_id", showId).eq("active", true).order("name"),
    supabase.from("show_material_requirements").select("*").eq("show_id", showId).order("performance_date").order("performance_time"),
    supabase.from("material_reminder_deliveries").select("performance_date").eq("show_id", showId),
  ]);

  const error = itemsResult.error ?? requirementsResult.error ?? deliveriesResult.error;
  if (error) return { items: [], requirements: [], reminderDates: [], error: error.message };

  const items = await Promise.all((itemsResult.data ?? []).map(async (row) => {
    let photoUrl = "";
    if (row.photo_storage_path && row.photo_storage_provider) {
      const urls = await createPrivateObjectUrls(row.photo_storage_provider as StorageProvider, row.photo_storage_path, `${row.name}.jpg`).catch(() => null);
      photoUrl = urls?.previewUrl ?? "";
    }
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      description: row.description ?? "",
      ownerContactId: row.owner_contact_id ?? "",
      ownerLabel: row.owner_label ?? "",
      defaultResponsibleContactId: row.default_responsible_contact_id ?? "",
      isConsumable: row.is_consumable,
      quantityOwned: Number(row.quantity_owned),
      unit: row.unit,
      unitCost: Number(row.unit_cost),
      photoUrl,
      photoStoragePath: row.photo_storage_path ?? "",
      photoStorageProvider: row.photo_storage_provider ?? "",
      notes: row.notes ?? "",
    } satisfies ShowMaterialItem;
  }));

  return {
    items,
    requirements: (requirementsResult.data ?? []).map((row) => ({
      id: row.id,
      itemId: row.material_item_id,
      performanceDate: row.performance_date,
      performanceTime: row.performance_time?.slice(0, 5) ?? "",
      venue: row.venue ?? "",
      quantityNeeded: Number(row.quantity_needed),
      responsibleContactId: row.responsible_contact_id ?? "",
      status: row.status,
      notes: row.notes ?? "",
    })),
    reminderDates: [...new Set((deliveriesResult.data ?? []).map((row) => row.performance_date))],
    error: null,
  };
}
