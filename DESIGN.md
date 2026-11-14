# Relay design: Papel de confianza

Shop owners in El Salvador already run credit on paper: the cuaderno de fiado, the printed receipt, the distributor's ledger. Paper is what they trust with money. Relay replaces the loan shark, not the paper, so every screen looks like the paper its user knows, made reliable.

| Role | Paper object | Layout |
|---|---|---|
| Shop | el recibo, the printed slip | `Slip` on phones, `Split` when there is room |
| Driver | la hoja de ruta, the delivery manifest | `Slip` on phones, `Split` sideways and on tablets |
| Distributor | el libro mayor, the ledger | `Shell` |

## The one rule

**Paper holds facts. Solid blue holds actions.**

- Anything you read (amounts, dates, names, history, status) sits on paper: warm off-white, hairline rules, near-square corners, no shadow. Depth comes from paper lying on the darker counter.
- Anything you tap is a filled blue control (the main action) or a clear outlined row (everything else). Nothing on paper responds to a tap except a "Ver detalles" text link and the "Ver productos" fold.
- Status is a rubber stamp, never a pill: PAGADA, CONFIRMADO, EN CRÉDITO, VENCE PRONTO, VENCIDA. Uppercase, tilted 4° to 6°, double border, worn ink. In a dense table it is a small upright mark. Always words plus colour.
- If it looks like paper, it isn't a button.

## Type

- **Atkinson Hyperlegible Next** (400, 600, 700): headings and all interface text.
- **IBM Plex Mono** (500, 600): every amount, invoice number, receipt line, receipt date and ledger column. Never body text.
- Outfit lives only inside the logo. Both text fonts are self-hosted with `next/font`, Latin subset, 54 KB together.
- Sizes are fluid from 320 to 1440 px (`text-body`, `text-lead`, `text-title`, `text-figure`, `text-total` in `app/globals.css`). Body is never under 16 px, labels never under 14 px. The invoice total is the largest thing in the product: `clamp(2.75rem, 10vw + 1rem, 4.5rem)`, mono 600, and it shrinks rather than clip.
- Amounts read `$ 48.50`: a thin gap after the sign, two decimals always, tabular, right-aligned in lists. Use `<Money>` on screen and `formatAmount()` in plain text.

## Colour

Light theme only. Tokens live in `@theme` in `app/globals.css`.

| Token | Value | Use |
|---|---|---|
| `counter` | `#e6e1d4` | page background |
| `paper` | `#fffdf8` | receipts, ledger, manifest (never pure white) |
| `paper-rule` | `#d9d3c4` | hairlines and dotted rules on paper |
| `counter-rule` | `#c4c2ba` | hairlines on the counter |
| `ink` | `#14202e` | amounts and main text (16.2:1 on paper) |
| `muted` | `#4f5a68` | secondary text (6.9:1 on paper, 5.4:1 on counter) |
| `brand` | `#0b4ea2` | actions, links, focus rings (white on it: 8.0:1) |
| `ok` `warn` `bad` `credit` | `#146c43` `#8f5200` `#b42318` `#5b3fa6` | stamps and status words |

Each status colour has a `-tint` for stamp fills only. No gradients, glass, blur, shadows or dark mode. `lib/contrast.test.ts` checks every pair: AA everywhere, AAA for ink.

## Shape

2 px corners on paper, 10 px on controls. A receipt is torn top and bottom (zig-zag drawn in CSS), its lines use dotted leaders, and its total sits under a double rule. A ledger has 1 px row rules, vertical rules beside its money columns, and a double rule above totals. No illustrations, emoji or decorative icons; the only drawn marks are chevrons.

## Components (`components/kit/`)

