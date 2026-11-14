import { Suspense } from "react";
import { Loading } from "@/components/kit/states";
import { AccountPage } from "../../account-page";
import HelpScreen from "./help-screen";

export default function Page() {
  return (
    <Suspense
      fallback={
        <AccountPage>
          <Loading />
        </AccountPage>
      }
    >
      <HelpScreen />
    </Suspense>
  );
}
