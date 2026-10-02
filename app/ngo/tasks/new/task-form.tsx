"use client";

import dynamic from "next/dynamic";
import { useActionState, useState } from "react";
import { Field, FormError, Segmented, Select, TextArea, TextInput } from "@/components/forms/field";
import { TaskCard, type TaskCardData } from "@/components/task-card";
import { Button } from "@/components/ui/button";
import { CAUSES, CITIES, CITY_NAMES, MIN_TRUST_LABEL, RECURRENCE } from "@/lib/constants";
import { fmtCommitment, fmtDate, fmtDuration, fmtTimeRange, istToDate } from "@/lib/format";
import { RULES } from "@/lib/rules/config";
import { cn } from "@/lib/utils";
import { publishTaskAction, type TaskFormState } from "./actions";

const MapPicker = dynamic(() => import("@/components/map-picker"), {
  ssr: false,
  loading: () => <div className="h-56 w-full animate-pulse rounded-lg border bg-muted" />,
});

export interface TaskFormDefaults {
  orgName: string;
  orgVerified: boolean;
  city: string;
  contactName: string;
  contactPhone: string;
  minDate: string;
  /** Server time the template was opened (SH6 timer). */
  openedAt: number;
}

type Values = Record<string, string>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-xl border bg-card p-4">
      <legend className="px-1 text-sm font-semibold text-brand">{title}</legend>
      {children}
    </fieldset>
  );
}

