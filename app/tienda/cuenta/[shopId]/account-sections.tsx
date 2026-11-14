"use client";

import { type ReactNode, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { getShopSuppliers, removeSupplierAction, type ShopSuppliers } from "@/app/shop-actions";
import { CreditScoreCard } from "@/components/credit-score-card";
import { Card, CardHeading, icons, initials, RowGroup, RowInfo, RowLink, RowMark } from "@/components/kit/account";
import { RowButton } from "@/components/kit/ledger";
import { Money } from "@/components/kit/money";
import type { CreditScore } from "@/lib/credit";
import { dueOn, formatAmount, formatDay, plural } from "@/lib/format";
import { type Lang, useT } from "@/lib/i18n";
import { leftToPay } from "@/lib/labels";
import type { Invoice, Shop, Supplier } from "@/lib/types";

// Mi cuenta's sections beside the account card (#127). Each has a plain heading and one white card under it:
// rows to tap (an icon, a title, a line, a chevron) or facts to read, split by hairlines (components/kit/account.tsx).
// Add, withdraw and everything under Seguridad open explainers.

function Section({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-[calc(var(--band-h)+0.75rem)] flex-col gap-2 pt-3 first:pt-0 [div:empty+&]:pt-0">
      <CardHeading>{title}</CardHeading>
      {children}
    </section>
  );
}

/** The line under an unpaid invoice: what the shop most needs to know about it. */
function invoiceNote(invoice: Invoice, now: number, lang: Lang): string {
  const en = lang === "en";
  if (invoice.cashClaim !== undefined) return `${en ? "Cash to confirm" : "Efectivo por confirmar"}: ${formatAmount(invoice.cashClaim)}`;
  if (invoice.status === "part_paid") {
    return en ? `Paid ${formatAmount(invoice.paid)} of ${formatAmount(invoice.amount)}` : `Pagado ${formatAmount(invoice.paid)} de ${formatAmount(invoice.amount)}`;
  }
  return dueOn(invoice.dueDate, now, lang);
}

/** The invoices the shop still has to pay: each row opens its slip, where the paying is done. */
export function InvoicesToPay({ unpaid, now }: { unpaid: Invoice[]; now: number }) {
  const { lang, t } = useT();
  if (unpaid.length === 0) return null;
  return (
    <Section title={t("Facturas por pagar", "Invoices to pay")}>
      <RowGroup>
        {unpaid.map((invoice) => (
          <RowLink
            key={invoice.id}
            href={`/tienda/${invoice.id}`}
            mark={icons.invoice}
            title={`${t("Factura", "Invoice")} ${invoice.id}`}
            hint={invoiceNote(invoice, now, lang)}
            figure={
              <>
                <span className="sr-only">{t("Falta ", "Left to pay: ")}</span>
                <Money value={leftToPay(invoice)} />
              </>
            }
          />
        ))}
      </RowGroup>
    </Section>
  );
}

/** "Distribuidora El Sol lo agregó" (#132): who sells to this shop on Relay; the owner can remove one. */
function LinkedSuppliers({ shopId }: { shopId: string }) {
  const { lang, t, msg } = useT();
  const [data, setData] = useState<ShopSuppliers | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => setData(await getShopSuppliers(shopId)), [shopId]);
  useEffect(() => {
    let live = true;
    void getShopSuppliers(shopId).then((found) => {
      if (live) setData(found);
    });
    return () => {
      live = false;
    };
  }, [shopId]);

  if (!data || data.suppliers.length === 0) return null;

  async function remove(distributorId: string) {
    setBusy(distributorId);
    setError(null);
    const reply = await removeSupplierAction(shopId, distributorId);
    if (reply.ok) await load();
    else setError(reply.message);
    setBusy(null);
  }

  return (
    <>
      <Card className="px-4">
        <ul className="flex flex-col divide-y divide-paper-rule">
          {data.suppliers.map((s) => (
            <li key={s.distributorId} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3">
              <span className="flex min-w-0 items-center gap-3">
                <RowMark tone="ink">{initials(s.name)}</RowMark>
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold">{t(`${s.name} lo agregó`, `${s.name} added you`)}</span>
                  <span className="text-label text-muted">{formatDay(s.addedAt, lang)}</span>
                </span>
              </span>
              {data.isOwner && (
                <RowButton onClick={() => remove(s.distributorId)} disabled={busy !== null} label={t(`Quitar a ${s.name}`, `Remove ${s.name}`)}>
                  {busy === s.distributorId ? t("Quitando...", "Removing...") : t("Quitar", "Remove")}
                </RowButton>
              )}
            </li>
          ))}
        </ul>
        {/* Inside the paper, under the rows: the news of a removal that failed never moves a button. */}
        {error && (
          <p role="alert" className="border-t border-paper-rule py-2.5 font-semibold text-bad">
            {msg(error)}
          </p>
        )}
      </Card>
      {data.isOwner && (
        <p className="text-label text-muted text-pretty">
          {t("Si quita una distribuidora, sus facturas anteriores siguen en su historial.", "If you remove a distributor, its past invoices stay in your history.")}
        </p>
      )}
    </>
  );
}

