"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Field } from "@/components/kit/field";
import { Paper } from "@/components/kit/paper";
import { Stamp } from "@/components/kit/stamp";
import { checkIdentity, type IdentityDetails } from "@/lib/identity";
import { useT } from "@/lib/i18n";

// The identity step of distributor and lender sign-up (#215), simulated for the demo. The legal
// representative types the DUI and date of birth and takes a photo of the DUI and a selfie. The
// photos stay on the phone: the demo only checks that they were taken, then lets go of them. The
// form sends the numbers; the server records them with the status "verificada_demo".

const CHECK_MS = 2200;

export type IdentityState = {
  details: Omit<IdentityDetails, "matricula">;
  set: (patch: Partial<Omit<IdentityDetails, "matricula">>) => void;
  duiPhoto: boolean;
  selfie: boolean;
  setPhoto: (which: "duiPhoto" | "selfie", file: File | null) => void;
  checking: boolean;
  verified: boolean;
  /** Runs the simulated check. Resolves to the message to show, or null once verified. */
  verify: (matricula: string) => Promise<string | null>;
};

/** The step's state, kept by the form so it survives going back a step. */
export function useIdentityCheck(): IdentityState {
  const [details, setDetails] = useState({ dui: "", birthDate: "" });
  const [photos, setPhotos] = useState({ duiPhoto: false, selfie: false });
  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState(false);
  return {
    details,
    set: (patch) => {
      setDetails((d) => ({ ...d, ...patch }));
      setVerified(false); // a changed number needs a new check
    },
    duiPhoto: photos.duiPhoto,
    selfie: photos.selfie,
    setPhoto: (which, file) => {
      setPhotos((p) => ({ ...p, [which]: file !== null }));
      setVerified(false);
    },
    checking,
    verified,
    verify: async (matricula) => {
      const problem = checkIdentity({ ...details, matricula });
      if (problem) return problem;
      if (!photos.duiPhoto) return "Tome la foto de su DUI.";
      if (!photos.selfie) return "Tómese una selfie.";
      setChecking(true);
      await new Promise((resolve) => setTimeout(resolve, CHECK_MS));
      setChecking(false);
      setVerified(true);
      return null;
    },
  };
}

/** One camera blank: on a phone it opens the camera (`capture`); elsewhere it picks a file. The photo is never uploaded. */
function PhotoField({ label, hint, facing, taken, onPick, error }: { label: ReactNode; hint: ReactNode; facing: "user" | "environment"; taken: boolean; onPick: (file: File | null) => void; error?: ReactNode }) {
  const { t } = useT();
  const id = useId();
  const [preview, setPreview] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  // Let go of the photo when the step is done or the page closes.
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className="text-[1.0625rem] font-bold">
        {label}
      </span>
      <label
        htmlFor={id}
        className={`flex min-h-13 cursor-pointer items-center gap-3 rounded-control border-[1.5px] px-4 py-2 ${error ? "border-bad" : taken ? "border-ok" : "border-dashed border-edge"} bg-white`}
      >
        {taken && preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local preview that never leaves the phone
          <img src={preview} alt="" className="size-10 rounded object-cover" />
        ) : null}
        <span className={`font-semibold ${taken ? "text-ok" : "text-brand"}`}>{taken ? t("Foto lista. Toque para cambiarla.", "Photo ready. Tap to change it.") : t("Tomar foto", "Take photo")}</span>
      </label>
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/*"
        capture={facing}
        aria-labelledby={`${id}-label`}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          setPreview((old) => {
            if (old) URL.revokeObjectURL(old);
            return file ? URL.createObjectURL(file) : null;
          });
          onPick(file);
          event.target.value = ""; // the file isn't kept in the form either
        }}
      />
      {error ? (
        <p role="alert" className="font-semibold text-bad">
          {error}
        </p>
      ) : (
        <p className="text-label text-muted">{hint}</p>
      )}
    </div>
  );
}

/** The blanks and the check's result. `under(message)` gives the message for a blank, if it's about that one. */
export function IdentityFields({ state, error }: { state: IdentityState; error: string | null }) {
  const { t, msg } = useT();
  const about = (...messages: string[]) => (error && messages.includes(error) ? msg(error) : undefined);

  if (state.checking) {
    return (
      <Paper className="flex flex-col items-center gap-3 px-4 py-6 text-center">
        <span role="status" className="sr-only">
          {t("Verificando identidad con nuestro socio…", "Checking identity with our partner…")}
        </span>
        <span className="size-8 animate-spin rounded-full border-[3px] border-edge border-t-ink motion-reduce:animate-none" aria-hidden />
        <p className="text-lead font-bold" aria-hidden>
          {t("Verificando identidad con nuestro socio…", "Checking identity with our partner…")}
        </p>
      </Paper>
    );
  }

  return (
    <>
      <Field
        label={t("DUI del representante legal", "Legal representative's DUI")}
        hint={t("9 dígitos, con o sin guion.", "9 digits, with or without the dash.")}
        inputMode="numeric"
        autoComplete="off"
        required
        value={state.details.dui}
        onChange={(e) => state.set({ dui: e.target.value })}
        error={about("El DUI debe tener 9 dígitos.")}
      />
      <Field
        label={t("Fecha de nacimiento", "Date of birth")}
        type="date"
        autoComplete="bday"
        required
        value={state.details.birthDate}
        onChange={(e) => state.set({ birthDate: e.target.value })}
        error={about("Escriba la fecha de nacimiento.", "El representante legal debe ser mayor de edad.")}
      />
      <PhotoField
        label={t("Foto del DUI", "Photo of the DUI")}
        hint={t("El frente, con buena luz.", "The front, in good light.")}
        facing="environment"
        taken={state.duiPhoto}
        onPick={(file) => state.setPhoto("duiPhoto", file)}
        error={about("Tome la foto de su DUI.")}
      />
      <PhotoField
        label={t("Selfie", "Selfie")}
        hint={t("Su cara, sin lentes oscuros.", "Your face, no sunglasses.")}
        facing="user"
        taken={state.selfie}
        onPick={(file) => state.setPhoto("selfie", file)}
        error={about("Tómese una selfie.")}
      />
      {state.verified && <IdentityVerified />}
    </>
  );
}

/** The result, with what production does instead. */
export function IdentityVerified() {
  const { t } = useT();
  return (
    <Paper className="flex flex-col items-start gap-1.5 px-4 py-3">
      <Stamp small tone="ok">
        {t("Identidad verificada (demo)", "Identity verified (demo)")}
      </Stamp>
      <p className="text-label text-muted text-pretty">
        {t(
          "En producción, un socio de verificación compara el DUI con el RNPN y la selfie con la foto. En la demo, las fotos no salen de su teléfono.",
          "In production, a verification partner checks the DUI against the RNPN and the selfie against the photo. In the demo, the photos never leave your phone.",
        )}
      </p>
    </Paper>
  );
}
