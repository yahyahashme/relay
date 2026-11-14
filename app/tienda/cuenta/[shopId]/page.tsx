import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading, Screen } from "@/components/ui";
import AccountScreen from "./account-screen";

export const metadata: Metadata = { title: "Mi cuenta · Relay" };

// The id in the URL is only known when the page is opened, so the screen
// waits inside Suspense (Next.js Cache Components).
export default function Page() {
  return (
    <Suspense
      fallback={
        <Screen>
          <Loading />
        </Screen>
      }
    >
      <AccountScreen />
    </Suspense>
  );
}
