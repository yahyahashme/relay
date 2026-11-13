"use client";

import { useCallback, useEffect, useState } from "react";
import { type AdminRow, adminDecide, getAdminList } from "@/app/distributor-actions";
import { FormError } from "@/components/form";
import { BackLink, Card, Chip, Label, Loading, Screen } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

type List = { pending: AdminRow[]; decided: AdminRow[] };

/** Relay admins approve or reject distributors (#130). "Aprobar" also approves the address on the contract. */
export default function Admin() {
  const { t, msg, day } = useI18n();
  const [list, setList] = useState<List | null | undefined>(undefined);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => setList(await getAdminList()), []);
  useEffect(() => {
    let live = true;
    void getAdminList().then((found) => {
      if (live) setList(found);
    });
    return () => {
      live = false;
    };
  }, []);

  async function decide(id: string, status: "aprobado" | "rechazado") {
    setBusy(id);
    setError(null);
    const reply = await adminDecide(id, status);
    if (!reply.ok) setError(reply.message);
    await load();
    setBusy(null);
  }

  if (list === undefined) {
    return (
      <Screen wide>
        <Loading />
      </Screen>
    );
  }

  if (list === null) {
    return (
      <Screen>
        <BackLink />
        <h1 className="text-3xl font-bold">{t("Administración")}</h1>
        <p className="text-lg">{t("Solo para administradores de Relay.")}</p>
      </Screen>
    );
  }

  const details = (d: AdminRow) => (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-base sm:grid-cols-2">
      <div>
        <dt className="text-sm text-muted">{t("NIT")}</dt>
        <dd className="tabular-nums">{d.nit ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-sm text-muted">{t("Dirección")}</dt>
        <dd>{d.address ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-sm text-muted">{t("Contacto")}</dt>
        <dd className="break-all">
          {d.ownerName ?? "—"} · {d.ownerContact ?? "—"}
        </dd>
      </div>
      <div>
        <dt className="text-sm text-muted">{t("¿Qué vende?")}</dt>
        <dd>{d.sells.map((s) => t(s)).join(", ") || "—"}</dd>
      </div>
      <div>
        <dt className="text-sm text-muted">{t("Tamaño")}</dt>
        <dd>
          {t("{shops} tiendas · {drivers} motoristas (aprox.)", { shops: d.shopsApprox ?? "?", drivers: d.driversApprox ?? "?" })}
        </dd>
      </div>
      <div>
        <dt className="text-sm text-muted">{t("Registrada")}</dt>
        <dd>
          {day(d.createdAt)} ·{" "}
          <a href={d.explorerUrl} target="_blank" rel="noreferrer" className="text-brand underline">
            {t("Ver detalles")}
          </a>
        </dd>
      </div>
    </dl>
  );

  return (
    <Screen wide>
      <BackLink />
      <h1 className="text-3xl font-bold">{t("Distribuidoras por aprobar")}</h1>
      {error && <FormError>{msg(error)}</FormError>}

      {list.pending.length === 0 ? (
        <p className="text-lg text-muted">{t("No hay distribuidoras esperando.")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.pending.map((d) => (
            <li key={d.id}>
              <Card className="flex flex-col gap-4">
                <h2 className="text-xl font-semibold">{d.businessName}</h2>
                {details(d)}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => decide(d.id, "aprobado")}
                    disabled={busy !== null}
                    className="min-h-12 rounded-xl bg-brand px-5 text-lg font-semibold text-white active:bg-brand-dark disabled:bg-line disabled:text-muted"
                  >
                    {busy === d.id ? t("Procesando...") : t("Aprobar")}
                  </button>
                  <button
                    type="button"
                    onClick={() => decide(d.id, "rechazado")}
                    disabled={busy !== null}
                    className="min-h-12 rounded-xl border-2 border-bad px-5 text-lg font-semibold text-bad active:bg-bad-soft disabled:border-line disabled:text-muted"
                  >
                    {t("Rechazar")}
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {list.decided.length > 0 && (
        <section className="flex flex-col gap-2">
          <Label>{t("Decididas")}</Label>
          <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-card">
            {list.decided.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span className="text-lg">{d.businessName}</span>
                <Chip tone={d.status === "aprobado" ? "paid" : "overdue"}>{t(d.status === "aprobado" ? "Aprobada" : "Rechazada")}</Chip>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Screen>
  );
}
