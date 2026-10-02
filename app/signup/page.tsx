import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth";

// Sign-up and sign-in are one page now. Old links land there.
export default async function SignUpPage(props: PageProps<"/signup">) {
  const { next } = await props.searchParams;
  redirect(`/signin?next=${encodeURIComponent(safeNext(typeof next === "string" ? next : null, "/account"))}`);
}
