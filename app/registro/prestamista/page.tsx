import type { Metadata } from "next";
import { HomeNav } from "@/components/auth";
import { Slip } from "@/components/kit/layout";
import { LenderForm } from "../lender-form";

export const metadata: Metadata = { title: "Prestamista · Relay" };

// A lender signs up (#207), then waits for approval on /prestamista.
export default function LenderSignUpPage() {
  return (
    <Slip>
      <HomeNav />
      <LenderForm />
    </Slip>
  );
}
