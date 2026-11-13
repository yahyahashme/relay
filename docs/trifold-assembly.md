# Trifold print and assembly (#40)

Scaffold written Wed Nov 11. This is the checklist and the spec; the content of the board is in `docs/pitch.md` (#37). Fill in the blanks as we learn them.

**Deadline:** Sun Nov 15, 6:00 PM ET, with a photo of the finished board in the group chat. **Owner:** Jack, and anyone free helps. **Time:** about 2 h of assembly, plus the print shop's turnaround.
**Needs first:** the print-ready layout from #37 (Sat Nov 14). **Then:** the showcase is Mon Nov 16 (setup 4:00 PM, judging 4:30 to 7:00 PM, Innovation Arena, 280 Joseph St, Kitchener).

## 1. Board spec

| Item | Spec | Status |
|---|---|---|
| Board | Tri-fold, 36 x 48 in (the size #40 names) | **Do we have one?** If not, email velocity.events@uwaterloo.ca, subject "Blockchain Innovation Challenge Powered by Stellar". Ask early. |
| Panels | Most 36 x 48 in tri-fold boards fold as 12 in + 24 in + 12 in (a wide centre, two narrow wings). The #37 draft (PR #83) assumes three equal panels of about 16 x 36 in. **Measure our board before the layout is final**, because the two layouts are very different. | `[measured: ___ + ___ + ___ in]` |
| Type sizes | Title about 96 pt, headings 30 to 40 pt, body 24 to 32 pt (Velocity's tips) | from context §3.8 |
| Text share | At most 25% of the board is text | check on the real layout |
| Message | Two key points only. Sketch on paper, and have someone outside the team read it first. | from context §3.8 |
| Layout | Left: the problem. Middle: how it works (3 phone screenshots, the QR code). Right: who pays and why, Risk #1 and our plan, "what we heard". | from context §3.8 and the #37 draft |

## 2. Print spec

| Item | Spec | Status |
|---|---|---|
| File | The print-ready layout from #37, as a PDF if the shop accepts it. Keep one copy in the shared folder and post the link in the group chat. | `[link]` |
| Size | Decide with the shop: one print per panel, mounted on the board, or one large print. Per-panel prints are easier to align and to replace if one is wrong. | `[decided: ___]` |
| Image sharpness | Our PNGs in `docs/img/` are 1920 x 1080 px. Placed 12 in wide that is 160 pixels per inch; placed 24 in wide it is only 80, which will look soft. Re-render the architecture diagram and the code slide at 2x or 3x for print (the render script draws at 1x: change `--force-device-scale-factor=1` in `docs/slides/render.mjs`). Text should stay as text in the PDF, not a picture. | to do on Sat |
| Finish | Ask the shop: matte or gloss. Gloss shows glare under showcase lights. | ask |
| Proof | Ask for a small proof or check the PDF at 100% before the full print. | ask |

## 3. The QR code

| Item | Spec | Status |
|---|---|---|
| Points to | The live app's final URL (README v1, PR #71; the live URL is added after the Vercel deploy). The demo QR image is `public/qr-demo.png` (#55, PR #70, not merged). | `[final URL: ___]` |
| Order | Make the QR **last**, after the URL is final. A QR that points at an old URL fails silently. | |
| Size | Our suggestion: at least 4 x 4 in with a clear white border, and a test from arm's length (about 1 m). Not a standard, so the phone test below decides. | |
| Caption | "Scan to try it. Live on Stellar testnet with test dollars." | |

## 4. Questions for the print shop (Sat)

Call or email at least two. Write the answers in the table in section 7.

1. Are you open Sunday, and until what time? Last time for pickup?
2. How long does a 36 x 48 in print (or three panel prints) take? Can it be ready by Sunday morning?
3. What file do you want (PDF, size, resolution, bleed)? Where do we send it?
4. Matte or gloss, and what paper? Does it curl or stay flat for mounting?
5. Total cost, and how do we pay?
6. Do you sell foam board or spray adhesive for mounting, in case we need it?

## 5. Timeline (working back from Sunday 6:00 PM)

| When | What | Who |
|---|---|---|
| Sat Nov 14, morning | Print shop picked, hours and turnaround known, board measured | Jack |
| Sat Nov 14, once #37 is final | File sent to the shop. QR made from the final URL. Say in the group chat that it was sent. | Jack, Yahya |
| Sun Nov 15, `[pickup time]` | Pick up the prints. Check every panel for typos and colour before leaving the shop. | `[who]` |
| Sun Nov 15, assembly (about 2 h) | Section 6. **Aim to finish by 4:00 PM**, which leaves two hours of slack before the deadline. | Jack and helpers |
| Sun Nov 15, by 6:00 PM | QR test on 3 phones (section 7). Photo in the group chat. | Jack |
| Mon Nov 16 | Carry the board to the showcase. Who has a car? `[who]` | |

## 6. Assembly checklist

**Bring:** the prints, the board, a ruler or tape measure, a craft knife, a cutting mat or thick card, scissors, a pencil, painter's tape, your chosen adhesive (double-sided tape, spray mount or glue), a few spare strips of tape, paper towels, 3 phones, Wi-Fi or a hotspot.

- [ ] Lay the board flat, fully open. Wipe it.
- [ ] Dry-fit every print with painter's tape. Check margins and that nothing crosses a fold.
- [ ] Mark the corners lightly in pencil.
- [ ] Mount the centre panel first, then the wings.
- [ ] Press out bubbles from the middle outwards. Let it set.
- [ ] Fold and unfold the board once to check nothing catches.
- [ ] Stand it up and read it from 2 m: the title and the two key points must be readable.
- [ ] Have someone outside the team read it in 30 seconds and say what it is about.
- [ ] Do the QR test (section 7).
- [ ] Take a photo of the finished board and post it in the group chat.

**Also bring on Nov 16** (context §3.8): laptop and charger, a phone with the shop page open, the video downloaded in case the Wi-Fi fails, a phone hotspot, and a printed QR code to the app.

## 7. Fill-in tables

**Print shop answers**

| Shop | Open Sunday until | Turnaround | Cost | File they want | Chosen? |
|---|---|---|---|---|---|
| `[name]` | | | | | |
| `[name]` | | | | | |

**QR test (3 different phones; the printed code, not the screen)**

| # | Phone and OS | Camera app or scanner | Distance | Opens the demo? | Seconds to load |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

If any phone fails, fix the code size, glare or URL, reprint the QR if needed, and test all three again.

## Done means (from #40)

- [ ] Board built, QR tested on 3 phones, photo in the group chat.