// WhatsApp reminders on/off: kept on this phone until accounts (#129) store it.
const NOTIFY_KEY = "relay-whatsapp-off";
const notifyListeners = new Set<() => void>();
function readNotifyOff(shopId: string): boolean {
  try {
    return (window.localStorage.getItem(NOTIFY_KEY) ?? "").split(",").includes(shopId);
  } catch {
    return false;
  }
}
function writeNotifyOff(shopId: string, off: boolean) {
  try {
    const ids = new Set((window.localStorage.getItem(NOTIFY_KEY) ?? "").split(",").filter(Boolean));
    if (off) ids.add(shopId);
    else ids.delete(shopId);
    window.localStorage.setItem(NOTIFY_KEY, [...ids].join(","));
  } catch {
    // private mode: the switch still moves, it just isn't remembered
  }
  notifyListeners.forEach((l) => l());
}
let notifyFallback: Record<string, boolean> = {};

function useWhatsAppOn(shopId: string): [boolean, (on: boolean) => void] {
  const off = useSyncExternalStore(
    (l) => {
      notifyListeners.add(l);
      return () => notifyListeners.delete(l);
    },
    () => notifyFallback[shopId] ?? readNotifyOff(shopId),
    () => false,
  );
  return [
    !off,
    (on) => {
      notifyFallback = { ...notifyFallback, [shopId]: !on };
      writeNotifyOff(shopId, !on);
    },
  ];
}

