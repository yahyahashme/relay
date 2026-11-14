import { Suspense } from "react";
import { Loading } from "@/components/kit/states";
import SharedScreen, { SharedFrame } from "./shared-screen";

export default function Page() {
  return (
    <Suspense
      fallback={
        <SharedFrame>
          <Loading lines={6} />
        </SharedFrame>
      }
    >
      <SharedScreen />
    </Suspense>
  );
}
