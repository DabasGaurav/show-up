"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// OpenStreetMap + Leaflet (no paid keys, PRD §14). Tap the map or drag the pin.

const pin = L.divIcon({
  className: "",
  html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#1f3864;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);transform:rotate(-45deg)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

export default function MapPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  });

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { scrollWheelZoom: false }).setView([lat, lng], 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    const mk = L.marker([lat, lng], { icon: pin, draggable: true, keyboard: true, title: "Task location" }).addTo(m);
    const round = (n: number) => Math.round(n * 1e5) / 1e5;
    mk.on("dragend", () => {
      const p = mk.getLatLng();
      cb.current(round(p.lat), round(p.lng));
    });
    m.on("click", (e) => {
      mk.setLatLng(e.latlng);
      cb.current(round(e.latlng.lat), round(e.latlng.lng));
    });
    map.current = m;
    marker.current = mk;
    return () => {
      m.remove();
      map.current = null;
      marker.current = null;
    };
    // The map is created once; later position changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow outside changes (e.g. the city select) without recreating the map.
  useEffect(() => {
    const mk = marker.current;
    if (!mk || !map.current) return;
    const p = mk.getLatLng();
    if (Math.abs(p.lat - lat) > 1e-6 || Math.abs(p.lng - lng) > 1e-6) {
      mk.setLatLng([lat, lng]);
      map.current.setView([lat, lng], 13);
    }
  }, [lat, lng]);

  return <div ref={el} className="z-0 h-56 w-full overflow-hidden rounded-lg border" aria-label="Map: tap to set the task location" />;
}