export function AccountSections({ shop, suppliers, score, now }: { shop: Shop; suppliers: Supplier[]; score: CreditScore | null; now: number }) {
  const { t } = useT();
  const base = `/tienda/cuenta/${shop.id}`;
  const info = (topic: string) => `${base}/info/${topic}`;
  const [whatsApp, setWhatsApp] = useWhatsAppOn(shop.id);
  const hasCredit = shop.creditLimit > 0;
  const payments = shop.onTime + shop.late;

  return (
    <>
      {score && (
        <Section title={t("Su puntaje Relay", "Your Relay score")}>
          <CreditScoreCard score={score} shareFrom={{ shopId: shop.id, shopName: shop.name, now }} />
        </Section>
      )}

      <Section id="credito" title={t("Cómo sube su límite", "How your limit grows")}>
        <Card className="flex flex-col gap-3 px-4 py-4">
          {hasCredit ? (
            <>
              <ul className="flex flex-col divide-y divide-paper-rule">
                {(
                  [
                    [t("Si paga a tiempo", "If you pay on time"), 25],
                    [t("De 2 a 7 días tarde", "2 to 7 days late"), -25],
                    [t("8 días tarde o más", "8 or more days late"), -50],
                  ] as const
                ).map(([label, change]) => (
                  <li key={label} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                    <span>{label}</span>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 font-semibold ${change > 0 ? "bg-ok-tint text-ok" : "bg-bad-tint text-bad"}`}>
                      {change > 0 && "+"}
                      <Money value={change} />
                    </span>
                  </li>
                ))}
              </ul>
              {payments > 0 && (
                <p className="font-semibold text-pretty">
                  {t(`Lleva ${plural(shop.onTime, "pago", "pagos")} a tiempo y ${shop.late} tarde.`, `${plural(shop.onTime, "payment", "payments")} on time and ${shop.late} late so far.`)}
                </p>
              )}
              <p className="text-label text-muted text-pretty">
                {t(
                  "Un día tarde todavía cuenta a tiempo. Sube como máximo una vez por período de crédito, y solo si compró $40 o más con ",
                  "One day late still counts as on time. It goes up at most once per credit period, and only if you bought $40 or more with ",
                )}
                <span className="whitespace-nowrap">{t("«Pagar en 7 días»", "“Pay in 7 days”")}</span>
                {t(
                  " ($10 si pagó la mitad al recibir). Si paga 8 días tarde o más, no sube durante 4 períodos. El límite máximo es $500.",
                  " ($10 if you paid half on delivery). If you pay 8 or more days late, it doesn't grow for 4 periods. The highest limit is $500.",
                )}
              </p>
              <p className="text-label text-muted text-pretty">{t("Sin intereses: paga lo mismo que compró.", "No interest: you pay the same as you bought.")}</p>
            </>
          ) : (
            <p className="text-muted">{t("Su tienda no tiene crédito por ahora.", "Your shop doesn't have credit for now.")}</p>
          )}
        </Card>
      </Section>

      <Section title={t("Proveedores", "Suppliers")}>
        {suppliers.length === 0 ? (
          <Card className="px-4 py-3">
            <p className="text-muted">{t("Todavía no tiene proveedores en Relay.", "No suppliers on Relay yet.")}</p>
          </Card>
        ) : (
          <RowGroup>
            {suppliers.map((s) => (
              <RowInfo
                key={s.id}
                mark={initials(s.name)}
                title={s.name}
                hint={
                  s.unpaid > 0
                    ? t(`${plural(s.invoices, "factura", "facturas")} · ${s.unpaid} por pagar`, `${plural(s.invoices, "invoice", "invoices")} · ${s.unpaid} to pay`)
                    : t(`${plural(s.invoices, "factura", "facturas")} · todo pagado`, `${plural(s.invoices, "invoice", "invoices")} · all paid`)
                }
              />
            ))}
          </RowGroup>
        )}
        <LinkedSuppliers shopId={shop.id} />
      </Section>

      <Section title={t("Perfil y seguridad", "Profile and security")}>
        <RowGroup>
          <RowLink
            href={`${base}/datos`}
            mark={icons.person}
            title={shop.owner || t("Sus datos", "Your details")}
            hint={t("Nombre, tienda, dirección, teléfono, DUI", "Name, shop, address, phone, DUI")}
          />
          <RowLink
            href={info("contrasena")}
            mark={icons.lock}
            title={t("Cambiar contraseña", "Change password")}
            hint={t("Y cómo entrar sin su teléfono", "And how to sign in without your phone")}
          />
          <RowLink href={info("llaves")} mark={icons.key} title={t("Llaves de acceso", "Passkeys")} hint={t("Entrar con su huella o su cara", "Sign in with your fingerprint or face")} />
          <RowLink href={info("dispositivos")} mark={icons.phone} title={t("Dispositivos", "Devices")} hint={t("Dónde está abierta su cuenta", "Where your account is open")} />
          <RowLink
            href={info("contactos")}
            mark={icons.people}
            title={t("Contactos de confianza", "Trusted contacts")}
            hint={t("Si no puede entrar, o si fallece", "If you can't get in, or if you die")}
          />
        </RowGroup>
      </Section>

      <Section title={t("Notificaciones", "Notifications")}>
        <Card className="overflow-hidden">
          {/* The whole row is the switch. */}
          <label className="relative flex min-h-16 cursor-pointer items-center gap-3 px-4 py-3 select-none hover:bg-brand-tint has-focus-visible:outline-3 has-focus-visible:-outline-offset-3 has-focus-visible:outline-brand">
            <RowMark>{icons.bell}</RowMark>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[1.0625rem] font-semibold">{t("Recordatorios por WhatsApp", "WhatsApp reminders")}</span>
              <span className="text-label text-muted">{t("Antes de que venza una deuda", "Before a debt is due")}</span>
            </span>
            <input type="checkbox" role="switch" checked={whatsApp} onChange={(e) => setWhatsApp(e.target.checked)} className="peer absolute inset-0 size-full cursor-pointer opacity-0" />
            <span aria-hidden className="flex shrink-0 items-center gap-2">
              <span className="text-label font-bold">{whatsApp ? t("Sí", "On") : t("No", "Off")}</span>
              <span
                className={`relative h-7 w-12 rounded-full transition-colors after:absolute after:top-[4px] after:left-[4px] after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform ${
                  whatsApp ? "bg-brand after:translate-x-5" : "bg-counter-rule"
                }`}
              />
            </span>
          </label>
        </Card>
      </Section>

      <Section title={t("Ayuda y cuenta", "Help and account")}>
        <RowGroup>
          <RowLink href={info("ayuda")} mark={icons.help} title={t("Ayuda", "Help")} hint={t("Hable con una persona por WhatsApp", "Talk to a person on WhatsApp")} />
          <RowLink href={info("cerrar")} mark={icons.close} title={t("Cerrar cuenta", "Close account")} />
        </RowGroup>
      </Section>
    </>
  );
}
