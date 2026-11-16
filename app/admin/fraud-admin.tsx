"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { decideFraud, getFraudReviews, runFraudScan, saveFraudNote } from "@/app/fraud-actions";
import { Button, TextButton } from "@/components/kit/button";
import { RowAction, RowButton } from "@/components/kit/ledger";
import { Stamp } from "@/components/kit/stamp";
import { Loading } from "@/components/kit/states";
import { useSecondTap } from "@/components/tap-shield";
import type { Flag } from "@/lib/fraud";
import { formatDay, formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";
import type { Review } from "@/lib/server/fraud";

const HEADING = "text-lead leading-tight font-bold";
const pct = (n = 0) => `${Math.round(n * 100)}%`;

/** One flag in plain words. A flag is a reason to look, never an accusation. */
export function useFlagText() {
  const { t } = useT();
  return (f: Flag): string => {
    const shop = f.shopName ?? f.shopId ?? "";
    switch (f.rule) {
      case "same_contact":
        return t(`${shop} tiene el mismo teléfono o la misma llave de pago que la distribuidora.`, `${shop} has the same phone or payment key as the distributor.`);
      case "big_invoice":
        return t(
          `La factura ${f.invoiceId} (${formatMoney(f.value ?? 0)}) es más de 3 veces lo usual (${formatMoney(f.usual ?? 0)}).`,
          `Invoice ${f.invoiceId} (${formatMoney(f.value ?? 0)}) is more than 3 times the usual (${formatMoney(f.usual ?? 0)}).`,
        );
      case "new_shops_credit":
        return t(`${f.count} ventas a crédito a tiendas creadas hace menos de 7 días.`, `${f.count} credit sales to shops created less than 7 days ago.`);
      case "defaults":
        return f.usual === undefined
          ? t("Tomó crédito y no lo pagó.", "Took credit and didn't pay it back.")
          : t(`${f.count} de sus tiendas no pagaron (${pct(f.value)}; el promedio en Relay es ${pct(f.usual)}).`, `${f.count} of its shops didn't pay (${pct(f.value)}; the Relay average is ${pct(f.usual)}).`);
      case "near_limit":
        return t(`${f.count} ventas a crédito justo debajo del límite de la tienda.`, `${f.count} credit sales just under the shop's limit.`);
      case "later_unpaid":
        return t(`${f.count} facturas de «pagar en 7 días» vencidas sin pagar.`, `${f.count} "pay in 7 days" invoices overdue and unpaid.`);
      case "circle_unlock":
        return f.count === 1
          ? t(`El dinero con que ${shop} pagó en la puerta vino de la misma distribuidora o sus motoristas. Ese pago no cuenta para su crédito.`, `The money ${shop} paid at the door with came from the distributor itself or its drivers. That payment doesn't count toward its credit.`)
          : t(`En ${f.count} tiendas, el dinero de los pagos en la puerta vino de la misma distribuidora o sus motoristas. Esos pagos no cuentan para su crédito.`, `At ${f.count} shops, the money for door payments came from the distributor itself or its drivers. Those payments don't count toward their credit.`);
      case "new_shops_together":
        return t(`${f.count} de sus tiendas tomaron su primer crédito en la misma semana.`, `${f.count} of its shops took their first credit in the same week.`);
      case "defaults_together":
        return t(`${f.count} de sus tiendas dejaron de pagar créditos que vencían con menos de 2 semanas de diferencia.`, `${f.count} of its shops stopped paying credit due less than 2 weeks apart.`);
    }
  };
}

const STATUS: Record<Review["status"], { tone: "warn" | "ok" | "bad"; es: string; en: string }> = {
  en_revision: { tone: "warn", es: "En revisión", en: "Under review" },
  prueba_pedida: { tone: "warn", es: "Prueba pedida", en: "Proof asked" },
  despejada: { tone: "ok", es: "Despejada", en: "Cleared" },
  cerrada: { tone: "bad", es: "Cuenta cerrada", en: "Account closed" },
};

/**
 * Fraud reviews on /admin (#231). The checks run after every new invoice and on "Revisar ahora".
 * While a distributor is in review, its invoices can't go on the lenders' money. The admin asks for
 * proof (the Hacienda electronic invoice code, a delivery photo), then clears it or closes the account.
 * Legal action is a manual step: write it in the note.
 */
export function FraudAdmin() {
  const { lang, t, msg } = useT();
  const flagText = useFlagText();
  const [reviews, setReviews] = useState<Review[] | null | undefined>(undefined);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [news, setNews] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [closing, setClosing] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const running = useRef(false);
  const secondTap = useSecondTap();

  const load = useCallback(async () => setReviews(await getFraudReviews()), []);
  useEffect(() => {
    let live = true;
    getFraudReviews().then(
      (found) => live && setReviews(found),
      () => live && setReviews(null),
    );
    return () => {
      live = false;
    };
  }, []);

  async function act(key: string, job: () => Promise<{ ok: boolean; message?: string; opened?: number }>) {
    if (running.current) return;
    running.current = true;
    setBusy(key);
    setError(null);
    setNews(null);
    try {
      const reply = await job();
      if (!reply.ok) setError(reply.message ?? "No se pudo completar. Intente de nuevo.");
      else if (reply.opened !== undefined) setNews(reply.opened === 0 ? t("Nada nuevo.", "Nothing new.") : t(`${reply.opened} revisiones nuevas.`, `${reply.opened} new reviews.`));
      await load();
    } catch {
      setError("No se pudo completar. Intente de nuevo.");
    }
    setBusy(null);
    running.current = false;
  }

  function close(r: Review) {
    const key = `${r.kind}:${r.partyId}`;
    if (closing !== key) {
      secondTap.asked();
      setClosing(key);
      setTimeout(() => setClosing((c) => (c === key ? null : c)), 4000);
      return;
    }
    if (secondTap.tooSoon()) return;
    setClosing(null);
    void act(`close:${key}`, () => decideFraud(r.kind, r.partyId, "cerrada"));
  }

  if (reviews === null) return null; // not an admin
  const open = reviews?.filter((r) => r.status === "en_revision" || r.status === "prueba_pedida") ?? [];
  const done = reviews?.filter((r) => r.status === "despejada" || r.status === "cerrada") ?? [];

  const card = (r: Review) => {
    const key = `${r.kind}:${r.partyId}`;
    const s = STATUS[r.status];
    const note = notes[key] ?? r.note;
    const isOpen = r.status === "en_revision" || r.status === "prueba_pedida";
    return (
      <li key={key} className="flex flex-col gap-2 rounded-paper bg-paper px-4 py-3">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold">
            {r.name} <span className="font-normal text-muted">· {r.kind === "distributor" ? t("Distribuidora", "Distributor") : t("Tienda", "Shop")}</span>
          </span>
          <Stamp small tone={s.tone}>
            {lang === "en" ? s.en : s.es}
          </Stamp>
        </span>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-pretty">
          {r.flags.map((f, i) => (
            <li key={i}>{flagText(f)}</li>
          ))}
        </ul>
        <p className="text-label text-muted">{t(`Actualizada el ${formatDay(r.updatedAt, "es")}`, `Updated ${formatDay(r.updatedAt, "en")}`)}</p>
        {r.status === "prueba_pedida" && r.kind === "distributor" && (
          <p className="text-label text-pretty">
            {t(
              "Pida por WhatsApp: el código de generación del DTE de Hacienda de cada factura marcada, o una foto de la entrega con la firma de la tienda.",
              "Ask on WhatsApp for: the Hacienda electronic invoice (DTE) generation code of each flagged invoice, or a delivery photo with the shop's signature.",
            )}
          </p>
        )}
        <label className="flex flex-col gap-1 text-label">
          <span className="font-semibold">{t("Nota (prueba recibida, acción legal…)", "Note (proof received, legal action…)")}</span>
          <textarea
            className="min-h-16 rounded-[6px] border-[1.5px] border-edge bg-white px-3 py-2 text-base"
            value={note}
            onChange={(e) => setNotes((n) => ({ ...n, [key]: e.target.value }))}
            onBlur={() => note !== r.note && void saveFraudNote(r.kind, r.partyId, note)}
          />
        </label>
        {isOpen && (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {r.status === "en_revision" && (
              <RowButton onClick={() => void act(`proof:${key}`, () => decideFraud(r.kind, r.partyId, "prueba_pedida"))} disabled={busy !== null} busy={busy === `proof:${key}`}>
                {t("Pedir prueba", "Ask for proof")}
              </RowButton>
            )}
            <RowButton onClick={() => void act(`clear:${key}`, () => decideFraud(r.kind, r.partyId, "despejada"))} disabled={busy !== null} busy={busy === `clear:${key}`}>
              {t("Despejar", "Clear")}
            </RowButton>
            <RowAction danger onClick={() => close(r)}>
              {busy === `close:${key}` ? t("Procesando...", "Processing...") : closing === key ? t("Toque otra vez para cerrar", "Tap again to close") : t("Cerrar cuenta", "Close account")}
            </RowAction>
          </span>
        )}
      </li>
    );
  };

  return (
    <section id="revisiones" className="flex max-w-[40rem] flex-col gap-2">
      <h2 className={HEADING}>{t("Revisiones de fraude", "Fraud reviews")}</h2>
      <p className="text-pretty">
        {t(
          "Relay revisa las facturas de cada distribuidora después de cada factura nueva. Mientras una distribuidora está en revisión, sus facturas no usan el dinero de los prestamistas. Primero pida prueba; cierre la cuenta solo si no la hay. Una distribuidora cerrada no puede crear facturas; sus tiendas siguen pagando lo que deben. Una tienda cerrada queda con $0 de crédito.",
          "Relay checks every distributor's invoices after each new invoice. While a distributor is under review, its invoices don't use the lenders' money. Ask for proof first; close the account only if there is none. A closed distributor can't create invoices; its shops keep paying what they owe. A closed shop is left with $0 of credit.",
        )}
      </p>
      <div className="max-w-[20rem]">
        <Button size="sm" onClick={() => void act("scan", runFraudScan)} busy={busy === "scan"} disabled={busy !== null}>
          {t("Revisar ahora", "Check now")}
        </Button>
      </div>
      <p role="status" className={`min-h-[1lh] font-semibold ${error ? "text-bad" : "text-ok"}`}>
        {error ? msg(error) : news}
      </p>
      {reviews === undefined ? (
        <Loading lines={3} torn={false} />
      ) : open.length === 0 ? (
        <p>{t("No hay nada en revisión.", "Nothing is under review.")}</p>
      ) : (
        <ul className="flex flex-col gap-2">{open.map(card)}</ul>
      )}
      {done.length > 0 && (
        <>
          <TextButton onClick={() => setShowDone((v) => !v)}>
            {showDone ? t("Ocultar las decididas", "Hide decided ones") : t(`Ver las decididas (${done.length})`, `See decided ones (${done.length})`)}
          </TextButton>
          {showDone && <ul className="flex flex-col gap-2">{done.map(card)}</ul>}
        </>
      )}
    </section>
  );
}
