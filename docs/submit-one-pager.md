# Submitting the one-pager: Thursday call and Friday form (#31)

The form decides the Top 16. It closes **Fri Nov 13, 8:30 AM ET**. We read and fix the one-pager on the **Thu Nov 12, 9:00 PM** call, and Jack submits by 9:30 PM so Friday morning is only a spare. **Nothing has been submitted.**

**Checked on Wed Nov 11 against** `docs/one-pager.md` at commit `9d1c6b7` on branch `8-one-pager` (PR #64, open, so the file is **not on `main`** yet), `docs/facts.md` on `main`, `config/testnet.json` and `contracts/route_ledger/src/lib.rs`. **Re-read on Thu Nov 12 against `fab1869`**, the latest commit on `8-one-pager`: commits `0be3b1a` and `fab1869` fixed the claims that findings 2, 3, 4 and 6 flagged (section 2 says which, and what is still open). If the one-pager changes again, run the script (section 7) again. **Run the checker yourself and don't trust any count written here:** another person is still clearing markers and placeholders. Every FAIL it prints must be fixed or consciously accepted (say why out loud on the call). Three of them are the form fields (team number, team name, Devpost link): people fill those, not a script.

## 1. What has to be true before 9 PM

| What | Who | By | Why it matters |
|---|---|---|---|
| PR #64 merged, or everyone reads the file from branch `8-one-pager` | Yahya reviews | Thu 8 PM | `docs/one-pager.md` is not on `main`. |
| Team name chosen (#26) | Everyone | Wed 7 PM | Form field 2 can't say "TBD". |
| Final rebuild merged (#52): new contract ID in `config/testnet.json` | Yahya | Thu 2 PM | Answer 6 has the contract ID, and it changes on a rebuild (finding 1). |
| Production URL and README (#28); Yahya posts the URL in the chat (#28 step 5) | Yahya | Thu 8:30 PM | Answer 6 has the URL. #28 step 1 may move it to a name-based domain: answer 6 must use the exact URL Yahya posts. |
| 2 or 3 phone screenshots (pay now, pay in 7 days, cuenta page) posted in the chat (#25 step 7; #25 is closed) | Yahya | Thu 8 PM | #31 step 3. Have them saved on Jack's computer before the call, in case the form takes a file (finding 9). |
| Worldwide number merged as `docs/facts.md` entry 22 (#73) | Rohan | Thu | Today the $5.7 trillion has a source only inside an open PR. |
| Real outreach counts for answer 6 (#30; `docs/research.md` doesn't exist yet) | Rohan | Thu 9 PM | Answer 6 has four `[N]` placeholders. Honest numbers only. |
| A teammate who didn't write them opens the links in `docs/facts.md` entries 36 to 40 (PR #84) and confirms each quote | Any teammate | Before the call | They back the new Stellar, MoneyGram and delivery-crew sentences. Each entry still says "Checked: Pending". Checklist item 4. |
| Someone looks at MoneyGram's coverage map for El Salvador and confirms cash-in is not offered | Yahya or any teammate | Before the call | Answer 6 says "as far as we found". Nobody has checked the map by eye. Checklist item 3. |
| Devpost project exists, or we know whether field 7 is required | Yahya | Thu 9 PM | Field 7 is still TODO. |
| Team number | Jack | on the call | Field 1 is "pick our number from the form's list". |

## 2. Findings from the number check

The check is `scripts/check-one-pager.mjs` plus the table in section 3. Severity: **HIGH** can embarrass us in front of a judge, **MED** needs a source or a cut (#31 step 2: "fix anything without a source, or cut it"), **LOW** is cleanup. Findings marked **RESOLVED** were fixed in the one-pager by commits `0be3b1a` and `fab1869` on `origin/8-one-pager` (Thu Nov 12); the rest are still open.

| # | Sev. | Where | Problem | Proposed fix |
|---|---|---|---|---|
| 1 | HIGH | Answer 6 | **The contract ID will be stale.** `CAPQ6ZDD…` is `contracts.routeLedger` today, but #52 step 9 rebuilds everything on Thu ("`setup.sh --fresh && deploy.sh`", due 2 PM). As of Thu 4:45 PM it has not landed: #80 is already on `main` but `config/testnet.json` still holds the first deploy's ID, and a branch `revert-80-until-redeploy` exists in case the redeploy slips (ask Yahya which way it goes). A judge who looks up the old ID finds a contract from before the fixes. | After #52 is merged, run `git fetch origin && git merge origin/main` in the checkout you run the script from, then copy the ID from `config/testnet.json` into answer 6. The script fails if the answer's ID differs from this checkout's file, **and** if this checkout's file differs from `origin/main`'s (without that second check, a stale file passes a stale ID). **If the rebuild isn't done by 9 PM, drop the ID and write "contract ID in our README"** (the README table is part of #52 and #28). |
| 2 | HIGH | Answer 6 | **Wording RESOLVED in `fab1869`; one check still open.** It was "MoneyGram covers cash-out only", which was not established. It now says "MoneyGram lists cash-out points in El Salvador but, as far as we found, not cash-in." That matches what we saw (Yahya's Nov 7 locator check). But moneygram.com/stellar says "Cash-out is available in 170+ countries and territories and cash-in in 25+ countries", and our reading that El Salvador is cash-out only comes from the page's HTML, not from a person looking at the coverage map (`docs/facts.md` entry 38, PR #84; `docs/context.md` §6 source check, Nov 12, on `8-one-pager`). | **A person opens MoneyGram's coverage map for El Salvador and confirms cash-in is not offered** (checklist item 3). If cash-in IS offered, the sentence must change (section 8). Yahya did the Nov 7 check, so he is the natural person. |
| 3 | MED | Answer 5 | **RESOLVED in `fab1869`.** It was "Stellar settles in seconds for a fraction of a cent", with no source. It now says "Stellar says payments finalize in about five seconds, with fees under a cent." That is Stellar's own claim and the sentence says so; sources are in the section 3 table and `docs/facts.md` entries 36 and 37 (PR #84, links not yet opened by a teammate: checklist item 4). | Keep "Stellar says". Never state a precise dollar fee: Stellar's own dollar figures for fees disagree. |
| 4 | MED | Answer 5 | **RESOLVED in `fab1869` (cut), but see finding 11.** "Shops pay trucks in cash, with no record of who collected what" is gone. It had no El Salvador source (entry 11 covers four countries), and the "no record" half was our own assumption. | Don't put it back as fact. If we say it, say "we think". The sentence that replaced it needs a check: finding 11. |
| 5 | MED | Answer 6 | **Placeholders and counts.** Four `[N]`, plus "(from docs/research.md)". | Use the real counts as of the call. If a count is 0, **cut the clause** instead of writing "0 emails". Delete "(from docs/research.md)". |
| 6 | LOW | Answers 5 and 6 | **RESOLVED in `0be3b1a`.** Both answers now say "public" Soroban contract and "public contract", not "open" (#48 removed the MIT licence, so "open" could read as "open source"). The same commit changed "digital dollars (USDC)" to "test dollars" in answer 5. | Nothing. |
| 7 | LOW | Answer 6 | "Rohan studies FARM" and "three engineers (software, two computer)" come from Yahya's comment on #64 and are marked "to confirm". | Rohan and Yahya say "confirmed" on the call. |
| 8 | LOW | Answer 4 and 5 | "7 days": the contract takes the credit period at deploy time. The default is 604,800 s (7 days); `CREDIT_PERIOD_SECS=120` makes the fast "overdue" demo copy (#52 step 2). | Yahya says which one the final deploy used. The one-pager says 7 days. |
| 9 | INFO | Form | #31 step 3 says to add the live URL and 2 or 3 phone screenshots (#25 step 7), but the one-pager draft has no screenshot field (questions 1 to 7). | On the call, open the form: if a field takes a file or link, use it. If not, the screenshots go to Devpost (#36) and the trifold (#37), and step 3 is only the URL. |
| 10 | INFO | Answer 5 | The $5.7 trillion line is Rohan's opening line (#51), and he may reword it by Sat noon, after we submit. | Whatever we submit is final. Make the trifold, the pitch and the video say the same words, or change them on purpose. |
| 11 | MED | Answer 5 | **New sentence, sources not yet checked by a person.** `fab1869` replaced the cut "shops pay trucks in cash" line with "Delivery crews in El Salvador have been robbed and extorted." Sources: El Diario de Hoy, 23 Jul 2024 (cash robbed from a delivery-truck employee, one case from 2023); Brown, Montero, Schmidt-Padilla and Sviatschi, Review of Economic Studies (drivers meet a gang representative before delivering; extortion payments, data 2012 to 2019); `docs/facts.md` entry 40 (PR #84). The robbery is one reported case and the study's data is old. | Rohan (or a teammate) opens both links and confirms the quotes (checklist item 4). **If nobody can in 2 minutes, cut the sentence.** |

On `fab1869` the checker gives answer 5 at **149** words and answer 6 at **149** (the `[N]` count as one word each, like a real number), the same as the one-pager's Word counts table. Both fit 120 to 150, with 1 word of room each, so cut something before adding anything. Deleting "(from docs/research.md)" leaves answer 6 at about 146.

## 3. Number to source table

"On `main`" says whether the source is merged. Entries are `docs/facts.md` entries.

| Number or claim | In | Source | On `main`? | Verdict |
|---|---|---|---|---|
| about $5.7 trillion credit gap | 5 | Entry 22 (IFC and SME Finance Forum, 2019 data); opening line approved in #73 | **No, PR #73** | OK once #73 merges. A gap, never our market. |
| more than 50,000 neighbourhood shops | 5 | Entry 3 (50,133); "Say this" table | Yes | OK |
| about $2 billion a year, "(Conamype estimate)" | 5 | Entry 1 | Yes | OK. Keep the attribution. |
| 6 in 10 informal small businesses borrowed from loan sharks | 5 | Entry 9 (62.2%) | Yes | OK. "Informal" must stay. |
| about $35 per $100 (2019 survey) | 5 | Entry 10 | Yes | OK. The year must stay. |
| "Shops pay trucks in cash, with no record of who collected what" | 5 (cut) | None for El Salvador (entry 11 is regional); the "no record" half is our assumption | n/a | **Resolved: cut in `fab1869`** (finding 4). Don't put it back as fact. |
| two taps | 5 | Context §7.1; contract `cash_claim` and `cash_confirm` | Yes | OK |
| 7 days | 4, 5 | Context §7.3; `deploy.sh` default | Yes | OK, **finding 8** |
| limit up to $500 | 5 | `LIMIT_CAP` = $500 (`lib.rs:34`); `docs/credit-model.md` | Yes | OK |
| 1.5% fee, 0.25% ours, 0.1% of other invoices | 5 | `CREDIT_FEE_BPS` 150, `OUR_BPS` 25, `USAGE_FEE_BPS` 10 (`lib.rs:20-29`); context §5 | Yes | OK. No usage fee on credit sales. |
| "Stellar says payments finalize in about five seconds, with fees under a cent" | 5 | developers.stellar.org ("Ledgers close in ~5 seconds, and their transactions are final when they do"); stellar.org/solutions/cross-border-payments ("network fees under a cent"); `docs/facts.md` entries 36 and 37 | **No, PR #84** | **Resolved in `fab1869`** (finding 3). Stellar's own claim, so it says "Stellar says". Links not yet opened by a teammate (checklist item 4). |
| Delivery crews in El Salvador have been robbed and extorted | 5 | El Diario de Hoy, 23 Jul 2024 (one robbery of a delivery-truck employee, 2023); Brown, Montero, Schmidt-Padilla and Sviatschi, Review of Economic Studies (data 2012 to 2019); `docs/facts.md` entry 40 | **No, PR #84** | Not a number. **Finding 11**: sources not yet checked by a person. |
| Rohan studies FARM; three engineers | 6 | Yahya's comment on #64 | n/a | **Finding 7** |
| contract `CAPQ6ZDD…` | 6 | `config/testnet.json` today | Yes, today | **Finding 1** |
| https://tiendas-stellar.vercel.app | 6 | Answered HTTP 200 on Wed Nov 11 (script, `--online`) | n/a | OK. Open it again on the call, on a phone, in a private window. |
| [N] conversations, walkthroughs, emails | 6 | `docs/research.md` (does not exist) | **No** | **Finding 5** |
| "MoneyGram lists cash-out points in El Salvador but, as far as we found, not cash-in" | 6 | Context §6: Nov 7 locator check (cash-out points) and Nov 12 source check (page HTML only); `docs/facts.md` entry 38 | Nov 7 finding yes; Nov 12 source check only on `8-one-pager`; entry 38 in PR #84 | Wording **resolved in `fab1869`**. The coverage-map check is still open (**finding 2**, checklist item 3). |
| first-year Waterloo students | 6 | Context header | Yes | OK |
| KYC on shops and KYB on distributors by a licensed partner; repay weekly like a bill | 6 | Context §6 and §11, a plan | Yes | OK. Both are worded as "our plan". |

## 4. The call: Thu 9:00 to 9:30 PM

Jack shares the screen with the one-pager open and the script already run.

| Time | What |
|---|---|
| 9:00 to 9:03 | Jack runs `git fetch origin && git merge origin/main`, then `node scripts/check-one-pager.mjs --online <path to the one-pager>` (section 7 says which path). Read out the FAILs: each gives its line. Compare the URL with the one Yahya posted. Open the form and check for new fields or limits. |
| 9:03 to 9:13 | **Read the three answers aloud**, one per person: Yahya answer 5, Rohan answer 6, Ruhaan answer 4. Whoever stumbles marks the line. |
| 9:13 to 9:20 | **Number check.** Go down section 3. Each "to confirm" is cleared by its owner saying "confirmed", or the number is struck. **No source after 2 minutes means cut it.** Apply the open findings: 1, 2 (the map check), 5, 7, 8 and 11. |
| 9:20 to 9:25 | **Fill the form fields:** team number, team name (#26), the four members, the Devpost link or "n/a", and the real counts in answer 6. |
| 9:25 to 9:30 | One last read of the exact text as it will be pasted. Rerun the script with `--online`: every FAIL fixed or consciously accepted, said out loud. Jack submits. |

**Rules for the call:** "Don't wait for perfect" (#31). Fix and move on, don't rewrite. A number that can't be confirmed is cut, never kept with "about". Only Yahya contacts the advisors.

## 5. Checklist (Jack): before pressing Submit (Thursday night, or Friday morning if we slip)

1. **Open the form fresh.** Check for new questions, new limits or a closing-time change.
2. `git fetch origin && git merge origin/main`, then `node scripts/check-one-pager.mjs --online <path>`: **every FAIL fixed or consciously accepted** (the three form fields, team number, team name and Devpost link, are filled by people, not by the script). It checks for "(to confirm)" markers, `[brackets]`, TODO or TBD, word counts in range, contract ID equals `config/testnet.json` and that file equals `origin/main`'s, and every URL answers 2xx. Also check by eye that the URL is the one Yahya posted in the chat.
3. **Look at MoneyGram's coverage map for El Salvador, by eye** (moneygram.com/stellar, in a browser: it may return 403 to a script, and the FAQ answer may show collapsed). Confirm cash-in is NOT offered there. Answer 6 says "as far as we found, not cash-in", which comes from the page's HTML, not from a person. **If cash-in IS offered, that sentence must change before you submit** (section 8).
4. **Confirm `docs/facts.md` entries 36 to 40 (PR #84) have had their links opened by a teammate**, each quote matching its page. They back the Stellar, MoneyGram and delivery-crew sentences in answers 5 and 6, and each still says "Checked: Pending". A link that doesn't match its quote means cutting or softening that sentence.
5. **After Yahya's redeploy (#52) has landed:** run `git fetch origin && git merge origin/main`, then `node scripts/check-one-pager.mjs --online <path>`, and confirm the contract ID in answer 6 matches `contracts.routeLedger` in `config/testnet.json` (read both by eye as well as trusting the script). If the redeploy hasn't landed, use the first row of section 8.
6. **Open the app on a phone in a private window** (not a team phone if you can): the home page loads, one payment works.
7. **Open the contract on stellar.expert** (`https://stellar.expert/explorer/testnet/contract/<ID from answer 6>`). It shows our contract and recent events, not "not found".
8. **Paste as plain text**, one answer at a time, from between the `<!-- qN -->` markers (not the markers). Check that `$`, `%` and `'` came through.
9. **Pick the team number and the four members.** If a member isn't in the picker, use the "cannot find someone" box.
10. **Submit once.** If the page errors, don't resubmit blindly: look for a confirmation email or message first. Still stuck: velocity.events@uwaterloo.ca, subject "Blockchain Innovation Challenge Powered by Stellar".
11. **Screenshot the confirmation** and post it in the group chat (this is #31's "Done means").
12. **Record what we sent:** a small PR "Record the submitted one-pager" that adds a section "Submitted on <date and time>" to `docs/one-pager.md` with the exact pasted text. Judges and the pitch then match what is on file.

## 6. After it's in: message to the advisors (Yahya sends it)

Only Yahya contacts Adam and Misha. This is his second and last follow-up each (#17). It is a draft: Yahya edits it and sends it from LinkedIn after the form is in. Don't claim anything that isn't merged. Paste the three answers as submitted, because the file in the repo may still be a draft.

> Hi Adam, thank you again for the call on Nov 9. We took your point on market size and assumptions: our one-page form now opens with the worldwide credit gap, then El Salvador's shops and the $2 billion a year distributors sell them, and it says how the distributor pays us. We submitted it today. Here is what we wrote: [paste answers 4 to 6]. What is the one thing you would change before our showcase on Nov 16? Thank you, Yahya

> Hi Misha, thank you again for the call on Nov 9. We took your advice: we lead with the worldwide number and then El Salvador's, the money answer is in 30 seconds, and we picked a name, [NAME]. We submitted our one-page form today. Here is what we wrote: [paste answers 4 to 6]. What is the one thing you would change in how we say it before the showcase on Nov 16? Thank you, Yahya

- Only keep a claim if it is true on the day. "Picked a name" depends on #26. "Money answer in 30 seconds" is in the pitch script (#83) and answer 5.
- Don't say we have emailed banks or cash-in companies until `docs/research.md` says how many, and don't say any of them replied unless one did.

## 7. The script

```
node scripts/check-one-pager.mjs                     # docs/one-pager.md (only once PR #64 is merged and you merged main)
node scripts/check-one-pager.mjs path/to/file.md     # any copy, e.g. the file you are editing on branch 8-one-pager
node scripts/check-one-pager.mjs --online            # also git fetch origin main, and opens each URL, expects 2xx
```

Before PR #64 merges, `docs/one-pager.md` is not on this branch and the script exits with "No such file". Either point it at the checkout where the team edits the file, or look at the pushed copy: `git show origin/8-one-pager:docs/one-pager.md > "$TMPDIR/one-pager.md"`, then pass that path. Edit the real file, not the copy. Run it from this branch (it holds the script).

- **FAIL** (exit code 1): word count outside the target (question 4 about 20, questions 5 and 6: 120 to 150), a "(Rohan to confirm)" marker, a `[placeholder]`, TODO or TBD (also in the team number, team name and Devpost fields), a file path like `docs/research.md`, anything on the "never use" list ($7B, 70,000 shops, Chivo, MoneyGram's 5%, $5B as our market, "85,265 neighbourhood shops" alone, "62% of small businesses"), a contract ID that isn't `contracts.routeLedger` in `config/testnet.json`, a `config/testnet.json` that differs from `origin/main`'s (a redeploy you haven't merged), the test USDC token ID instead of our contract, a string shaped like a secret key.
- **WARN**: "open" contract, "audited", passkeys or fee sponsorship, the MoneyGram "only" claim, "fraction of a cent".
- Findings about a marker, placeholder, claim or ID give the line number in the file. A marker or `[N]` is one FAIL each, so three markers are three FAILs.
- It counts words the way the one-pager's "Word counts" table does (split on spaces, markers excluded, `[placeholders]` counted). On the draft at `fab1869` it gives 20, 149 and 149, the same as the one-pager's table.
- It does not decide what is true. It cannot see whether a number is right, only whether it is marked, sourced and in range. Sections 2 and 3 are the part a person has to do.

## 8. If something goes wrong

| What | Do this |
|---|---|
| #52 isn't merged by 9 PM | Drop the contract ID from answer 6 and write "contract ID in our README". Yahya puts the final ID in the README and in Devpost. |
| Rohan has no counts yet | Cut the clause. Don't write `[N]`, don't guess. |
| #73 isn't merged | Keep the line: Yahya approved the wording. Merge #73 before Friday so entry 22 exists. |
| The form changed (new field or a limit) | Fit the answer to the limit, don't cut sources. Post the change in the chat. |
| The form won't submit | Try another browser, then another person. Then the Velocity email in section 5. |
| 9:30 PM and not submitted | Keep going. Friday 8:30 AM ET is the hard stop. |
| MoneyGram's map shows cash-in offered in El Salvador | The answer 6 sentence is wrong: change it before submitting to say only what the map shows, and tell Yahya (he did the Nov 7 check). Keep answer 6 within 120 to 150 words. The Risk #1 notes in `docs/context.md` section 6 then need updating too, after the form is in. |
| A link in `docs/facts.md` entries 36 to 40 doesn't match its quote | Cut or soften the sentence it backs (Stellar speed and fees, MoneyGram, delivery crews). |
| A number can't be confirmed | Cut it. |
