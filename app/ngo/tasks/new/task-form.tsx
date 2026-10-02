"use client";

import dynamic from "next/dynamic";
import { useActionState, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { CauseIcon } from "@/components/cause-icon";
import { Field, FormError, Segmented, Select, TextArea, TextInput } from "@/components/forms/field";
import { TaskCard, type TaskCardData } from "@/components/task-card";
import { Button } from "@/components/ui/button";
import { CAUSES, CITIES, CITY_NAMES, causeUi } from "@/lib/constants";
import { fmtCommitment, fmtDayDate, fmtDuration, fmtTimeRange, istToDate } from "@/lib/format";
import { RULES } from "@/lib/rules/config";
import { cn } from "@/lib/utils";
import { publishTaskAction, type TaskFormState } from "./actions";

const MapPicker = dynamic(() => import("@/components/map-picker"), {
  ssr: false,
  loading: () => <div className="skeleton h-56 w-full" />,
});

export interface TaskFormDefaults {
  orgName: string;
  orgVerified: boolean;
  city: string;
  contactName: string;
  contactRole: string;
  contactPhone: string;
  minDate: string;
  /** Server time the form was opened (used to time how long posting takes). */
  openedAt: number;
}

type Values = Record<string, string>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl bg-card p-5" aria-label={title}>
      <h2 className="text-xl">{title}</h2>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}