| File | What it holds |
|---|---|
| `layout.tsx` | `Slip` (one column, 28 rem), `Split` (facts and actions, one column under 40 rem of room), `Shell` (sidebar from 64 rem, else top bar and bottom navigation), `TopNav` |
| `paper.tsx` | `Receipt` and its parts: header, lines, fold, total, foot with the stamp slot |
| `stamp.tsx` | `Stamp`, large and `small` (which one an invoice gets: `lib/stamps.ts`) |
| `button.tsx` | `Button` (blue, `danger`, `busy`, `arriving`; `sm` is 44 px, for a top bar), `Held`, `ActionList`, `ActionRow`, `ActionLink`, `DetailLink` |
| `ledger.tsx` | `Ledger` (a table; under 60 rem of room its `secondary` columns fold into the row, under 40 rem each row is a `LedgerCard`), `LedgerFigures`, and the row actions `RowLink` and `RowButton` |
| `manifest.tsx` | `ManifestRow`: paper with a blue end |
| `field.tsx` | `Field`, `MoneyField`, `SelectField`, `PasswordField`, `FilterSelect` (a ledger's filters, one row) |
| `states.tsx` | `Loading` (a blank ruled slip), `Empty`, `Failure` with Reintentar, `Answer` (what the server said after an action) |
| `band.tsx` | the testnet band and the ES / EN switch |

Buttons are at least 52 px tall, 60 px on the driver's screens, with 8 px between neighbours. `/sistema` shows every component in every state.

A ledger row's actions (Historial, Repetir) show on hover or keyboard focus when there is a mouse and room for every column. Anywhere else the row ends in a chevron that unfolds them, together with the folded columns. The one action a small ledger exists for ("Recordar por WhatsApp", "Marcar efectivo entregado") is a column of its own and always visible.

## Motion

In a payment flow, motion never delays or blurs what happened.

- One moment of delight: when a payment completes the stamp lands once (scale 1.15 to 1, 180 ms, a short vibration where the phone allows).
- An invoice prints in once on first load (clip reveal, 240 ms).
- Everything else is press feedback: scale 0.97 in 120 ms. No staggered lists, scroll effects or page transitions.
- Nothing animates while a payment runs. `prefers-reduced-motion` gets opacity only. Hover styles apply only with a mouse.

## Behaviour the design wraps and never breaks

- A button that can move money ignores taps for 0.6 s after it appears (`arriving`, `useQuietOnArrival`), and ignores a tap that lands where the tap before it hit something else (`useSameSpotGuard`): that tap was meant for what used to be there.
- A refresh can add rows above a button. For a beat after its block changes place on the page, the button ignores taps (`useMovedGuard`, on the distributor's cash hand-in).
- When a payment removes a button, something inert holds its place (`Held`). The tap shield covers the screen while a payment runs and stays until the taps have stopped for 2.2 s (`settle(HOLD_MS)`).
- While data is stale the screen says "Cargando..." or locks its buttons.
- "Pagar este monto" stays inside its own row, never in a bar at the bottom.

## Words

Every string goes through `t("español", "English")`, in usted. Screens say "dólares digitales". The words blockchain, wallet and crypto never appear; "Ver detalles" is the only way to the public record.

## Checking a screen

`node scripts/screens.mjs <group>` opens each screen at 30 device sizes, from a 280 px fold to 1920 px, portrait and sideways, fails on sideways scroll, clipped text or a touch target under 44 px, and writes a contact sheet to `docs/screenshots/redesign/`. Add `--lang en`, `--zoom 2` (200% zoom), `--text 1.5` (large system text), `--size 1280x800` (one size) or, last, `--full` (the whole page, not the first screenful). Two frames are fixed: at 360x640 the shop sees all three pay options without scrolling (the slip tightens and folds its lines on a short screen: the `short:` and `tall:` variants), and at 1280x800 the distributor sees the header strip and ten invoice rows.

`node scripts/pay-taps.mjs` taps every pay button on the shop's invoice, and the distributor's cash hand-in with two drivers holding cash, twice quickly, then every second, then every two seconds. It fails unless each run makes one payment (or one hand-in) and no later tap reaches a button or a link.
