import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading, Screen } from "@/components/ui";
import HistoryScreen from "./history-screen";

export const metadata: Metadata = { title: "Historial · Relay" };

export default function Page() {
  return (
    <Suspense
      fallback={
        <Screen>
          <Loading />
        </Screen>
      }
    >
      <HistoryScreen />
    </Suspense>
  );
}
