import { CITY_NAMES, ONLINE, OTHER } from "@/lib/constants";

/** Reads a PlaceField: a listed city, the typed town, or "Online". Null if nothing valid was given. */
export function readPlace(form: FormData, allowOnline: boolean): string | null {
  const city = String(form.get("city") ?? "").trim();
  if (CITY_NAMES.includes(city)) return city;
  if (allowOnline && city === ONLINE) return ONLINE;
  if (city !== OTHER) return null;
  const town = String(form.get("city_other") ?? "").trim().replace(/\s+/g, " ");
  if (town.length < 2 || town.length > 60) return null;
  // Typing a listed city by hand still files it under that city.
  return CITY_NAMES.find((c) => c.toLowerCase() === town.toLowerCase()) ?? town;
}
