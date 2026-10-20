import { Suspense } from "react";
import { LandingPage } from "@/components/LandingPage";

export default function HomePage() {
  // LandingPage reads ?join= from an invite link, which needs a Suspense
  // boundary for static rendering.
  return (
    <Suspense>
      <LandingPage />
    </Suspense>
  );
}
