"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { resetDemo } from "@/components/demo/store";

/** Hidden reset: back to the start state. */
export default function DemoReset() {
  const router = useRouter();
  useEffect(() => {
    resetDemo();
    router.replace("/demo");
  }, [router]);
  return <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8"><div className="skeleton h-24 w-full" /></main>;
}
