import { Suspense } from "react";
import Storefront from "@/components/Storefront";

export default function HomePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--cream)" }} />}>
      <Storefront />
    </Suspense>
  );
}
