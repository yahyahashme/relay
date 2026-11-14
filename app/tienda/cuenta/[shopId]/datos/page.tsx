import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading, Screen } from "@/components/ui";
import ProfileScreen from "./profile-screen";

export const metadata: Metadata = { title: "Mis datos · Relay" };

export default function Page() {
  return (
    <Suspense
      fallback={
        <Screen>
          <Loading />
        </Screen>
      }
    >
      <ProfileScreen />
    </Suspense>
  );
}
