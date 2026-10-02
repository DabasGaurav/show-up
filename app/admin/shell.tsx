import Link from "next/link";
import { Brand } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { lockAction } from "./actions";

/** The frame around every admin page. */
export function AdminShell({ children, backTo }: { children: React.ReactNode; backTo?: string }) {
  return (
    <>
      <header>
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Brand />
          <form action={lockAction}><Button type="submit" variant="ghost" size="tap">Lock</Button></form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-2">
        {backTo && <Link href={backTo} className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-2">← Admin</Link>}
        {children}
      </main>
    </>
  );
}

export const adminError = (e: string | string[] | undefined) =>
  typeof e === "string" && e ? <p role="alert" className="mt-4 rounded-xl bg-gap-soft px-4 py-3 font-medium text-gap">{e}</p> : null;
