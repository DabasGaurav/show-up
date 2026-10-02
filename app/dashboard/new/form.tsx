"use client";

import dynamic from "next/dynamic";
import { useActionState, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { ActivityDetails, type ActivityDetailsData } from "@/components/activity-details";
import { CauseIcon } from "@/components/cause-icon";
import { Field, FormError, Segmented, Select, TextArea, TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { CAUSES, CITIES, CITY_NAMES, causeColor } from "@/lib/constants";
import { fmtDayDate, fmtDuration, fmtRepeats, fmtTimeRange, istToDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { postActivityAction, type PostState } from "./actions";

const MapPicker = dynamic(() => import("@/components/map-picker"), { ssr: false, loading: () => <div className="skeleton h-56 w-full" /> });

export interface PostDefaults {
  orgName: string;
  city: string;
  contactName: string;
  contactPhone: string;
  today: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl bg-card p-5" aria-label={title}>
      <h2 className="text-xl">{title}</h2>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}

// Post an activity, with a live preview of what volunteers will see.
export function PostForm({ defaults }: { defaults: PostDefaults }) {
  const [state, action, pending] = useActionState<PostState, FormData>(postActivityAction, {});
  const [tab, setTab] = useState<"form" | "preview">("form");
  const [v, setV] = useState<Record<string, string>>({
    title: "", cause: "", role: "", done_definition: "", date: "", start_time: "", end_time: "", repeats: "", times: "4",
    mode: "onsite", city: defaults.city, address: "", online_link: "",
    lat: String(CITIES[defaults.city]?.lat ?? ""), lng: String(CITIES[defaults.city]?.lng ?? ""),
    people: "5", contact_name: defaults.contactName, contact_phone: defaults.contactPhone,
  });
  const set = (k: string, value: string) =>
    setV((p) => ({ ...p, [k]: value, ...(k === "city" && CITIES[value] ? { lat: String(CITIES[value].lat), lng: String(CITIES[value].lng) } : {}) }));
  const bind = (k: string) => ({
    id: k, name: k, value: v[k], "aria-invalid": state.errors?.[k] ? true : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set(k, e.target.value),
  });
  const err = (k: string) => state.errors?.[k];

  const start = istToDate(v.date, v.start_time || "00:00");
  const end = istToDate(v.date, v.end_time || "00:00");
  const hasDate = v.date !== "" && !Number.isNaN(start.getTime());
  const hasTimes = hasDate && v.start_time !== "" && v.end_time !== "";
  const minutes = hasTimes ? Math.round((end.getTime() - start.getTime()) / 60000) : 0;
  const people = Math.max(1, Number(v.people) || 1);
  const repeats = v.repeats === "on";
  const online = v.mode === "online";

  const preview: ActivityDetailsData = {
    title: v.title, cause: v.cause, orgName: defaults.orgName, orgChecked: true,
    when: [hasDate ? fmtDayDate(start) : "", hasTimes ? fmtTimeRange(start, end) : ""].filter(Boolean).join(" · "),
    duration: minutes > 0 ? fmtDuration(minutes) : "",
    online, place: [v.address, online ? "" : v.city].filter(Boolean).join(", "),
    role: v.role, done: v.done_definition, repeats: fmtRepeats(repeats ? Number(v.times) || 0 : 1, start),
    contact: v.contact_name, needed: people, taken: 0,
  };

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-muted p-1 lg:hidden" role="tablist">
        {(["form", "preview"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("min-h-11 rounded-full text-sm font-semibold", tab === t && "bg-card text-primary shadow-card")}>
            {t === "form" ? "Fill in" : "Preview"}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <form action={action} className={cn("space-y-5", tab === "preview" && "hidden lg:block")} noValidate>
          <input type="hidden" name="cause" value={v.cause} />
          <input type="hidden" name="people" value={people} />
          <input type="hidden" name="repeats" value={v.repeats} />

          <Section title="The activity">
            <Field label="Title" htmlFor="title" error={err("title")}>
              <TextInput {...bind("title")} maxLength={80} placeholder="e.g. Pack 200 ration kits" />
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
                    style={v.cause === c ? { background: causeColor(c) } : undefined}
                  >
                    <CauseIcon cause={c} className="size-4" />
                    {c}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="What volunteers will do" htmlFor="role" error={err("role")}>
              <TextInput {...bind("role")} maxLength={90} placeholder="e.g. Sort and pack rice, dal and oil" />
            </Field>
            <Field label="You're done when…" htmlFor="done_definition" error={err("done_definition")}>
              <TextArea {...bind("done_definition")} maxLength={200} placeholder="e.g. All 200 kits are packed and stacked" />
            </Field>
          </Section>

          <Section title="When">
            <Field label="Date" htmlFor="date" error={err("date")}><TextInput {...bind("date")} type="date" min={defaults.today} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start" htmlFor="start_time"><TextInput {...bind("start_time")} type="time" /></Field>
              <Field label="End" htmlFor="end_time" error={err("end_time")}><TextInput {...bind("end_time")} type="time" /></Field>
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 font-medium">
              <input type="checkbox" checked={repeats} onChange={(e) => set("repeats", e.target.checked ? "on" : "")} className="size-5 accent-[#0f5257]" />
              Repeats every week
            </label>
            {repeats && (
              <Field label="For how many weeks?" htmlFor="times" error={err("times")}>
                <TextInput {...bind("times")} type="number" inputMode="numeric" min={2} max={26} className="max-w-32" />
              </Field>
            )}
          </Section>

          <Section title="Where">
            <Segmented name="mode" value={v.mode} onChange={(x) => set("mode", x)} options={[{ value: "onsite", label: "On-site" }, { value: "online", label: "Online" }]} />
            {online ? (
              <Field label="Link" htmlFor="online_link" error={err("online_link")} hint="Volunteers get it once they're confirmed.">
                <TextInput {...bind("online_link")} type="url" inputMode="url" placeholder="https://" />
              </Field>
            ) : (
              <>
                <Field label="City" htmlFor="city" error={err("city")}>
                  <Select {...bind("city")}>{CITY_NAMES.map((c) => <option key={c}>{c}</option>)}</Select>
                </Field>
                <Field label="Address" htmlFor="address" error={err("address")} hint="Then tap the map to drop the pin on the exact spot.">
                  <TextInput {...bind("address")} maxLength={160} placeholder="e.g. Community hall, Sector 12" />
                </Field>
                <MapPicker lat={Number(v.lat)} lng={Number(v.lng)} onChange={(lat, lng) => setV((p) => ({ ...p, lat: String(lat), lng: String(lng) }))} />
                <input type="hidden" name="lat" value={v.lat} />
                <input type="hidden" name="lng" value={v.lng} />
              </>
            )}
          </Section>

          <Section title="How many people">
            <div className="flex items-center gap-4" role="group" aria-label="How many people">
              <button type="button" aria-label="One fewer" onClick={() => set("people", String(Math.max(1, people - 1)))} className="flex size-12 items-center justify-center rounded-full border bg-card text-primary"><Minus aria-hidden /></button>
              <output className="font-heading w-12 text-center text-3xl font-bold" aria-live="polite">{people}</output>
              <button type="button" aria-label="One more" onClick={() => set("people", String(Math.min(500, people + 1)))} className="flex size-12 items-center justify-center rounded-full border bg-card text-primary"><Plus aria-hidden /></button>
            </div>
            {err("people") && <p role="alert" className="text-sm font-medium text-gap">{err("people")}</p>}
          </Section>

          <Section title="Contact on the day">
            <Field label="Name" htmlFor="contact_name" error={err("contact_name")}><TextInput {...bind("contact_name")} /></Field>
            <Field label="Phone" htmlFor="contact_phone" error={err("contact_phone")} hint="Volunteers see it once they're confirmed.">
              <TextInput {...bind("contact_phone")} type="tel" inputMode="numeric" />
            </Field>
          </Section>

          <FormError message={state.message} />
          <Button type="submit" size="tap" className="h-14 w-full text-lg" disabled={pending}>{pending ? "Posting…" : "Post and get my link"}</Button>
        </form>

        <aside className={cn("lg:sticky lg:top-4 lg:self-start", tab === "form" && "hidden lg:block")}>
          <p className="mb-2 font-semibold">This is what volunteers will see.</p>
          <ActivityDetails data={preview} heading="h2" />
          <Button type="button" variant="outline" size="tap" className="mt-3 w-full lg:hidden" onClick={() => setTab("form")}>Back to filling in</Button>
        </aside>
      </div>
    </div>
  );
}