export function TaskForm({
  defaults,
  showTrust,
  showApproval,
}: {
  defaults: TaskFormDefaults;
  showTrust: boolean;
  showApproval: boolean;
}) {
  const [state, action, pending] = useActionState<TaskFormState, FormData>(publishTaskAction, {});
  const [tab, setTab] = useState<"form" | "preview">("form");
  const [v, setV] = useState<Values>(() => ({
    cause: "", title: "", role: "", done_definition: "",
    date: "", start_time: "", end_time: "",
    commitment: "one_off", recurrence_rule: "weekly", occurrences: "4",
    mode: "onsite", city: defaults.city, address: "", online_link: "",
    lat: String(CITIES[defaults.city]?.lat ?? ""), lng: String(CITIES[defaults.city]?.lng ?? ""),
    slots_needed: "", min_trust: "everyone", booking_mode: "instant",
    contact_name: defaults.contactName, contact_role: "", contact_phone: defaults.contactPhone,
  }));
  // SH6 evidence: which fields the coordinator touched.
  const [edited, setEdited] = useState<string[]>([]);

  const set = (k: string, value: string) => {
    setEdited((prev) => (prev.includes(k) ? prev : [...prev, k]));
    setV((prev) => {
      const next = { ...prev, [k]: value };
      if (k === "city" && CITIES[value]) {
        next.lat = String(CITIES[value].lat);
        next.lng = String(CITIES[value].lng);
      }
      return next;
    });
  };
  const bind = (k: string) => ({
    id: k,
    name: k,
    value: v[k],
    "aria-invalid": state.errors?.[k] ? true : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set(k, e.target.value),
  });
  const err = (k: string) => state.errors?.[k];

  const start = istToDate(v.date, v.start_time || "00:00");
  const end = istToDate(v.date, v.end_time || "00:00");
  const hasDate = v.date !== "" && !Number.isNaN(start.getTime());
  const hasTimes = hasDate && v.start_time !== "" && v.end_time !== "";
  const durationMin = hasTimes ? Math.round((end.getTime() - start.getTime()) / 60000) : 0;
  const doneShort = v.done_definition.trim().length > 0 && v.done_definition.trim().length < RULES.doneDefinitionMinChars;

  const preview: TaskCardData = {
    title: v.title,
    cause: v.cause,
    orgName: defaults.orgName,
    orgVerified: defaults.orgVerified,
    date: hasDate ? fmtDate(start) : "",
    time: hasTimes ? fmtTimeRange(start, end) : "",
    mode: v.mode === "online" ? "online" : "onsite",
    place: [v.address, v.mode === "onsite" ? v.city : ""].filter(Boolean).join(", "),
    role: v.role,
    duration: durationMin > 0 ? fmtDuration(durationMin) : "",
    commitment: fmtCommitment(v.commitment as "one_off" | "recurring", v.recurrence_rule, Number(v.occurrences) || 0, start),
    done: v.done_definition,
    contact: v.contact_role,
    seatsLeft: Number(v.slots_needed) || 0,
    slotsNeeded: Number(v.slots_needed) || 0,
    whoCanBook: MIN_TRUST_LABEL[(v.min_trust as keyof typeof MIN_TRUST_LABEL) ?? "everyone"] +
      (v.booking_mode === "approval" ? " · NGO approves each request" : ""),
  };

  return (
    <div>
      {/* Mobile: Edit / Preview tabs. Desktop: side by side. */}
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg border bg-muted p-1 lg:hidden" role="tablist">
        {(["form", "preview"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn("min-h-11 rounded-md text-sm font-medium", tab === t && "bg-card text-brand shadow-sm")}
          >
            {t === "form" ? "Edit" : "Preview"}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <form action={action} className={cn("space-y-5", tab === "preview" && "hidden lg:block")} noValidate>
          <input type="hidden" name="opened_at" value={defaults.openedAt} />
          <input type="hidden" name="edited_fields" value={edited.join(",")} />

          <Section title="What">
            <Field label="Cause" htmlFor="cause" error={err("cause")}>
              <Select {...bind("cause")}>
                <option value="" disabled>Choose a cause</option>
                {CAUSES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Title" htmlFor="title" error={err("title")} hint="e.g. Saturday reading circle for Class 4">
              <TextInput {...bind("title")} maxLength={80} />
            </Field>
            <Field label="Role" htmlFor="role" error={err("role")} hint="What the volunteer will do, in a few words.">
              <TextInput {...bind("role")} maxLength={80} />
            </Field>
            <Field
              label="What “done” means"
              htmlFor="done_definition"
              error={err("done_definition")}
              warning={doneShort ? "this is very short. A clear finish line means fewer briefing calls." : undefined}
              hint="How will a volunteer know they've finished?"
            >
              <TextArea {...bind("done_definition")} maxLength={300} />
            </Field>
          </Section>

          <Section title="When">
            <Field label="Date" htmlFor="date" error={err("date")}>
              <TextInput {...bind("date")} type="date" min={defaults.minDate} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start" htmlFor="start_time">
                <TextInput {...bind("start_time")} type="time" />
              </Field>
              <Field label="End" htmlFor="end_time" error={err("end_time")}>
                <TextInput {...bind("end_time")} type="time" />
              </Field>
            </div>
            <Field label="Commitment">
              <Segmented
                name="commitment"
                value={v.commitment}
                onChange={(x) => set("commitment", x)}
                options={[{ value: "one_off", label: "One-off" }, { value: "recurring", label: "Recurring" }]}
              />
            </Field>
            {v.commitment === "recurring" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Repeats" htmlFor="recurrence_rule" error={err("recurrence_rule")}>
                  <Select {...bind("recurrence_rule")}>
                    {Object.entries(RECURRENCE).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
                  </Select>
                </Field>
                <Field label="Sessions" htmlFor="occurrences" error={err("occurrences")}>
                  <TextInput {...bind("occurrences")} type="number" inputMode="numeric" min={2} max={26} />
                </Field>
              </div>
            )}
          </Section>

          <Section title="Where">
            <Segmented
              name="mode"
              value={v.mode}
              onChange={(x) => set("mode", x)}
              options={[{ value: "onsite", label: "On-site" }, { value: "online", label: "Online" }]}
            />
            {v.mode === "onsite" ? (
              <>
                <Field label="City" htmlFor="city" error={err("city")}>
                  <Select {...bind("city")}>
                    {CITY_NAMES.map((c) => <option key={c}>{c}</option>)}
                  </Select>
                </Field>
                <Field label="Address" htmlFor="address" error={err("address")} hint="Tap the map or drag the pin to the exact spot.">
                  <TextInput {...bind("address")} maxLength={160} autoComplete="street-address" />
                </Field>
                <MapPicker
                  lat={Number(v.lat)}
                  lng={Number(v.lng)}
                  onChange={(lat, lng) => setV((p) => ({ ...p, lat: String(lat), lng: String(lng) }))}
                />
                <input type="hidden" name="lat" value={v.lat} />
                <input type="hidden" name="lng" value={v.lng} />
              </>
            ) : (
              <Field label="Online link" htmlFor="online_link" error={err("online_link")} hint="Volunteers see this only after they book.">
                <TextInput {...bind("online_link")} type="url" inputMode="url" placeholder="https://" />
              </Field>
            )}
          </Section>

          <Section title="Who">
            <Field label="Slots needed" htmlFor="slots_needed" error={err("slots_needed")}>
              <TextInput {...bind("slots_needed")} type="number" inputMode="numeric" min={1} max={500} />
            </Field>
            {showTrust && (
              <Field label="Open to" htmlFor="min_trust" hint="Verified: ID checked. Trusted: 3 slots attended, no no-shows.">
                <Select {...bind("min_trust")}>
                  <option value="everyone">Everyone</option>
                  <option value="verified">Verified volunteers only</option>
                  <option value="trusted">Trusted volunteers only</option>
                </Select>
              </Field>
            )}
            {showApproval && (
              <Field label="Booking" hint="With approval, you decide within 48 hours or the request auto-releases.">
                <Segmented
                  name="booking_mode"
                  value={v.booking_mode}
                  onChange={(x) => set("booking_mode", x)}
                  options={[{ value: "instant", label: "Instant booking" }, { value: "approval", label: "Approval required" }]}
                />
              </Field>
            )}
          </Section>

          <Section title="Contact">
            <Field label="Name" htmlFor="contact_name" error={err("contact_name")}>
              <TextInput {...bind("contact_name")} />
            </Field>
            <Field label="Role" htmlFor="contact_role" error={err("contact_role")} hint="Shown before booking, e.g. Volunteer coordinator.">
              <TextInput {...bind("contact_role")} />
            </Field>
            <Field label="Phone" htmlFor="contact_phone" error={err("contact_phone")} hint="Shown to volunteers only after they book.">
              <TextInput {...bind("contact_phone")} type="tel" inputMode="numeric" />
            </Field>
          </Section>

          <FormError message={state.message} />
          <Button type="submit" size="tap" className="w-full" disabled={pending}>
            {pending ? "Publishing…" : "Publish task"}
          </Button>
        </form>

        <aside className={cn("lg:sticky lg:top-4 lg:self-start", tab === "form" && "hidden lg:block")}>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Live preview · what volunteers see
          </p>
          <TaskCard data={preview} heading="h2" />
          <Button type="button" variant="outline" size="tap" className="mt-3 w-full lg:hidden" onClick={() => setTab("form")}>
            Back to editing
          </Button>
        </aside>
      </div>
    </div>
  );
}
