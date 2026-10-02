"use client";

import { useActionState, useState } from "react";
import { Field, FormError, Select, TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { startScenarioAction } from "./actions";

interface Option {
  id: string;
  persona: string;
  title: string;
  script: string;
  setup: string;
}

const PERSONAS = ["Volunteer", "Lapsed volunteer", "NGO coordinator"];

export function StartForm({ scenarios }: { scenarios: Option[] }) {
  const [state, action, pending] = useActionState(startScenarioAction, {});
  const [id, setId] = useState(scenarios[0].id);
  const [persona, setPersona] = useState(scenarios[0].persona);
  const current = scenarios.find((s) => s.id === id)!;
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tester ID" htmlFor="tester_id" hint="e.g. T-V1 for a volunteer, T-N2 for an NGO.">
          <TextInput id="tester_id" name="tester_id" placeholder="T-V1" autoCapitalize="characters" required />
        </Field>
        <Field label="Scenario" htmlFor="scenario">
          <Select
            id="scenario"
            name="scenario"
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              setPersona(scenarios.find((s) => s.id === e.target.value)!.persona);
            }}
          >
            {scenarios.map((s) => <option key={s.id} value={s.id}>{s.id} · {s.title}</option>)}
          </Select>
        </Field>
        <Field label="Persona" htmlFor="persona">
          <Select id="persona" name="persona" value={persona} onChange={(e) => setPersona(e.target.value)}>
            {PERSONAS.map((p) => <option key={p}>{p}</option>)}
          </Select>
        </Field>
      </div>
      <div className="rounded-lg bg-muted px-4 py-3 text-sm">
        <p className="font-medium">Task given to the tester</p>
        <p className="mt-1">“{current.script}”</p>
        <p className="mt-2 text-muted-foreground">{current.setup}</p>
      </div>
      <FormError message={state.error} />
      <Button type="submit" size="tap" disabled={pending}>
        {pending ? "Resetting sample data…" : "Reset data and set up scenario"}
      </Button>
      <p className="text-xs text-muted-foreground">Starting wipes the sample data and rebuilds it in the scenario&apos;s starting state.</p>
    </form>
  );
}
