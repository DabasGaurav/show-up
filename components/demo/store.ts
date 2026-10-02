"use client";

import { useCallback, useSyncExternalStore } from "react";

// What a tester does in demo mode lives only in their own browser, and
// /demo/reset clears it. Nothing is sent anywhere.

export interface DemoState {
  saved: string[];
  decisions: Record<string, "accept" | "decline">;
  standbyOn: boolean;
  offer: "open" | "taken" | "passed";
  checked: 0 | 1 | 2 | 3;
  nudgeGone: boolean;
  planned: number | null;
}

export const START: DemoState = { saved: [], decisions: {}, standbyOn: false, offer: "open", checked: 0, nudgeGone: false, planned: null };
const KEY = "showup-demo";
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: DemoState } = { raw: null, value: START };

function read(): DemoState {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return START; // storage blocked: the demo still works for this page view
  }
  if (raw !== cache.raw) {
    try {
      cache = { raw, value: raw ? { ...START, ...JSON.parse(raw) } : START };
    } catch {
      cache = { raw, value: START };
    }
  }
  return cache.value;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
}

export function resetDemo() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((l) => l());
}

export function useDemo(): [DemoState, (patch: Partial<DemoState>) => void] {
  const state = useSyncExternalStore(subscribe, read, () => START);
  const update = useCallback((patch: Partial<DemoState>) => {
    const next = { ...read(), ...patch };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      cache = { raw: JSON.stringify(next), value: next };
    }
    listeners.forEach((l) => l());
  }, []);
  return [state, update];
}
