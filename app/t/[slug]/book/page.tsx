import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

// Saving a spot happens in a sheet on the activity page. This route is kept for old
// links and for coming back from sign-in: it opens that sheet.
export default async function BookPage(props: PageProps<"/t/[slug]/book">) {
  const { slug } = await props.params;
  const { o, src } = await props.searchParams;
  const q = `o=${typeof o === "string" ? o : ""}${src === "feed" ? "&src=feed" : ""}&save=1`;
  await requireUser(`/t/${slug}?${q}`);
  redirect(`/t/${slug}?${q}`);
}
