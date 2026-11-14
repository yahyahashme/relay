"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Shell, type ShellItem } from "@/components/kit/layout";
import { Logo } from "@/components/logo";
import { useT } from "@/lib/i18n";

/**
 * The distributor's app: the sidebar (or top bar and bottom navigation) around every distributor screen.
 * In the demo the drivers and shops live on the dashboard itself, so those two places scroll to them;
 * a signed-in distributor has a page for each.
 */
export function DistributorShell({
  current,
  name,
  demo = true,
  firstSteps = false,
  action,
  children,
}: {
  current: "panel" | "motoristas" | "tiendas";
  /** The business the dashboard belongs to (not known yet while the screen loads). */
  name?: string;
  /** False once we know a signed-in, approved distributor is looking. */
  demo?: boolean;
  /** "Primeros pasos" is listed while a new distributor still has steps to do. */
  firstSteps?: boolean;
  /** The one main action ("Nueva factura"), drawn full size in the sidebar and compact in the top bar. */
  action?: (place: "side" | "bar") => ReactNode;
  children: ReactNode;
}) {
  const { t } = useT();
  const nav: ShellItem[] = [
    { href: "/distribuidor", label: t("Panel", "Dashboard"), current: current === "panel" },
    { href: "/distribuidor#facturas", label: t("Facturas", "Invoices") },
    { href: demo ? "/distribuidor#motoristas" : "/distribuidor/motoristas", label: t("Motoristas", "Drivers"), current: current === "motoristas" },
    { href: demo ? "/distribuidor#tiendas" : "/distribuidor/tiendas", label: t("Tiendas", "Shops"), current: current === "tiendas" },
    ...(firstSteps ? [{ href: "/distribuidor#pasos", label: t("Primeros pasos", "First steps"), sidebarOnly: true }] : []),
  ];
  return (
    <Shell
      brand={
        <Link href="/" aria-label={t("Relay, inicio", "Relay, home")} className="inline-flex min-h-11 items-center">
          <Logo className="h-7 w-auto" />
        </Link>
      }
      name={name ?? ""}
      nav={nav}
      action={action}
    >
      {children}
    </Shell>
  );
}
