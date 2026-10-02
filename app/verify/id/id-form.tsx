"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { Field, Select } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { submitIdAction } from "./actions";

export function IdForm({ next, idTypes }: { next: string; idTypes: readonly string[] }) {
  const [fileName, setFileName] = useState<string | null>(null);
  return (
    <form action={submitIdAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="ID type" htmlFor="id_type">
        <Select id="id_type" name="id_type" defaultValue={idTypes[0]}>
          {idTypes.map((t) => <option key={t}>{t}</option>)}
        </Select>
      </Field>
      <Field label="Photo of your ID" htmlFor="id_photo" hint="Prototype: the photo stays on your phone. Nothing is uploaded or stored.">
        {/* No `name`: the file is never sent to the server. */}
        <label
          htmlFor="id_photo"
          className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted px-3 py-4 text-center text-sm"
        >
          <ImageIcon className="size-6 text-brand" aria-hidden />
          {fileName ? <span className="font-medium break-all">{fileName} · ready</span> : <span>Take a photo or choose a file</span>}
        </label>
        <input
          id="id_photo"
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </Field>
      <Button type="submit" size="tap" className="w-full">Submit for review</Button>
    </form>
  );
}
