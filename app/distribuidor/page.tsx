import DashboardScreen from "./dashboard-screen";

// The distributor's panel: the four figures, then the ledger of invoices. Everything on it is read
// in the browser and refreshed every few seconds, so the page itself is only the frame.
export default function Page() {
  return <DashboardScreen />;
}
