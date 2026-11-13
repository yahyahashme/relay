# Finals deck outline (#41)

Scaffold written Wed Nov 11; the slide text was added the same day. **The text to paste into the template is in `docs/deck-slides.md`.** This file keeps the plan: the time budget, the source and visual for each slide, what each still needs, the screenshot steps and the open questions. Every `[bracket]` is something we don't have yet.

## Rules

- Build it in Velocity's [template](https://docs.google.com/presentation/d/1RNYL7G9wOFROUY2XUyO6k37RBQuCF9kf/edit). PowerPoint, no animations.
- Draft due **Sun Nov 15, 11:59 PM ET** (#41). Finalist prep is Tue Nov 17, 11 AM to 1 PM: bring the deck and a note-taker (#44). **Final upload Wed Nov 18, 10:00 AM** through the [upload form](https://airtable.com/apprwC5wqwb4We3jo/paghYqabHAh8pDtac/form) (#45, Jack). No changes after upload.
- Finals are Wed Nov 18, 5 to 7:30 PM: a 3-minute pitch plus 3 minutes of Q&A.
- Every number comes from `docs/facts.md`, in its "Say this, not that" wording. The speaker script lives in `docs/pitch.md` (#37), not here.
- Product slides say "digital dollars". The Stellar detail goes on slides 4 and 5.
- Each slide: a headline of 8 words or fewer and at most 3 lines of about 10 words, readable in 5 seconds.

## Time budget (a proposal, 3:00 in all)

| Slide | Seconds | Running total |
|---|---|---|
| 1. Name and pitch | 10 | 0:10 |
| 2. The problem | 30 | 0:40 |
| 3. The product | 25 | 1:05 |
| 4. How it works on Stellar | 20 | 1:25 |
| 5. The code | 15 | 1:40 |
| 6. Money and go-to-market | 30 | 2:10 |
| 7. Risk #1, our plan, what users told us | 30 | 2:40 |
| 8. Team and our ask | 20 | 3:00 |

If the 1-minute video plays at the finals, slide 3 stands in for it and this budget changes. Whether it plays is not stated anywhere in our notes (see "Open questions").

## The slides

The words for each slide are in `docs/deck-slides.md`, under the same number.

### 1. Name and one-line pitch
- **Message:** one idea the room can repeat.
- **Source:** the name and pitcher are decided in #26 (Wed Nov 11). The tagline is from the #37 draft (PR #83).
- **Visual:** name large, no logo yet.
- **Needs:** the team name.

### 2. The problem
- **Message:** small shops can't get stock on credit, so they borrow from loan sharks.
- **Source:** facts entries 22 (in PR #73, not on `main` yet), 1, 3 and 10.
- **Wording rule:** say "85,265 shops and small retailers" or "more than 50,000 neighbourhood shops", never "85,265 neighbourhood shops" (facts, "Say this, not that"). Issue #41 says "85,265 tiendas"; use the safe wording instead.
- **Visual:** three big numbers, no chart.

### 3. The product
- **Message:** one shop screen, three ways to pay.
- **Visual:** 3 phone screenshots of the live app, captured at 360 px wide with the testnet banner in frame: the shop's pay screen, the shop's "Debe ... vence ..." screen after a credit payment, the driver's "Recibí efectivo" screen. Steps are in "Capturing the three phone screenshots" below. `docs/screenshots/mock-screens-nov10.png` is a mock, so don't use it.
- **Needs:** the live app on a stable URL (README v1, PR #71) and a fresh capture after the Thursday redeploy.

### 4. How it works on Stellar
- **Message:** the rules live in a public contract, and names stay off it.
- **Visual:** `docs/img/architecture.png` (from #56). It currently says the server "Will pay the network fees (fee sponsorship)". When #33 (PR #81) merges, change that to "Pays the network fees" in `docs/slides/architecture.html` and re-render with `node docs/slides/render.mjs`.

### 5. The code
- **Message:** the credit rules are real contract code, not a mock-up.
- **Visual:** `docs/img/code-slide.png` (from #56). **Not ready:** it still shows PENDING where the contract ID goes. PR #82 repairs the render after #66 and adds `SCALE=3 node docs/slides/render.mjs` for print-size images. After the final deploy (#52): `git fetch origin && git merge origin/main` on `56-code-slide-id`, run `node docs/slides/render.mjs`, check the ID on the image equals `contracts.routeLedger` in `config/testnet.json`, commit the PNG, and ask Yahya to confirm the code on the slide is what's deployed.
- **Needs:** Yahya's confirmation (the open "Done means" line of #56).

### 6. Money in 30 seconds, and go-to-market
- **Message:** distributors pay, shops never do.
- **Source:** facts entry 29 (PR #84) for the fees; entries 25 and 26 (PR #73) for Ecuador and Panama; context §14 for "one distributor first".
- **Never say:** "$98.40", "$0.35 per credit sale", a "$2.5 million" revenue figure (facts, "Never use").
- **Visual:** the $100 example as 3 rows.

### 7. Risk #1, our plan, what users told us
- **Message:** we name the hard part before a judge does.
- **Source:** context §6 and §13; `docs/security.md` section 3 (demo versus real).
- **Rule:** our plan is a plan, not a deal. No bank, cash-in company or lender has agreed to anything, so don't word it as if one had.
- **Needs:** the real count and the one change, from #30. `docs/research.md` isn't on `main` yet (PR #72).

### 8. Team and our ask
- **Message:** who we are and what we want next.
- **Source:** the roles are in context §3.1.
- **Open decision:** our notes never say what we ask for. Candidates to choose from: introductions to a distributor, a cash-in partner and a licensed lender (the advisors' advice was to partner with banks and cash-in companies, context §14). The team picks one line.

## Capturing the three phone screenshots

For slide 3 and the trifold's middle panel. They have to come from the live app at 360 px wide, with the banner "Demo en testnet · dinero de prueba · cash-in simulado" at the top of each. (It is the first line of every page, not a sticky bar, so capture with the page scrolled to the top.) They are taken by hand: it needs clicks, and shot 2 changes the shared demo.

**When:** after the Thursday redeploy (#52), because the redeploy gives a new contract and new demo invoices. Best in the same sitting as Yahya's video (#35), so the demo is only changed once. Shot 2 makes a real testnet payment with test dollars and changes what the video shows (see "Side effects").

**Setup (Chrome on a Mac)**
1. Open https://tiendas-stellar.vercel.app. Check the testnet banner is at the top and the page isn't an old preview.
2. Open Chrome DevTools (Cmd+Opt+I), then the device toolbar (Cmd+Shift+M). In the toolbar choose "Responsive" and type width **360** and height **740**. Click the toolbar's three dots, choose "Add device pixel ratio", and set it to **3**.
3. To capture: three dots in the device toolbar, "Capture screenshot" (not "full size"). It saves only the 360 px phone view, without DevTools or the browser bar, as a PNG in Downloads about 1080 px wide.

**Shots**
1. **Shop pay screen.** Open the Tienda Rosa invoice: `/ruta/motorista-1`, tap Tienda Rosa's row, then open the link the QR points to (`/tienda/<invoice id>`), or go to it directly. Scroll to the top. You should see the amount and three buttons: **Pagar ahora**, **Pagar en 7 días**, **Pagué en efectivo**. Capture before tapping anything. Save as `live-1-pay.png`.
2. **Shop debt screen.** Open a different shop's unpaid invoice (Tienda Don Luis, `/ruta/motorista-1`). Tap **Pagar en 7 días** and wait for the green check ("Listo. Tiene hasta el ... para pagar ..."). Tap **Mi cuenta**. The page shows **Debe $...**, the due date and the limit. Capture it. Save as `live-2-debt.png`. Then tap **Pagar deuda** to clear it (see "Side effects").
3. **Driver cash screen.** Go to `/ruta/motorista-1`, tap a stop so its QR opens. The screen shows the QR and the **Recibí efectivo** button. Capture it **without tapping the button** (tapping starts a cash claim). Save as `live-3-cash.png`.

**Check each file before using it**
- The banner text is readable at the top.
- The layout is the 360 px phone layout (nothing cut off at the sides), with no browser bar or DevTools in the frame.
- Nothing secret on screen: no key (starts with S), no `.env` text, no personal phone number.
- Save the three files in `docs/screenshots/` and commit them in a small PR.

**Side effects.** Shot 2 moves test dollars and uses up an invoice. Repaying (**Pagar deuda**) clears the debt, but a repayment after a loan of $40 or more raises that shop's limit by $25, once per credit period, so that shop's limit is then $225, not $200. Tell Yahya which shop and invoice you used, before he records the video. The video's own script wants Tienda Don Luis at $0 owed (`docs/demo-video.md`, PR #77).

## Before we can build it (as of Wed Nov 11)

| Input | Where it comes from | Status |
|---|---|---|
| Team name, pitcher | #26 (Wed Nov 11) | open |
| Pitch script v1 | #37, PR #83 | open PR |
| Worldwide number and expansion path | #51, PR #73 | open PR |
| Our fees, limits, safety numbers | facts entries 29 to 35, PR #84 | open PR |
| "What we heard from N people" | #30, PR #72 | open |
| Slide text for the 8 slides | `docs/deck-slides.md` | written (brackets still open) |
| Real phone screenshots | live app, captured by Jack, steps above | not started (after the redeploy) |
| Code slide with the real contract ID | #56 follow-up, PR #82, Thursday redeploy (#52) | blocked on the redeploy |
| Print-size slide images | `SCALE=3 node docs/slides/render.mjs` (PR #82) | option written; render after the redeploy |
| Fee sponsorship wording on slide 4 | #33, PR #81 | open draft |
| Our ask | team decision | open |

## How to build it

1. Open the template and make a copy. Keep its layouts and fonts.
2. Paste the slide text from `docs/deck-slides.md`, replacing every `[bracket]`.
3. Insert the images from `docs/img/` and the three screenshots. Our PNGs are 1920 x 1080 (16:9); check the template is 16:9 before relying on that.
4. Check there are no animations or transitions on any slide.
5. Download as PowerPoint (.pptx) and open it in PowerPoint itself, not only in Google Slides, to check fonts and layout.
6. Save it where all four of us can open it, and post the link in the group chat.

## Open questions (ask Velocity, or decide as a team)

1. Does the 1-minute video play at the finals, or is it a showcase-only item?
2. Is the template 16:9?
3. May the uploaded deck include backup slides after slide 8 (for Q&A), or is it exactly the pitch?
4. What is our ask (slide 8)?

## Done means (from #41)

- [ ] Draft saved and shared in the group chat. Link: `[add the link here]`
