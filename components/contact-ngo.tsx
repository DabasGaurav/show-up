"use client";

import { useActionState, useState } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { contactNgoAction } from "@/app/actions/ratings";
import { trackAction } from "@/app/actions/track";
import { FormError, TextArea } from "@/components/forms/field";
import { Button } from "@/components/ui/button";

/** Secondary action on the task page. Tapping it is logged for SH1 (§6.1 Screen 3). */
export function ContactNgo({ taskId, orgName }: { taskId: string; orgName: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(contactNgoAction, {});
  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="tap"
        className="w-full"
        onClick={() => {
          setOpen(true);
          void trackAction("contact_ngo_tapped", { task_id: taskId });
        }}
      >
        <MessageCircleQuestion aria-hidden />
        Contact NGO
      </Button>
    );
  }
  if (state.sent) {
    return (
      <p role="status" className="rounded-lg bg-ok-soft px-4 py-3 text-sm font-medium text-ok">
        Sent to {orgName}. They&apos;ll reply on WhatsApp.
      </p>
    );
  }
  return (
    <form action={action} className="space-y-3 rounded-xl border bg-card p-4">
      <input type="hidden" name="task_id" value={taskId} />
      <label htmlFor="contact-message" className="block text-sm font-medium">Message to {orgName}</label>
      <TextArea id="contact-message" name="message" placeholder="Ask anything the task card doesn't answer." maxLength={500} autoFocus />
      <FormError message={state.error} />
      <div className="flex gap-2">
        <Button type="submit" size="tap" disabled={pending}>{pending ? "Sending…" : "Send"}</Button>
        <Button type="button" variant="ghost" size="tap" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
