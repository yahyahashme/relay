"use client";

// Spanish is the source language: every string in the code is the Spanish text,
// and EN gives its English version. Switch with <LangSwitch /> (top banner).
//   t("Factura {id}", { id: 1001 })  -> "Factura 1001" / "Invoice 1001"
//   msg(receipt.message)              -> messages that arrive already written in
//                                        Spanish (server, demo data, CSV checks)
// lib/i18n.test.ts fails if a t("...") string or a known message has no English.

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type Lang = "es" | "en";
export const LANG_COOKIE = "lang";
const STORAGE_KEY = "relay-lang";
const CHANGED = "relay-lang-change";

type Vars = Record<string, string | number>;

/** Spanish template -> English template. Placeholders like {id} must match on both sides. */
export const EN: Record<string, string> = {
  // Banner, shared pieces
  "Demo en testnet · dinero de prueba · cash-in simulado": "Testnet demo · test money · simulated cash-in",
  "Idioma": "Language",
  "Inicio": "Home",
  "Cargando...": "Loading...",
  "No se pudo cargar. Reintentando...": "Couldn't load. Retrying...",
  "Procesando...": "Processing...",
  "Ver detalles": "View details",

  // Home
  "La tienda le paga al distribuidor con dólares digitales, en efectivo o en 7 días sin intereses.":
    "The shop pays the distributor in digital dollars, in cash, or in 7 days with no interest.",
  "Distribuidor": "Distributor",
  "Motorista": "Driver",
  "Tienda": "Shop",
  "Factura": "Invoice",
  "Factura {id}": "Invoice {id}",
  "No tiene facturas pendientes.": "No unpaid invoices.",
  "Mi cuenta": "My account",

  // Invoice statuses and payment methods
  "Pendiente": "Unpaid",
  "Parcial": "Partly paid",
  "Pagada": "Paid",
  "Crédito": "Credit",
  "Digital": "Digital",
  "Efectivo": "Cash",
  "Mixto": "Mixed",
  "Vencido": "Overdue",
  "Efectivo por confirmar": "Cash to confirm",

  // Shop: invoice screen
  "No encontramos la factura {id}.": "We couldn't find invoice {id}.",
  "Factura {id} · Distribuidora El Sol": "Invoice {id} · Distribuidora El Sol",
  "Total": "Total",
  "Pagado": "Paid",
  "Falta": "Left to pay",
  "Pagada · {method}": "Paid · {method}",
  "Vence el {date}": "Due {date}",
  "Su tienda aún no tiene crédito": "Your shop doesn't have credit yet",
  "Tiene un pago vencido": "You have an overdue payment",
  "Supera su límite de crédito": "Over your credit limit",
  "Pagar en 7 días": "Pay in 7 days",
  "Sin intereses": "No interest",
  "Hoy no paga nada. Paga <b>{amount}</b> en 7 días.": "You pay nothing today. Pay <b>{amount}</b> in 7 days.",
  "Confirmo": "I confirm",
  "Pagar otro monto": "Pay a different amount",
  "¿Cuánto paga ahora?": "How much are you paying now?",
  "Falta {amount}": "{amount} left to pay",
  "Pagar este monto": "Pay this amount",
  "{amount} con dólares digitales": "{amount} in digital dollars",
  "Con dólares digitales": "In digital dollars",
  "Pagué en efectivo": "I paid in cash",
  "{driver} registró <b>{amount}</b> en efectivo.": "{driver} recorded <b>{amount}</b> in cash.",
  "El motorista": "The driver",
  "El motorista aún no registró el efectivo.": "The driver hasn't recorded the cash yet.",
  "Pagar ahora": "Pay now",

  // Shop: account
  "No encontramos esa tienda.": "We couldn't find that shop.",
  "Debe": "Owes",
  "Venció el {date}": "Was due {date}",
  "Pagar deuda": "Pay off debt",
  "No tiene deudas pendientes.": "Nothing owed.",
  "Límite de crédito": "Credit limit",
  "Disponible": "Available",
  "+$25 por pago a tiempo (uno por semana, compras desde $40), hasta $500. Si paga tarde, baja $25.":
    "+$25 for each on-time repayment (one a week, on purchases of $40 or more), up to $500. A late repayment lowers it by $25.",
  "Historial: {onTime} a tiempo, {late} tarde": "History: {onTime} on time, {late} late",
  "1 pago": "1 payment",
  "{count} pagos": "{count} payments",
  "Facturas por pagar": "Invoices to pay",

  // Driver: route
  "No encontramos a ese motorista.": "We couldn't find that driver.",
  "Ruta de {name}": "{name}'s route",
  "1 parada hoy · {pending} por cobrar": "1 stop today · {pending} to collect",
  "{stops} paradas hoy · {pending} por cobrar": "{stops} stops today · {pending} to collect",
  "Efectivo en mano": "Cash on hand",
  "La tienda escanea este código para pagar.": "The shop scans this code to pay.",
  "Recibí efectivo": "Cash received",
  "Esperando que la tienda confirme {amount}.": "Waiting for the shop to confirm {amount}.",

  // Distributor: dashboard
  "Se actualiza cada 5 segundos.": "Updates every 5 seconds.",
  "Creando...": "Creating...",
  "Nueva factura de demo": "New demo invoice",
  "Cobrado digital": "Collected digitally",
  "Efectivo por motorista": "Cash per driver",
  "Guardando...": "Saving...",
  "Marcar efectivo entregado": "Mark cash handed in",
  "En crédito": "On credit",
  "Tiendas con deuda": "Shops that owe",
  "Debe {amount}": "Owes {amount}",
  "vence el {date}": "due {date}",
  "venció el {date}": "was due {date}",
  "Recordar por WhatsApp": "Remind on WhatsApp",
  "Demo: los números son de prueba. Revise el mensaje, pero no lo envíe.":
    "Demo: these are test numbers. Check the message, but don't send it. The message is in Spanish, for the shop.",
  "Estado": "Status",
  "Todas": "All",
  "Todos": "All",
  "Monto": "Amount",
  "Método": "Method",
  "Vence": "Due",
  "recibió {amount}": "received {amount}",
  "No hay facturas con este filtro.": "No invoices match this filter.",
  "Mostrando las {shown} facturas más recientes de {total}.": "Showing the {shown} most recent invoices of {total}.",
  "Ver más": "Show more",

  // Distributor: CSV import
  "Importar facturas (CSV)": "Import invoices (CSV)",
  "Columnas: invoice_id, shop_id, driver_id, amount, due_date": "Columns: invoice_id, shop_id, driver_id, amount, due_date",
  "1 factura lista": "1 invoice ready",
  "{count} facturas listas": "{count} invoices ready",
  "1 fila con error (no se crea)": "1 row with an error (won't be created)",
  "{count} filas con error (no se crean)": "{count} rows with errors (won't be created)",
  "Línea {line}: {reason}": "Line {line}: {reason}",
  "Máximo {max} facturas por archivo.": "At most {max} invoices per file.",
  "Crear 1 factura": "Create 1 invoice",
  "Crear {count} facturas": "Create {count} invoices",
  "Cancelar": "Cancel",
  "Se crean una por una, unos segundos cada una.": "They're created one by one, a few seconds each.",

  // Accounts (#129)
  "Crear cuenta": "Create account",
  "Entrar": "Sign in",
  "Probar la demo": "Try the demo",
  "Es gratis. Las tiendas nunca pagan comisiones.": "It's free. Shops never pay fees.",
  "¿Qué es usted?": "What are you?",
  "Compro a distribuidores": "I buy from distributors",
  "Distribuidora": "Distributor",
  "Vendo y entrego a tiendas": "I sell and deliver to shops",
  "Entrego para una distribuidora": "I deliver for a distributor",
  "Los motoristas se registran con la invitación de su distribuidora.": "Drivers sign up with their distributor's invite.",
  "Pídale el enlace a su distribuidora y ábralo en este teléfono.": "Ask your distributor for the link and open it on this phone.",
  "Su nombre": "Your name",
  "Nombre de la persona de contacto": "Contact person's name",
  "Teléfono o correo": "Phone or email",
  "Teléfono de El Salvador (8 dígitos) o correo.": "A Salvadoran phone number (8 digits) or an email.",
  "Contraseña": "Password",
  "Al menos 8 caracteres.": "At least 8 characters.",
  "Mostrar": "Show",
  "Ocultar": "Hide",
  "Estamos creando su cuenta de dólares digitales. Toma unos segundos.": "We're creating your digital dollar account. It takes a few seconds.",
  "¿Ya tiene cuenta?": "Already have an account?",
  "¿No tiene cuenta?": "Don't have an account?",
  "Hola, {name}": "Hi, {name}",
  "Su cuenta está lista.": "Your account is ready.",
  "Tipo de cuenta": "Account type",
  "Administrador": "Administrator",
  "Cuenta de dólares digitales": "Digital dollar account",
  "Ir al inicio": "Go to the home page",
  "Cerrar sesión": "Sign out",
  "Las cuentas todavía no están activas en este servidor.": "Accounts aren't switched on on this server yet.",
  "No pudimos crear su cuenta en este momento. Intente de nuevo en un minuto.": "We couldn't create your account right now. Try again in a minute.",
  "Escriba su nombre.": "Enter your name.",
  "Escriba un teléfono de El Salvador (8 dígitos) o un correo válido.": "Enter a Salvadoran phone number (8 digits) or a valid email.",
  "La contraseña debe tener al menos 8 caracteres.": "The password must be at least 8 characters.",
  "Ya hay una cuenta con ese teléfono o correo. Entre con su contraseña.": "There's already an account with that phone or email. Sign in with your password.",
  "Teléfono, correo o contraseña incorrectos.": "Wrong phone, email or password.",

  // Distributors (#130)
  "Su empresa": "Your business",
  "Su cuenta": "Your account",
  "Paso {n} de 2": "Step {n} of 2",
  "Nombre de la empresa": "Business name",
  "NIT": "Tax ID (NIT)",
  "14 dígitos, con o sin guiones.": "14 digits, with or without dashes.",
  "Dirección": "Address",
  "¿Qué vende?": "What do you sell?",
  "Snacks": "Snacks",
  "Bebidas": "Drinks",
  "Pan": "Bread",
  "Lácteos": "Dairy",
  "Abarrotes": "Groceries",
  "Limpieza": "Cleaning products",
  "Otros": "Other",
  "Tiendas (aprox.)": "Shops (approx.)",
  "Motoristas (aprox.)": "Drivers (approx.)",
  "En el producto real, un socio con licencia verifica la empresa antes de aprobarla.":
    "In the real product, a licensed partner checks the business before approving it.",
  "Siguiente": "Next",
  "Atrás": "Back",
  "Estamos revisando su empresa": "We're reviewing your business",
  "Qué sigue": "What happens next",
  "Revisamos los datos de su empresa.": "We check your business details.",
  "Al aprobarla, su cuenta puede crear facturas.": "Once approved, your account can create invoices.",
  "Luego agrega sus motoristas y sus tiendas.": "Then you add your drivers and your shops.",
  "En esta demo se aprueba sola en unos segundos.": "In this demo it approves itself in a few seconds.",
  "Le avisamos aquí cuando esté aprobada.": "We'll let you know here once it's approved.",
  "No pudimos aprobar su empresa": "We couldn't approve your business",
  "Escríbanos y le explicamos qué falta.": "Write to us and we'll explain what's missing.",
  "Ir a mi panel": "Go to my dashboard",
  "Primeros pasos": "First steps",
  "Agregar sus motoristas": "Add your drivers",
  "Agregar sus tiendas": "Add your shops",
  "Crear su primera factura": "Create your first invoice",
  "Hecho": "Done",
  "Por hacer": "To do",
  "Administración": "Administration",
  "Solo para administradores de Relay.": "Relay administrators only.",
  "Distribuidoras por aprobar": "Distributors to approve",
  "No hay distribuidoras esperando.": "No distributors are waiting.",
  "Contacto": "Contact",
  "Tamaño": "Size",
  "{shops} tiendas · {drivers} motoristas (aprox.)": "{shops} shops · {drivers} drivers (approx.)",
  "Registrada": "Signed up",
  "Aprobar": "Approve",
  "Rechazar": "Reject",
  "Decididas": "Decided",
  "Aprobada": "Approved",
  "Rechazada": "Rejected",
  "Todavía no tiene motoristas.": "No drivers yet.",
  "Todavía no hay facturas.": "No invoices yet.",
  "Aquí verá cada factura, quién la pagó y cómo.": "Every invoice will show here, with who paid it and how.",
  "Escriba el nombre de la empresa.": "Enter the business name.",
  "El NIT debe tener 14 dígitos.": "The tax ID (NIT) must have 14 digits.",
  "Escriba la dirección de la empresa.": "Enter the business address.",
  "Elija qué vende.": "Choose what you sell.",
  "Escriba un número aproximado.": "Enter an approximate number.",

  // Drivers by invite (#131)
  "Panel": "Dashboard",
  "Motoristas": "Drivers",
  "Agregar motorista": "Add a driver",
  "Nombre": "Name",
  "Teléfono": "Phone",
  "Teléfono de El Salvador (8 dígitos).": "A Salvadoran phone number (8 digits).",
  "Crear invitación": "Create invite",
  "Invitación para {name}. Envíele este enlace:": "Invite for {name}. Send them this link:",
  "Enviar por WhatsApp": "Send on WhatsApp",
  "Copiar enlace": "Copy link",
  "Copiado": "Copied",
  "Sus motoristas": "Your drivers",
  "Activo": "Active",
  "Invitación enviada": "Invite sent",
  "Ver enlace": "Show link",
  "Ocultar enlace": "Hide link",
  "Quitar": "Remove",
  "Toque otra vez para quitar": "Tap again to remove",
  "Solo la distribuidora aprobada puede hacer esto.": "Only the approved distributor can do this.",
  "{distributor} lo invita como motorista": "{distributor} invites you as a driver",
  "Cree su cuenta para ver su ruta y registrar el efectivo.": "Create your account to see your route and record cash.",
  "Su usuario será su teléfono que termina en {end}.": "You'll sign in with your phone number ending in {end}.",
  "Crear mi cuenta": "Create my account",
  "Esta invitación ya no es válida": "This invite is no longer valid",
  "Pida otra a su distribuidora, o entre si ya creó su cuenta.": "Ask your distributor for a new one, or sign in if you already created your account.",
  "Ir a mi ruta": "Go to my route",
  "Escriba el nombre del motorista.": "Enter the driver's name.",
  "Escriba un teléfono de El Salvador (8 dígitos).": "Enter a Salvadoran phone number (8 digits).",
  "Ya invitó a ese teléfono. Comparta el mismo enlace.": "You already invited that phone. Share the same link.",
  "Esta invitación ya no es válida. Pida otra a su distribuidora.": "This invite is no longer valid. Ask your distributor for a new one.",
  "Esta invitación ya se usó. Entre con su contraseña.": "This invite was already used. Sign in with your password.",

  // Messages that arrive already written (server actions, demo data, contract errors, CSV checks)
  "Esa factura ya existe.": "That invoice already exists.",
  "No encontramos esa factura.": "We couldn't find that invoice.",
  "Monto inválido.": "Invalid amount.",
  "El monto es mayor que lo pendiente.": "The amount is more than what's left to pay.",
  "Esta factura ya está pagada.": "This invoice is already paid.",
  "Esta factura no es de su tienda.": "This invoice isn't for your shop.",
  "Tiene un pago vencido. Pague su deuda para volver a usar crédito.":
    "You have an overdue payment. Pay your debt to use credit again.",
  "Tiene un pago vencido.": "You have an overdue payment.",
  "Esta compra supera su límite de crédito.": "This purchase is over your credit limit.",
  "Supera su límite de crédito.": "Over your credit limit.",
  "El crédito no está disponible en este momento.": "Credit isn't available right now.",
  "Hoy no hay fondos para crédito. Intente más tarde.": "There's no money for credit today. Try again later.",
  "No tiene deuda pendiente.": "Nothing owed.",
  "Su tienda aún no tiene crédito.": "Your shop doesn't have credit yet.",
  "Esta tienda todavía no tiene crédito.": "This shop doesn't have credit yet.",
  "El motorista cambió el monto. Revise el nuevo monto y confirme de nuevo.":
    "The driver changed the amount. Check the new amount and confirm again.",
  "El efectivo registrado es mayor que lo que falta pagar.": "The cash recorded is more than what's left to pay.",
  "El monto es mayor que lo que falta pagar.": "The amount is more than what's left to pay.",
  "Este motorista no está en la ruta.": "This driver isn't on the route.",
  "No se pudo completar. Intente de nuevo.": "Couldn't complete it. Please try again.",
  "Algo salió mal. Intente de nuevo.": "Something went wrong. Please try again.",
  "Todavía no está conectado al contrato.": "Not connected to the contract yet.",
  "Tienda desconocida.": "Unknown shop.",
  "Listo. Ahora la tienda debe tocar «Confirmo».": "Done. Now the shop taps “I confirm”.",
  "Deuda pagada a tiempo. Gracias.": "Debt paid on time. Thank you.",
  "Deuda pagada con atraso.": "Debt paid late.",
  "No hay facturas para crear.": "There are no invoices to create.",
  "Se creó 1 factura.": "1 invoice created.",
  "Listo. Se creó 1 factura.": "Done. 1 invoice created.",
  "La fila debe tener 5 columnas": "The row must have 5 columns",
  "Falta el número de factura": "The invoice number is missing",
  "Falta la tienda": "The shop is missing",
  "Falta el motorista": "The driver is missing",
  "Falta el monto": "The amount is missing",
  "El monto debe ser mayor que 0": "The amount must be more than 0",
  "Falta la fecha": "The date is missing",
  "Fecha inválida (use AAAA-MM-DD)": "Invalid date (use YYYY-MM-DD)",
  "El archivo no tiene facturas": "The file has no invoices",
  // adding shops (#132)
  "Ir a mi tienda": "Go to my shop",
  "Tiendas": "Shops",
  "Motorista que la visita": "Driver who visits it",
  "Sin asignar": "Not assigned",
  "Agregar tienda": "Add shop",
  "Buscar en Relay": "Find on Relay",
  "Agregar sin cuenta": "Add without an account",
  "Nombre de la tienda o teléfono": "Shop name or phone",
  "Buscar": "Search",
  "No encontramos esa tienda en Relay. Agréguela sin cuenta y la invitamos.": "We didn't find that shop on Relay. Add it without an account and we'll invite it.",
  "Agregar": "Add",
  "Cómo la llama usted": "What you call it",
  "Cualquier nombre que le sirva, por ejemplo «Tienda de Doña Marta, frente a la iglesia». Solo usted lo ve.": "Any name that works for you, for example “Marta's shop, across from the church”. Only you see it.",
  "Dirección (si la sabe)": "Address (if you know it)",
  "Teléfono (si lo sabe)": "Phone (if you know it)",
  "Para enviarle la invitación por WhatsApp.": "To send the invitation on WhatsApp.",
  "Tienda agregada. Ya puede hacerle facturas.": "Shop added. You can invoice it now.",
  "Sus tiendas": "Your shops",
  "Todavía no tiene tiendas.": "You don't have any shops yet.",
  "En Relay: {name}": "On Relay: {name}",
  "Límite": "Limit",
  "Ocultar invitación": "Hide invitation",
  "Ver invitación": "See invitation",
  "Invitar a Relay": "Invite to Relay",
  "Proveedores": "Suppliers",
  "{distributor} lo agregó": "{distributor} added you",
  "Quitando...": "Removing...",
  "Si quita una distribuidora, sus facturas anteriores siguen en su historial.": "If you remove a distributor, its past invoices stay in your history.",
  "Este código ya no es válido": "This code is no longer valid",
  "Pida otro a su distribuidora, o entre si ya creó su cuenta.": "Ask your distributor for another one, or sign in if you already made your account.",
  "{distributor} lo agregó en Relay": "{distributor} added you on Relay",
  "Cree su cuenta para pagar sus facturas desde el teléfono.": "Make your account to pay your invoices from your phone.",
  "Sus facturas de {distributor} ya estarán en su cuenta.": "Your invoices from {distributor} will already be in your account.",
  "Nombre de su tienda": "Your shop's name",
  "La tienda escanea este código para crear su cuenta.": "The shop scans this code to make its account.",
  "Código para unirse: {code}": "Code to join: {code}",
  "O con el código": "Or with the code",
  "Activa": "Active",
  "Invitada": "Invited",
  "Sin cuenta": "No account",
  "Escriba un nombre para reconocer la tienda.": "Write a name to recognize the shop.",
  "Escriba un teléfono de El Salvador (8 dígitos) o déjelo vacío.": "Write a Salvadoran phone number (8 digits) or leave it empty.",
  "Este código ya no es válido. Pida otro a su distribuidora.": "This code is no longer valid. Ask your distributor for another one.",
  "Escriba el nombre de su tienda.": "Write your shop's name.",
  "Entre a su cuenta primero.": "Sign in to your account first.",
};

