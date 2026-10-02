import { MailCheck } from "lucide-react";

/** Shown after sign-up or sign-in: the link is in the inbox. */
export function CheckEmail({ email, link }: { email?: string; link?: string | null }) {
  return (
    <div role="status" className="text-center">
      <MailCheck className="mx-auto size-10 text-primary" aria-hidden />
      <h2 className="mt-3 text-2xl">Check your email.</h2>
      <p className="mt-1 text-ink-soft">We sent a link to {email}. Tap it to carry on.</p>
      {link && (
        <p className="mt-4 rounded-xl bg-accent-soft p-3 text-sm">
          No email is set up on this computer, so here it is: <a href={link} className="font-semibold text-primary underline underline-offset-2">open my link</a>
        </p>
      )}
    </div>
  );
}
