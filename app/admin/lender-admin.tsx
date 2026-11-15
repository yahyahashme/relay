"use client";

import { useEffect, useRef, useState } from "react";
import { adminDecideLender, getLenderAdminList, type LenderAdminRow } from "@/app/lender-actions";
import { DetailLink } from "@/components/kit/button";
import { Ledger, LedgerCard, type LedgerColumn, RowAction, RowButton } from "@/components/kit/ledger";
import { Stamp } from "@/components/kit/stamp";
import { Failure, Loading } from "@/components/kit/states";
import { useSecondTap } from "@/components/tap-shield";
import { formatDay } from "@/lib/format";
import { useT } from "@/lib/i18n";

type List = { pending: LenderAdminRow[]; decided: LenderAdminRow[] };
type Decision = "aprobado" | "revocado";

const HEADING = "text-lead leading-tight font-bold";

/**
 * Lenders on /admin (#207). "Aprobar" calls approve_lender with the admin key, also for a lender
 * whose approval was taken away. "Quitar aprobación" calls revoke_lender: no new deposits, but it
 * can always take its money out. Distributors are refused: they never fund the pool.
 */
export function LenderAdmin() {
  const { lang, t, msg } = useT();
  const [list, setList] = useState<List | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<{ id: string; status: Decision } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  const secondTap = useSecondTap();

  async function load() {
    try {
      setList(await getLenderAdminList());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }
  useEffect(() => {
    let live = true;
    getLenderAdminList().then(
      (found) => live && setList(found),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, []);

  async function decide(id: string, status: Decision) {
    if (running.current) return;
    // Taking an approval away asks for a second tap, a beat after the first.
    if (status === "revocado" && confirming !== id) {
      secondTap.asked();
      setConfirming(id);
      setTimeout(() => setConfirming((c) => (c === id ? null : c)), 4000);
      return;
    }
    if (status === "revocado" && secondTap.tooSoon()) return;
    running.current = true;
    setConfirming(null);
    setBusy({ id, status });
    setError(null);
    try {
      const reply = await adminDecideLender(id, status);
      if (!reply.ok) setError(reply.message);
      await load();
    } catch {
      setError("No se pudo completar. Intente de nuevo.");
    }
    setBusy(null);
    running.current = false;
  }

  if (list === null) return null; // not an admin: the page already says so
  if (list === undefined) {
    return (
      <section className="flex flex-col gap-2">
        <h2 className={HEADING}>{t("Prestamistas", "Lenders")}</h2>
        {failed ? <Failure onRetry={() => void load()} /> : <Loading lines={3} torn={false} />}
      </section>
    );
  }

  const stamp = (l: LenderAdminRow) =>
    l.status === "aprobado" ? (
      <Stamp small tone="ok">
        {t("Aprobado", "Approved")}
      </Stamp>
    ) : l.status === "revocado" ? (
      <Stamp small tone="bad">
        {t("Sin aprobación", "Approval removed")}
      </Stamp>
    ) : (
      <Stamp small tone="warn">
        {t("Esperando", "Waiting")}
      </Stamp>
    );
  const action = (l: LenderAdminRow) =>
    l.status === "aprobado" ? (
      <RowAction onClick={() => void decide(l.id, "revocado")} danger label={confirming === l.id ? undefined : t(`Quitar aprobación a ${l.businessName}`, `Remove ${l.businessName}'s approval`)}>
        {busy?.id === l.id ? t("Procesando...", "Processing...") : confirming === l.id ? t("Toque otra vez", "Tap again") : t("Quitar aprobación", "Remove approval")}
      </RowAction>
    ) : (
      <RowButton
        onClick={() => void decide(l.id, "aprobado")}
        disabled={busy !== null}
        busy={busy?.id === l.id && busy.status === "aprobado"}
        label={t(`Aprobar ${l.businessName}`, `Approve ${l.businessName}`)}
      >
        {t("Aprobar", "Approve")}
      </RowButton>
    );
  const rows = [...list.pending, ...list.decided];
  const columns: LedgerColumn<LenderAdminRow>[] = [
    { id: "name", header: t("Prestamista", "Lender"), grow: true, cell: (l) => l.businessName, title: (l) => l.businessName },
    { id: "status", header: t("Estado", "Status"), cell: stamp },
    { id: "country", header: t("País", "Country"), secondary: true, cell: (l) => l.country },
    { id: "licence", header: t("Licencia o registro", "Licence or registration"), mono: true, secondary: true, cell: (l) => l.licence },
    { id: "contact", header: t("Contacto", "Contact"), secondary: true, cell: (l) => <span className="break-all">{`${l.ownerName ?? "—"} · ${l.ownerContact ?? "—"}`}</span> },
    {
      id: "account",
      header: t("Cuenta", "Account"),
      secondary: true,
      cell: (l) => (
        <DetailLink href={l.explorerUrl} external>
          {t("Ver detalles", "View details")}
        </DetailLink>
      ),
    },
    { id: "created", header: t("Registrado", "Signed up"), mono: true, end: true, cell: (l) => formatDay(l.createdAt, lang) },
    { id: "decide", header: <span className="sr-only">{t("Decisión", "Decision")}</span>, end: true, className: "w-48 min-w-48 py-1", cell: action },
  ];

  return (
    <section className="flex flex-col gap-2">
      <h2 className={HEADING}>{t("Prestamistas", "Lenders")}</h2>
      <p className="max-w-[40rem] text-muted text-pretty">
        {t(
          "Aprobar los deja poner dinero en el fondo. Quitar la aprobación no deja poner más, pero siempre pueden retirar lo suyo. Las distribuidoras no pueden ser prestamistas.",
          "Approving lets them put money in the pool. Removing approval stops new deposits, but they can always take their money out. Distributors can't be lenders.",
        )}
      </p>
      <Ledger
        label={t("Prestamistas", "Lenders")}
        columns={columns}
        rows={rows}
        rowKey={(l) => l.id}
        rowName={(l) => l.businessName}
        card={(l) => (
          <LedgerCard
            title={l.businessName}
            amount={null}
            stamp={stamp(l)}
            note={`${l.country} · ${l.licence} · ${t("Registrado", "Signed up")} ${formatDay(l.createdAt, lang)}`}
            actions={<span className="flex justify-start">{action(l)}</span>}
          />
        )}
        empty={<p className="text-lead">{t("Todavía no hay prestamistas.", "No lenders yet.")}</p>}
      />
      <p role="alert" className="min-h-[1lh] font-semibold text-bad">
        {error && msg(error)}
      </p>
    </section>
  );
}