/**
 * Messages with values in them (amounts, dates, names, ids). Each Spanish
 * pattern is anchored; the English side reuses the captured values, and any
 * date in them is rewritten for English ("17 nov" -> "Nov 17").
 */
const MONEY = String.raw`(-?\$[\d,]+\.\d{2})`;
const DAY = String.raw`(\d{1,2} (?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic))`;
export const PATTERNS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [new RegExp(`^Pago recibido: ${MONEY} en dólares digitales\\.$`), (m) => `Payment received: ${m[1]} in digital dollars.`],
  [new RegExp(`^Pago recibido: ${MONEY}\\. Falta ${MONEY}\\.$`), (m) => `Payment received: ${m[1]}. ${m[2]} left to pay.`],
  [new RegExp(`^El monto es mayor que lo que falta pagar \\(${MONEY}\\)\\.$`), (m) => `The amount is more than what's left to pay (${m[1]}).`],
  [
    new RegExp(`^Hay ${MONEY} en efectivo por confirmar\\. Puede pagar hasta ${MONEY}\\.$`),
    (m) => `${m[1]} in cash is waiting to be confirmed. You can pay up to ${m[2]}.`,
  ],
  [
    new RegExp(`^Listo\\. Tiene hasta el ${DAY} para pagar ${MONEY}, sin intereses\\.$`),
    (m) => `Done. You have until ${dayEn(m[1])} to pay ${m[2]}, with no interest.`,
  ],
  [new RegExp(`^Listo\\. Confirmó ${MONEY} en efectivo\\.$`), (m) => `Done. You confirmed ${m[1]} in cash.`],
  [new RegExp(`^Deuda pagada con atraso\\. Su límite bajó a ${MONEY}\\.$`), (m) => `Debt paid late. Your limit went down to ${m[1]}.`],
  [new RegExp(`^Deuda pagada a tiempo\\. Su límite subió a ${MONEY}\\.$`), (m) => `Debt paid on time. Your limit went up to ${m[1]}.`],
  [new RegExp(`^Listo\\. (.+) entregó ${MONEY} en efectivo\\.$`), (m) => `Done. ${m[1]} handed in ${m[2]} in cash.`],
  [/^Máximo (\d+) facturas por archivo\.$/, (m) => `At most ${m[1]} invoices per file.`],
  [/^Fila (\d+): tienda desconocida\.$/, (m) => `Row ${m[1]}: unknown shop.`],
  [/^Fila (\d+): motorista desconocido\.$/, (m) => `Row ${m[1]}: unknown driver.`],
  [/^Fila (\d+): número de factura inválido\.$/, (m) => `Row ${m[1]}: invalid invoice number.`],
  [/^Fila (\d+): la factura (\d+) está repetida\.$/, (m) => `Row ${m[1]}: invoice ${m[2]} appears twice.`],
  [/^Fila (\d+): la factura (\d+) ya existe\.$/, (m) => `Row ${m[1]}: invoice ${m[2]} already exists.`],
  [/^Fila (\d+): monto inválido\.$/, (m) => `Row ${m[1]}: invalid amount.`],
  [/^Fila (\d+): fecha inválida\.$/, (m) => `Row ${m[1]}: invalid date.`],
  [/^Se crearon (\d+) facturas\.$/, (m) => `${m[1]} invoices created.`],
  [/^Listo\. Se crearon (\d+) facturas\.$/, (m) => `Done. ${m[1]} invoices created.`],
  [/^Se crearon (\d+) de (\d+) facturas\. (.+)$/s, (m) => `${m[1]} of ${m[2]} invoices created. ${message(m[3], "en")}`],
  [/^Encabezado inválido\. Use: (.+)$/, (m) => `Invalid header. Use: ${m[1]}`],
  [/^Número de factura inválido: (.+)$/, (m) => `Invalid invoice number: ${m[1]}`],
  [/^Factura repetida: (.+)$/, (m) => `Invoice appears twice: ${m[1]}`],
  [/^Tienda desconocida: (.+)$/, (m) => `Unknown shop: ${m[1]}`],
  [/^Motorista desconocido: (.+)$/, (m) => `Unknown driver: ${m[1]}`],
  [/^Monto inválido: (.+)$/, (m) => `Invalid amount: ${m[1]}`],
];

const MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const EL_SALVADOR_OFFSET_MS = 6 * 60 * 60 * 1000; // UTC-6 all year

/** "17 nov" -> "Nov 17". */
function dayEn(es: string): string {
  const [day, month] = es.split(" ");
  const index = MONTHS_ES.indexOf(month);
  return index < 0 ? es : `${MONTHS_EN[index]} ${day}`;
}

/** An ISO timestamp -> "17 nov" or "Nov 17", in El Salvador time. */
export function formatDayIn(lang: Lang, iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  const local = new Date(time - EL_SALVADOR_OFFSET_MS);
  const day = local.getUTCDate();
  const month = local.getUTCMonth();
  return lang === "en" ? `${MONTHS_EN[month]} ${day}` : `${day} ${MONTHS_ES[month]}`;
}

function fill(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in vars ? String(vars[key]) : whole));
}

/** A Spanish template in the chosen language, with its values filled in. */
export function translate(lang: Lang, es: string, vars?: Vars): string {
  if (lang === "es") return fill(es, vars);
  const en = EN[es];
  if (en === undefined && process.env.NODE_ENV !== "production") console.warn(`[i18n] no English for: ${es}`);
  return fill(en ?? es, vars);
}

/** A message that arrived already written in Spanish, in the chosen language. Unknown ones stay as they are. */
export function message(text: string, lang: Lang): string {
  if (lang === "es") return text;
  const exact = EN[text];
  if (exact !== undefined) return exact;
  for (const [pattern, english] of PATTERNS) {
    const match = text.match(pattern);
    if (match) return english(match);
  }
  return text;
}

// ---------- the chosen language: localStorage for the app, a cookie for /demo ----------

function read(): Lang {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function setLang(lang: Lang): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // private mode: the switch still works for this page
  }
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new Event(CHANGED));
}

/** The chosen language. The server render is always Spanish; the browser switches right after. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, read, () => "es");
}

/** t() for screen text, msg() for messages, day() for dates, in the chosen language. */
export function useI18n() {
  const lang = useLang();
  const t = useCallback((es: string, vars?: Vars) => translate(lang, es, vars), [lang]);
  const msg = useCallback((text: string) => message(text, lang), [lang]);
  const day = useCallback((iso: string) => formatDayIn(lang, iso), [lang]);
  return { lang, t, msg, day };
}

/** Keeps <html lang> in step with the switch (screen readers, browser translation offers). */
export function useHtmlLang(lang: Lang): void {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
}

/** Text with <b>…</b> around one part, e.g. "Paga <b>$60.00</b> en 7 días." */
export function Bold({ text }: { text: string }) {
  const parts = text.split(/<b>|<\/b>/);
  return (
    <>
      {parts.map((part, index) => (index % 2 === 1 ? <strong key={index}>{part}</strong> : part))}
    </>
  );
}
