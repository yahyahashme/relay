# Sunday Nov 15 tracker (#39, #40, #41)

Written Wed Nov 11. **The "as of" notes below go stale: update the status column, don't trust it.** Status is one of: `not started`, `in progress`, `blocked`, `done`.

## The three deliverables

| Issue | What | Owner | Due | Time | Needs first | Working files | Status |
|---|---|---|---|---|---|---|---|
| #40 | Print and assemble the trifold | Jack, anyone free helps | Sun 6:00 PM ET | about 2 h | #37 layout (Sat) | `docs/trifold-assembly.md` | not started |
| #39 | Five timed run-throughs | Everyone | Sun | about 2 h | #37 pitch script (Sat), #35 video (Sat) | `docs/run-throughs/`, `scripts/run-times.mjs` | not started |
| #41 | Finals deck draft | Jack | Sun 11:59 PM ET | about 1.5 h | #37 (Sat), #56 slides (Sat) | `docs/deck-outline.md` | not started |

**Done means, copied from the issues** (tick them here when the evidence exists):

- [ ] #40: board built, QR tested on 3 phones, photo in the group chat. Evidence: `[photo link]`
- [ ] #39: five run-throughs under 3:00. Evidence: `node scripts/run-times.mjs` prints `[x]`.
- [ ] #39: weak answers rewritten in `docs/pitch.md`. Evidence: the same command prints `[x]`.
- [ ] #41: draft saved and shared in the group chat. Evidence: `[deck link]`

## Capacity check

Hours planned for Sun Nov 15 in context §3.1: **Yahya 5, Jack 4, Rohan 3, Ruhaan 0.**

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

## What is blocking us (as of Wed Nov 11, from GitHub)

| Blocker | Affects | Where it stands |
|---|---|---|
| Team name and pitcher | #41 slide 1, #39, trifold title | to be decided at #26 (in person, Wed Nov 11) |
| Pitch script v1 | #39, #41, #40 | PR #83 is open (#37). `docs/pitch.md` is not on `main` yet. |
| Worldwide number, expansion path | #41 slides 2 and 6 | PR #73 is open (#51) |
| Our fees and safety numbers in the fact sheet | #41 slides 5 and 6, #39 answers | PR #84 is open (#61) |
| Demo video | #39 (needs the real video), #41 slide 3 | PR #77 has the shot list only. The video is Yahya's (#35, Sat). |
| Final contract ID on the code slide | #41 slide 5, trifold if it shows code | PR #82 is a draft. It needs the final deploy (#52, Thu). Yahya then confirms the code is what's deployed. |
| Live app URL and QR code | #40 QR, #41 slide 3 | README v1 is PR #71, the QR is PR #70. Both open. |
| "What we heard from N people" | #41 slide 7, trifold right panel | #30. `docs/research.md` is not on `main` yet (PR #72). |
| Fee sponsorship wording | #41 slide 4 | PR #81 is a draft (#33) |
| Board and print shop | #40 | Do we own a board? Which shop is open Sunday? Not known yet. |
| Our ask, and whether the video plays at the finals | #41 slide 8 and timing | No answer in our notes (see `docs/deck-outline.md`, "Open questions") |

## After Sunday

- Tue Nov 17, 11 AM to 1 PM: finalist prep (Top 8 only). Bring the deck and a note-taker (#44).
- Wed Nov 18, 10:00 AM: final deck upload, no changes after (#45).
- Wed Nov 18, 5 to 7:30 PM: finals, a 3-minute pitch plus 3 minutes of Q&A.

## How to keep this useful

- Change a status the moment it changes, and put the evidence link in the box above.
- Run `node scripts/run-times.mjs` after every run-through. Don't average times in your head.
- If something here is wrong or out of date, fix this file in a small PR rather than leaving a note in the chat.
