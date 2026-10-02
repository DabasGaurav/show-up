"use client";

import { useState } from "react";
import { CITY_NAMES, ONLINE, OTHER } from "@/lib/constants";
import { Select, TextInput } from "./field";

/**
 * City picker that reaches beyond the listed cities: "Other town or village" opens
 * a text box. Sends `city` and, for other places, `city_other` (read with readPlace).
 */
export function PlaceField({ id = "city", defaultValue = "", onlineLabel }: { id?: string; defaultValue?: string; onlineLabel?: string }) {
  const known = CITY_NAMES.includes(defaultValue) || (defaultValue === ONLINE && onlineLabel);
  const [city, setCity] = useState(known ? defaultValue : defaultValue ? OTHER : "");
  return (
    <div className="space-y-2">
      <Select id={id} name="city" value={city} onChange={(e) => setCity(e.target.value)} required>
        <option value="" disabled>Pick your city</option>
        {CITY_NAMES.map((c) => <option key={c}>{c}</option>)}
        <option value={OTHER}>Other town or village</option>
        {onlineLabel && <option value={ONLINE}>{onlineLabel}</option>}
      </Select>
      {city === OTHER && (
        <TextInput name="city_other" aria-label="Town or village" placeholder="Town or village, e.g. Shimla" defaultValue={known ? "" : defaultValue} maxLength={60} required />
      )}
    </div>
  );
}
