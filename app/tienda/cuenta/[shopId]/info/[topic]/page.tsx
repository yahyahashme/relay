import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading, Screen } from "@/components/ui";
import HelpScreen from "./help-screen";

export const metadata: Metadata = { title: "Ayuda · Relay" };

export default function Page() {
  return (
    <Suspense
      fallback={
        <Screen>
          <Loading />
        </Screen>
      }
    >
      <HelpScreen />
    </Suspense>
  );
}
