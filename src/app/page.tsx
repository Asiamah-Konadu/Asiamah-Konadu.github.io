import { Suspense } from "react";
import { connection } from "next/server";
import Storefront from "@/components/Storefront";

export default async function HomePage() {
  await connection();

  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--cream)" }} />}>
      <Storefront />
    </Suspense>
  );
}
