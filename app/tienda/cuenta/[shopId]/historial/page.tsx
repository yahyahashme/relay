import { Suspense } from "react";
import { HistoryFrame } from "@/components/shop-history";
import { Loading } from "@/components/kit/states";
import HistoryScreen from "./history-screen";

export default function Page() {
  return (
    <Suspense
      fallback={
        <HistoryFrame>
          <Loading torn={false} lines={6} />
        </HistoryFrame>
      }
    >
      <HistoryScreen />
    </Suspense>
  );
}
