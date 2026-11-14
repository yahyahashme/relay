import { Suspense } from "react";
import { Loading } from "@/components/kit/states";
import { AccountPage } from "../account-page";
import ProfileScreen from "./profile-screen";

export default function Page() {
  return (
    <Suspense
      fallback={
        <AccountPage>
          <Loading torn={false} lines={5} />
        </AccountPage>
      }
    >
      <ProfileScreen />
    </Suspense>
  );
}
