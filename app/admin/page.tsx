import type { Metadata } from "next";
import AdminScreen from "./admin-screen";

export const metadata: Metadata = { title: "Administración · Relay" };

// "Reiniciar demo" (#223) signs a few transactions per demo shop.
export const maxDuration = 60;

// Relay's own page: the distributors waiting to be approved. Read in the browser, so the page is only the frame.
export default function Page() {
  return <AdminScreen />;
}
