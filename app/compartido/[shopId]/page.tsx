import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading, Screen } from "@/components/ui";
import SharedScreen from "./shared-screen";

export const metadata: Metadata = { title: "Historial compartido · Relay" };

export default function Page() {
  return (
    <Suspense
      fallback={
        <Screen>
          <Loading />
        </Screen>
      }
    >
      <SharedScreen />
    </Suspense>
  );
}