// Post a need (brief B8).
export function TaskForm({ defaults, showTrust, showApproval }: { defaults: TaskFormDefaults; showTrust: boolean; showApproval: boolean }) {
  const [state, action, pending] = useActionState<TaskFormState, FormData>(publishTaskAction, {});
  const [tab, setTab] = useState<"form" | "preview">("form");
  const [v, setV] = useState<Values>(() => ({
    cause: "", title: "", role: "", done_definition: "",
    date: "", start_time: "", end_time: "",
    commitment: "one_off", recurrence_rule: "weekly", occurrences: "4",
    mode: "onsite", city: defaults.city, address: "", online_link: "",
    lat: String(CITIES[defaults.city]?.lat ?? ""), lng: String(CITIES[defaults.city]?.lng ?? ""),
    slots_needed: "5", min_trust: "everyone", booking_mode: "instant",
    contact_name: defaults.contactName, contact_role: defaults.contactRole, contact_phone: defaults.contactPhone,
  }));
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
  const people = Math.max(1, Number(v.slots_needed) || 1);
  const repeats = v.commitment === "recurring";

  const preview: TaskCardData = {
    title: v.title,
    cause: v.cause,
    orgName: defaults.orgName,
    orgVerified: defaults.orgVerified,
    date: hasDate ? fmtDayDate(start) : "",
    time: hasTimes ? fmtTimeRange(start, end) : "",
    mode: v.mode === "online" ? "online" : "onsite",
    place: [v.address, v.mode === "onsite" ? v.city : ""].filter(Boolean).join(", "),
    role: v.role,
    duration: durationMin > 0 ? fmtDuration(durationMin) : "",
    commitment: fmtCommitment(v.commitment as "one_off" | "recurring", v.recurrence_rule, Number(v.occurrences) || 0, start),
    done: v.done_definition,
    contact: [v.contact_name, v.contact_role].filter(Boolean).join(", ") + (v.contact_name ? " · number shared once you're confirmed" : ""),
    seatsLeft: people,
    slotsNeeded: people,
    whoCanBook: [
      v.min_trust === "verified" ? "For volunteers whose ID we've checked" : v.min_trust === "trusted" ? "For Regulars: checked, and came 3 times" : "",
      v.booking_mode === "approval" ? "The NGO says yes to each person" : "",
    ].filter(Boolean).join(" · "),
  };

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-muted p-1 lg:hidden" role="tablist">
        {(["form", "preview"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn("min-h-11 rounded-full text-sm font-semibold", tab === t && "bg-card text-primary shadow-card")}
          >
            {t === "form" ? "Fill in" : "Preview"}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <form action={action} className={cn("space-y-5", tab === "preview" && "hidden lg:block")} noValidate>
          <input type="hidden" name="opened_at" value={defaults.openedAt} />
          <input type="hidden" name="edited_fields" value={edited.join(",")} />
          <input type="hidden" name="cause" value={v.cause} />
          <input type="hidden" name="commitment" value={v.commitment} />
          <input type="hidden" name="slots_needed" value={people} />

          <Section title="The activity">
            <Field label="Title" htmlFor="title" error={err("title")}>
              <TextInput {...bind("title")} maxLength={80} placeholder="e.g. Pack ration kits for 200 families" />
            </Field>
            <Field label="Cause" error={err("cause")}>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cause">
                {CAUSES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={v.cause === c}
                    onClick={() => set("cause", c)}
                    className={cn("flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm", v.cause === c ? "border-primary font-semibold text-primary" : "bg-card")}
                    style={v.cause === c ? { background: causeUi(c).color } : undefined}
                  >
                    <CauseIcon cause={c} className="size-4" />
                    {causeUi(c).label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="What volunteers will do" htmlFor="role" error={err("role")}>
              <TextInput {...bind("role")} maxLength={80} placeholder="e.g. Sort and pack rice, dal and oil" />
            </Field>
            <Field
              label="When is it done?"
              htmlFor="done_definition"
              error={err("done_definition")}
              warning={doneShort ? "A little more detail here saves you a call later." : undefined}
            >
              <TextArea {...bind("done_definition")} maxLength={300} placeholder="e.g. All 200 kits packed and stacked" />
            </Field>
          </Section>

          <Section title="When">
            <Field label="Date" htmlFor="date" error={err("date")}>
              <TextInput {...bind("date")} type="date" min={defaults.minDate} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start" htmlFor="start_time"><TextInput {...bind("start_time")} type="time" /></Field>
              <Field label="End" htmlFor="end_time" error={err("end_time")}><TextInput {...bind("end_time")} type="time" /></Field>
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 font-medium">
              <input type="checkbox" checked={repeats} onChange={(e) => set("commitment", e.target.checked ? "recurring" : "one_off")} className="size-5 accent-[#0f5257]" />
              This repeats
            </label>
            {repeats && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="How often" htmlFor="recurrence_rule" error={err("recurrence_rule")}>
                  <Select {...bind("recurrence_rule")}>
                    <option value="weekly">Every week</option>
                    <option value="fortnightly">Every 2 weeks</option>
                  </Select>
                </Field>
                <Field label="How many times" htmlFor="occurrences" error={err("occurrences")}>
                  <TextInput {...bind("occurrences")} type="number" inputMode="numeric" min={2} max={26} />
                </Field>
              </div>
            )}
          </Section>

          <Section title="Where">
            <Segmented name="mode" value={v.mode} onChange={(x) => set("mode", x)} options={[{ value: "onsite", label: "At a place" }, { value: "online", label: "Online" }]} />
            {v.mode === "onsite" ? (
              <>
                <Field label="City" htmlFor="city" error={err("city")}>
                  <Select {...bind("city")}>{CITY_NAMES.map((c) => <option key={c}>{c}</option>)}</Select>
                </Field>
                <Field label="Address" htmlFor="address" error={err("address")} hint="Then tap the map to drop the pin on the exact spot.">
                  <TextInput {...bind("address")} maxLength={160} autoComplete="street-address" placeholder="e.g. Community hall, Sector 12" />
                </Field>
                <MapPicker lat={Number(v.lat)} lng={Number(v.lng)} onChange={(lat, lng) => setV((p) => ({ ...p, lat: String(lat), lng: String(lng) }))} />
                <input type="hidden" name="lat" value={v.lat} />
                <input type="hidden" name="lng" value={v.lng} />
              </>
            ) : (
              <Field label="Link" htmlFor="online_link" error={err("online_link")} hint="Volunteers see it once they're confirmed.">
                <TextInput {...bind("online_link")} type="url" inputMode="url" placeholder="https://" />
              </Field>
            )}
          </Section>

          <Section title="How many people">
            <div className="flex items-center gap-4" role="group" aria-label="How many people">
              <button type="button" aria-label="One fewer" onClick={() => set("slots_needed", String(Math.max(1, people - 1)))} className="flex size-12 items-center justify-center rounded-full border bg-card text-primary"><Minus aria-hidden /></button>
              <output className="font-heading w-12 text-center text-3xl font-bold" aria-live="polite">{people}</output>
              <button type="button" aria-label="One more" onClick={() => set("slots_needed", String(Math.min(500, people + 1)))} className="flex size-12 items-center justify-center rounded-full border bg-card text-primary"><Plus aria-hidden /></button>
            </div>
            {err("slots_needed") && <p role="alert" className="text-sm font-medium text-gap">{err("slots_needed")}</p>}
            {showTrust && (
              <Field label="Who can join" htmlFor="min_trust">
                <Select {...bind("min_trust")}>
                  <option value="everyone">Anyone</option>
                  <option value="verified">Only people whose ID we&apos;ve checked</option>
                  <option value="trusted">Only Regulars</option>
                </Select>
              </Field>
            )}
            {showApproval && (
              <Field label="How people join">
                <Segmented name="booking_mode" value={v.booking_mode} onChange={(x) => set("booking_mode", x)} options={[{ value: "instant", label: "Straight in" }, { value: "approval", label: "I say yes first" }]} />
              </Field>
            )}
          </Section>

          <Section title="Who to contact on the day">
            <Field label="Name" htmlFor="contact_name" error={err("contact_name")}><TextInput {...bind("contact_name")} /></Field>
            <Field label="Role" htmlFor="contact_role" error={err("contact_role")}><TextInput {...bind("contact_role")} placeholder="e.g. Coordinator" /></Field>
            <Field label="Phone" htmlFor="contact_phone" error={err("contact_phone")} hint="Volunteers see it once they're confirmed.">
              <TextInput {...bind("contact_phone")} type="tel" inputMode="numeric" />
            </Field>
          </Section>

          <FormError message={state.message} />
          <Button type="submit" size="tap" className="h-14 w-full text-lg" disabled={pending}>
            {pending ? "Posting…" : "Post and get my link"}
          </Button>
        </form>

        <aside className={cn("lg:sticky lg:top-4 lg:self-start", tab === "form" && "hidden lg:block")}>
          <p className="mb-2 font-semibold">This is what volunteers will see.</p>
          <TaskCard data={preview} heading="h2" />
          <Button type="button" variant="outline" size="tap" className="mt-3 w-full lg:hidden" onClick={() => setTab("form")}>Back to filling in</Button>
        </aside>
      </div>
    </div>
  );
}
