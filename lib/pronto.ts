// The pages the home page's footer links to that don't exist yet (help, legal, socials). Each one opens
// /pronto/<tema>, a page that says it is being prepared. Titles in both languages.

export const PRONTO: Record<string, { es: string; en: string }> = {
  ayuda: { es: "Centro de ayuda", en: "Help centre" },
  preguntas: { es: "Preguntas frecuentes", en: "FAQs" },
  contacto: { es: "Contactar a soporte", en: "Contact support" },
  seguridad: { es: "Seguridad y fraudes", en: "Security and fraud" },
  nosotros: { es: "Sobre Relay", en: "About Relay" },
  privacidad: { es: "Política de privacidad", en: "Privacy policy" },
  terminos: { es: "Términos y condiciones", en: "Terms and conditions" },
  cookies: { es: "Política de cookies", en: "Cookie policy" },
  "aviso-legal": { es: "Aviso legal", en: "Legal notice" },
  instagram: { es: "Relay en Instagram", en: "Relay on Instagram" },
  facebook: { es: "Relay en Facebook", en: "Relay on Facebook" },
  linkedin: { es: "Relay en LinkedIn", en: "Relay on LinkedIn" },
  tiktok: { es: "Relay en TikTok", en: "Relay on TikTok" },
};
