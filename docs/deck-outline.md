# Finals deck outline (#41)

Scaffold written Wed Nov 11. **Draft v0: nothing here is final.** Every `[bracket]` is something we don't have yet. Slide text is short on purpose: each slide should be readable in 5 seconds (a headline of 8 words or fewer, and at most 3 lines of about 10 words).

## Rules

- Build it in Velocity's [template](https://docs.google.com/presentation/d/1RNYL7G9wOFROUY2XUyO6k37RBQuCF9kf/edit). PowerPoint, no animations.
- Draft due **Sun Nov 15, 11:59 PM ET** (#41). Finalist prep is Tue Nov 17, 11 AM to 1 PM: bring the deck and a note-taker (#44). **Final upload Wed Nov 18, 10:00 AM** through the [upload form](https://airtable.com/apprwC5wqwb4We3jo/paghYqabHAh8pDtac/form) (#45, Jack). No changes after upload.
- Finals are Wed Nov 18, 5 to 7:30 PM: a 3-minute pitch plus 3 minutes of Q&A.
- Every number comes from `docs/facts.md`, in its "Say this, not that" wording. The speaker script lives in `docs/pitch.md` (#37), not here.
- Product slides say "digital dollars". The Stellar detail goes on slides 4 and 5.

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

### 1. Name and one-line pitch
- **Message:** one idea the room can repeat.
- **Draft text:** `[NAME]` / "Pay the truck now, in cash, or in 7 days. No interest." (the tagline in the #37 draft, PR #83)
- **Source:** the name and pitcher are decided in #26 (Wed Nov 11).
- **Visual:** name large, no logo yet.
- **Needs:** the team name.

### 2. The problem
- **Message:** small shops can't get stock on credit, so they borrow from loan sharks.
- **Draft text:**
  - "$5.7 trillion in credit small businesses in developing countries need and can't get"
  - "$2 billion a year: what distributors sell to El Salvador's 50,000+ neighbourhood shops (Conamype estimate)"
  - "About $35 per $100: what a loan shark charges (2019 survey)"
- **Source:** facts entries 22 (in PR #73, not on `main` yet), 1, 3 and 10.
- **Wording rule:** say "85,265 shops and small retailers" or "more than 50,000 neighbourhood shops", never "85,265 neighbourhood shops" (facts, "Say this, not that"). Issue #41 says "85,265 tiendas"; use the safe wording instead.
- **Visual:** three big numbers, no chart.

### 3. The product
- **Message:** one shop screen, three ways to pay.
- **Draft text:** "Pay now" / "Pay in 7 days, no interest" / "Cash, confirmed by two taps". Footer: "Live on Stellar testnet with test dollars. Cash-in is simulated."
- **Visual:** 3 phone screenshots of the live app, captured at 360 px wide with the grey testnet banner in frame: the shop's pay screen, the shop's "Debe ... vence ..." screen after a credit payment, the driver's "Recibí efectivo" screen. `docs/screenshots/mock-screens-nov10.png` is a mock, so don't use it.
- **Needs:** the live app on a stable URL (README v1, PR #71) and a fresh capture after the Thursday redeploy.

### 4. How it works on Stellar
- **Message:** the rules live in a public contract, and names stay off it.
- **Visual:** `docs/img/architecture.png` (from #56). It currently says the server "Will pay the network fees (fee sponsorship)". When #33 merges, change that to "Pays the network fees" in `docs/slides/architecture.html` and re-render with `node docs/slides/render.mjs`.
- **Draft text:** none beyond the image.

### 5. The code
- **Message:** the credit rules are real contract code, not a mock-up.
- **Visual:** `docs/img/code-slide.png` (from #56). **Not ready:** it still shows PENDING where the contract ID goes. Fix it after the final deploy: PR #82 repairs the render after #66, then re-render with the final ID from `config/testnet.json`.
- **Needs:** Yahya confirms the code on the slide is what's deployed (the open "Done means" line of #56).

### 6. Money in 30 seconds, and go-to-market
- **Message:** distributors pay, shops never do.
- **Draft text:**
  - "$100 sale, paid in 7 days: the pool pays the distributor $98.50 now"
  - "The 1.5% fee: $0.75 buffer, $0.50 lenders, $0.25 us. Cash or digital: 0.1%."
  - "Start with one distributor's routes. Then Ecuador and Panama (they use the US dollar)."
- **Source:** facts entry 29 (PR #84) for the fees; entries 25 and 26 (PR #73) for Ecuador and Panama; context §14 for "one distributor first".
- **Never say:** "$98.40", "$0.35 per credit sale", a "$2.5 million" revenue figure (facts, "Never use").
- **Visual:** the $100 example as 3 rows.

### 7. Risk #1, our plan, what users told us
- **Message:** we name the hard part before a judge does.
- **Draft text:**
  - "Risk #1: turning a shop's cash into digital dollars. Not solved. Our demo simulates it."
  - "Plan: shops repay weekly like a bill. A licensed partner converts in bulk and does KYC on shops and KYB on distributors."
  - "We spoke to `[N]` people. Because of them we changed `[what we changed]`."
- **Source:** context §6 and §13; `docs/security.md` section 3 (demo versus real).
- **Rule:** our plan is a plan, not a deal. No bank, cash-in company or lender has agreed to anything, so don't word it as if one had.
- **Needs:** the real count and the one change, from #30. `docs/research.md` isn't on `main` yet (PR #72).

### 8. Team and our ask
- **Message:** who we are and what we want next.
- **Draft text:** `[team names]`. Yahya: contract and app. Jack: security review, slides, one-pager. Rohan: research and facts. Ruhaan: helper code. Then `[our ask]`.
- **Open decision:** our notes never say what we ask for. Candidates to choose from: introductions to a distributor, a cash-in partner and a licensed lender (the advisors' advice was to partner with banks and cash-in companies, context §14). The team picks one line.

## Before we can build it (as of Wed Nov 11)

| Input | Where it comes from | Status |
|---|---|---|
| Team name, pitcher | #26 (Wed Nov 11) | open |
| Pitch script v1 | #37, PR #83 | open PR |
| Worldwide number and expansion path | #51, PR #73 | open PR |
| Our fees, limits, safety numbers | facts entries 29 to 35, PR #84 | open PR |
| "What we heard from N people" | #30, PR #72 | open |
| Real phone screenshots | live app, captured by Jack | not started |
| Code slide with the real contract ID | #56 follow-up, PR #82, Thursday redeploy (#52) | blocked on the redeploy |
| Fee sponsorship wording on slide 4 | #33, PR #81 | open draft |
| Our ask | team decision | open |

## How to build it

1. Open the template and make a copy. Keep its layouts and fonts.
2. Paste the slide text above, replacing every `[bracket]`.
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
