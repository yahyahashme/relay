# Sunday Nov 15 tracker (#39, #40, #41)

Written Wed Nov 11. Refreshed Thu Nov 12 evening against GitHub (`gh pr view`, `git log origin/main`): the blockers table and the statuses below are as of that evening. **The "as of" notes below go stale: update the status column, don't trust it.** Status is one of: `not started`, `in progress`, `blocked`, `done`.

## The three deliverables

| Issue | What | Owner | Due | Time | Needs first | Working files | Status |
|---|---|---|---|---|---|---|---|
| #40 | Print and assemble the trifold | Jack, anyone free helps | Sun 6:00 PM ET | about 2 h | #37 layout (Sat) | `docs/trifold-assembly.md` | not started: the print shop shortlist is in its section 8 (only two Staples stores list Sunday hours, and Staples' wide-format limit is 24 x 36 in). No shop chosen, board not measured, nothing printed. |
| #39 | Five timed run-throughs | Everyone | Sun | about 2 h | #37 pitch script (Sat), #35 video (Sat) | `docs/run-throughs/`, `scripts/run-times.mjs` | not started: the script is in PR #83 (open) and the video is not done (#35 is open) |
| #41 | Finals deck draft | Jack | Sun 11:59 PM ET | about 1.5 h | #37 (Sat), #56 slides (Sat) | `docs/deck-slides.md` (the text), `docs/deck-outline.md` (sources, screenshot steps) | in progress: the 8 slides' text is written; the template, screenshots and final code slide are not. The redeploy is merged, so the screenshots and the code slide can start. |

**Done means, copied from the issues** (tick them here when the evidence exists):

- [ ] #40: board built, QR tested on 3 phones, photo in the group chat. Evidence: `[photo link]`
- [ ] #39: five run-throughs under 3:00. Evidence: `node scripts/run-times.mjs` prints `[x]`.
- [ ] #39: weak answers rewritten in `docs/pitch.md`. Evidence: the same command prints `[x]`.
- [ ] #41: draft saved and shared in the group chat. Evidence: `[deck link]`

## Capacity check

