// The identity check at distributor and lender sign-up (#215), the part both sides share. In the
// demo it is simulated: the legal representative's DUI and date of birth, a photo of the DUI and a
// selfie, and the company's CNR registration (matrícula de comercio). In production a verification
// partner checks the DUI against the national registry (RNPN) and the selfie against the photo, and
// an admin checks the CNR registration by hand. Only the numbers and a status are kept; the photos
// never leave the phone in the demo.

export type IdentityDetails = {
  /** The legal representative's DUI, "01234567-8" (dash optional). */
  dui: string;
  /** "YYYY-MM-DD", from a date input. */
  birthDate: string;
  /** The company's matrícula de comercio at the CNR. */
  matricula: string;
};

/** What the server records: "verificada_demo" after the simulated check; older sign-ups have none. */
export type IdentityStatus = "verificada_demo" | "sin_verificar";

/** "012345678" or "01234567-8" -> "01234567-8", else null. A DUI is 8 digits and a check digit. */
export function normalizeDui(text: string): string | null {
  const digits = String(text ?? "").replace(/\D/g, "");
  return digits.length === 9 ? `${digits.slice(0, 8)}-${digits[8]}` : null;
}

/** The CNR registration number: letters, digits and dashes, 4 to 30 of them. */
export function normalizeMatricula(text: string): string | null {
  const clean = String(text ?? "").trim().toUpperCase().replace(/\s+/g, "");
  return /^[A-Z0-9-]{4,30}$/.test(clean) ? clean : null;
}

/** Whole years between a "YYYY-MM-DD" birth date and `today`, or null if it isn't a real date. */
export function ageOn(birthDate: string, today: Date): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(birthDate ?? ""));
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  let age = today.getUTCFullYear() - y;
  if (today.getUTCMonth() < m - 1 || (today.getUTCMonth() === m - 1 && today.getUTCDate() < d)) age -= 1;
  return age;
}

/** Spanish message if the numbers won't do, else null. Checked on the phone and again on the server. */
export function checkIdentity(d: IdentityDetails, today = new Date()): string | null {
  if (!normalizeDui(d?.dui)) return "El DUI debe tener 9 dígitos.";
  const age = ageOn(d.birthDate, today);
  if (age === null || age > 120) return "Escriba la fecha de nacimiento.";
  if (age < 18) return "El representante legal debe ser mayor de edad.";
  if (!normalizeMatricula(d.matricula)) return "Escriba el número de matrícula de comercio del CNR.";
  return null;
}
