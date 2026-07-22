import { NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type GeocodingFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    city?: string;
    context?: string;
    label?: string;
    name?: string;
    postcode?: string;
  };
};

type GeocodingResponse = {
  features?: GeocodingFeature[];
};

export async function GET(request: Request) {
  if (hasSupabaseEnv()) {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 180) ?? "";
  if (query.length < 3) return NextResponse.json({ suggestions: [] });

  const searchUrl = new URL("https://data.geopf.fr/geocodage/search");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("limit", "6");
  searchUrl.searchParams.set("autocomplete", "1");

  try {
    const response = await fetch(searchUrl, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86_400 },
    });
    if (!response.ok) throw new Error(`Geocoding service returned ${response.status}`);

    const payload = await response.json() as GeocodingResponse;
    const suggestions = (payload.features ?? []).flatMap((feature, index) => {
      const coordinates = feature.geometry?.coordinates;
      const properties = feature.properties;
      if (!coordinates || !properties?.name || !properties.city) return [];

      const contextParts = (properties.context ?? "").split(",").map((part) => part.trim()).filter(Boolean);
      return [{
        id: `${properties.label ?? properties.name}-${index}`,
        label: properties.label ?? `${properties.name}, ${properties.city}`,
        address: properties.name,
        postalCode: properties.postcode ?? "",
        city: properties.city,
        department: contextParts.length >= 2 ? contextParts[1] : "",
        region: contextParts.length >= 3 ? contextParts.at(-1) ?? "" : "",
        latitude: coordinates[1],
        longitude: coordinates[0],
      }];
    });

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json(
      { error: "Le service d'adresses est momentanement indisponible.", suggestions: [] },
      { status: 502 },
    );
  }
}