Hours planned for Sun Nov 15 in context §3.1: **Yahya 5, Jack 4, Rohan 3, Ruhaan 0.** (Rechecked Wed Nov 11: the plan has not changed, so the table below still stands. The #41 estimate is unchanged too; with the slide text written, most of it is now pasting into the template and capturing screenshots.)

| Person | Sunday load from the issues | Hours planned | Gap |
|---|---|---|---|
| Jack | #40 (2 h) + #41 (1.5 h) + #39 (2 h) = 5.5 h | 4 h | **1.5 h over** |
| Ruhaan | #39 (2 h, he is an assignee) | 0 h | **2 h over** |
| Yahya, Rohan | #39 (2 h each) | 5 h, 3 h | fine |

Ways to close the gap (the team picks one; none is decided):
- Start the deck on Saturday night once #37 is final. It reuses the trifold content.
- Ask Yahya or Rohan to help assemble the trifold while Jack starts the deck.
- Run #39 with three people, and write down Ruhaan's hours if he can join.

## Suggested order for Sunday

1. **#40 first.** It has the earliest deadline (6:00 PM) and depends on the print shop's hours, which we don't know yet. Target: board finished by 4:00 PM.
2. **#39 when all hands are free.** It needs the pitcher, the video, and at least one asker and one timekeeper. Aim to finish all five runs in one sitting and fix weak answers straight after.
3. **#41 last.** It is due at 11:59 PM and reuses the trifold text. Weak answers from #39 may change a slide, so doing it after the run-throughs saves rework.

| Time block | Who | What |
|---|---|---|
| `[ ]` | | |
| `[ ]` | | |
| `[ ]` | | |

## What is blocking us (as of Thu Nov 12 evening, from GitHub)

Rows that start "Cleared" are merged and stay in the table so the history is visible. Delete them once nobody needs them.

| Blocker | Affects | Where it stands |
|---|---|---|
| Team name and pitcher | #41 slide 1, #39, trifold title | **Open.** #26 is closed and PR #86 (the checklist and the way to pick) is merged, but no name or pitcher is written in the repo: `lib/brand.ts` on `main` still says "Nombre pendiente" and PR #83 still has `[NAME]`. PR #100 (branch `26-name-relay`) proposes a name and is open, not merged. Ask in the group chat who the pitcher is. |
| Pitch script v1 | #39, #41, #40 | **Open.** PR #83 (#37) is open. Yahya's first review requested changes (advisors by role only, a leftover table header, two stale rows). Jack answered in 138d474 and the source-check commits (c5cba6f, e5a4d51); the branch now names advisors by role. Yahya's second review says it is ready to merge once the name is picked. GitHub still shows "changes requested", so Yahya has to re-approve. `docs/pitch.md` is not on `main` yet. The script totals 2:54.1, which leaves 5.9 s of slack. |
| Worldwide number, expansion path | #41 slides 2 and 6 | **Cleared.** PR #73 (#51) merged Thu Nov 12: facts entries 22 to 28 are on `main`. |
| Our fees and safety numbers in the fact sheet | #41 slides 5 and 6, #39 answers | **Cleared.** PR #84 (#61) merged Thu Nov 12: facts entries 29 to 35 are on `main`. Entries 36 to 40 (Stellar speed, fees, MoneyGram, legal tender, delivery crews) are on `main` too. More entries (41 to 56) are in PR #95, still open. |
| Demo video | #39 (needs the real video), #41 slide 3 | PR #77 (the shot list, `docs/demo-video.md`) merged. The redeploy is merged, so Yahya can record now. The video is Yahya's (#35, Sat) and the issue is still open. `docs/demo-video.md` still shows the contract ID from before the redeploy; use `config/testnet.json`. |
| Final contract ID on the code slide | #41 slide 5, trifold if it shows code | The redeploy (#52, PR #90) merged Thu Nov 12, so the final ID is on `main`: `contracts.routeLedger` in `config/testnet.json`. PR #82 (#56) is **still a draft**. To finish it: merge `origin/main` into its branch, run `node docs/slides/render.mjs` (`SCALE=3` for print), check the ID on the image equals `contracts.routeLedger`, and ask Yahya to confirm the code shown is what is deployed. |
| Live app URL and QR code | #40 QR, #41 slide 3 | **Cleared, with one check left.** README v1 (PR #71) and the QR (PR #70, `public/qr-demo.png`, opens `/demo`) are merged, and the README names https://tiendas-stellar.vercel.app. Before printing the QR, confirm with Yahya that this URL is final. |
| Real phone screenshots | #41 slide 3, trifold middle panel | Not captured: `docs/screenshots/` holds only `mock-screens-nov10.png`. The redeploy is merged, so they can be taken now. Steps are in `docs/deck-outline.md`; ideally in Yahya's video session (shot 2 changes the shared demo). |
| "What we heard from N people" | #41 slide 7, trifold right panel | **Open.** PR #72 merged, so `docs/research.md` is on `main`, but it holds the advisor calls only. The walkthroughs (#30) are open and not logged yet, so there is no N. |
| Fee sponsorship wording | #41 slide 4 | PR #81 (#33) is a **draft with merge conflicts**. Yahya wants it kept out of the pitch until after the finals: nothing in the pitch, deck or one-pager should claim fee sponsorship as built. |
| Partner replies and Risk #1 evidence | #39 Risk #1 answers, #41 slide 6 | PR #89 (#10, partner outreach log and the anchor check) is open, has merge conflicts and "changes requested". Related research PRs, all open: #95 (facts 41 to 56), #96 (what cash-in costs today), #97 (laws we touch), #98 (the 1.5% fee in yearly terms), #99 (first customer pilot). |
| Board and print shop | #40 | Board: not known yet. Print shop: the shortlist is in `docs/trifold-assembly.md` section 8. Only two Staples stores list Sunday hours, and Staples' wide-format limit is 24 x 36 in, so a 36 x 48 in print on Sunday is not confirmed. Jack must call. |
| Our ask, and whether the video plays at the finals | #41 slide 8 and timing | No answer in our notes (see `docs/deck-outline.md`, "Open questions"). |

## After Sunday

- The packing list, minute-by-minute plan, notes template and pre-upload checklist for all of these are in `docs/showcase-and-finals.md`.
- Mon Nov 16, 4:00 to 7:00 PM: Project Showcase, Innovation Arena, Kitchener (#43).
- Tue Nov 17, 11 AM to 1 PM: finalist prep (Top 8 only). Bring the deck and a note-taker (#44).
- Wed Nov 18, 10:00 AM: final deck upload, no changes after (#45).
- Wed Nov 18, 5 to 7:30 PM: finals, a 3-minute pitch plus 3 minutes of Q&A.

## How to keep this useful

- Change a status the moment it changes, and put the evidence link in the box above.
- Run `node scripts/run-times.mjs` after every run-through. Don't average times in your head.
- If something here is wrong or out of date, fix this file in a small PR rather than leaving a note in the chat.
