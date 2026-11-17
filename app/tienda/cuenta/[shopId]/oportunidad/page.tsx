import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/kit/states";
import { AccountPage } from "../account-page";
import AppealScreen from "./appeal-screen";

export const metadata: Metadata = { title: "Pedir otra oportunidad · Relay" };

export default function Page() {
  return (
    <Suspense
      fallback={
        <AccountPage>
          <Loading torn={false} lines={5} />
        </AccountPage>
      }
    >
      <AppealScreen />
    </Suspense>
  );
}
