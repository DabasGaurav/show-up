import type { Metadata } from "next";
import { demoApplicants } from "@/lib/demo";
import { Applicants } from "./applicants";

export const metadata: Metadata = { title: "People who joined" };

export default function DemoApplicants() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-4">
      <p className="text-sm font-semibold text-primary">Mamta Shishu Ashray · Play and story time</p>
      <h1 className="mt-1 text-4xl leading-10">5 people want to help on Saturday.</h1>
      <Applicants people={demoApplicants} />
    </main>
  );
}
