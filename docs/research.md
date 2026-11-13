# Research log

Interviews (#7), walkthroughs (#30), partner outreach (#10) and advisor calls (#17) go here. Role only, no full names or phone numbers (the repo is public). Strong findings also go into `docs/facts.md` (#61).

## Advisor calls (Nov 9)

Yahya took both calls on Mon Nov 9. Both advisors prefer LinkedIn.

### Advisor 1 (startup founder)
- The tech is believable. Judges will ask about go-to-market: how do we actually get into El Salvador?
- Cash is the roadblock. Partner with cash-in/cash-out companies and banks that already have a reputation there, instead of going shop by shop.
- Cold-email cash-in/cash-out companies and banks about Stellar (#10). A real reply would impress Stellar.
- A hackathon is a business case: state assumptions clearly, keep them realistic, and argue for them (#12).
- Lead with market size, backed by the number of transactions times our fee.
- Show it's a real business, not just a fun idea.
- He floated secure ATMs (about $5k each). We're not doing ATMs (cash rules and safety). He also mentioned a $30 wallet bonus and fuel discounts: those were Chivo perks from 2021 and aren't current, so we don't use them.

### Advisor 2 (finance)
- Loved the idea. How we deliver the pitch decides it.
- Pick a name (Wed Nov 11, #26).
- Build our own credit record, and know what El Salvador's credit bureaus are called (#50: Equifax, TransUnion and INFORED, supervised by the SSF; `docs/facts.md` entries 15 and 16). Know what a DUNS number is in case a judge asks (most tiendas won't have one; entry 17).
- Lead with the worldwide market number, then El Salvador's (#51).
- Have a 30-second answer to "how do you make money?" (#12).
- Say KYC/KYB: a licensed partner checks the shop owner's ID (KYC) and that the distributor is a real business (KYB).
- Show one slide of real smart-contract code (#56).
- He worried distributors might leave if we take part of their payments. Our answer: the distributor chooses to be paid at delivery for a fee, or waits 7 days and gets the full amount.

### Our corrections (keep these)
- Don't compare us to MoneyGram's 5% (that's a cross-border fee, and Transfer365 bank transfers in El Salvador are free). Compare to loan sharks instead: about $35 interest per $100 (CIOPS 2019), versus $0 for shops with us.
- Our $0.75-per-$100 default buffer is our own number.

### Follow-ups

Advisor contact isn't tracked here. Yahya reaches out when we have a genuine question worth their time: startups and customers for Advisor 1, technical and financial for Advisor 2.

## Partner outreach

Sent from Rohan's university email. Organisation and role only (the repo is public).

| Date | Organisation | Person and role | Channel | What we asked | Reply | Next step |
|---|---|---|---|---|---|---|
| Nov 10 | Banco Promerica | General inbox | Email | Cash-to-USDC deposits for small shops; cost per $100; 15-min call | None yet | Follow-up Fri Nov 13 |
| Nov 10 | Banco Abank | Customer service | Email | Same | None yet | Follow-up Fri Nov 13 |
| Nov 10 | Súper Selectos | Customer service | Email | Same | None yet | Follow-up Fri Nov 13 |
| Nov 10 | Banco Integral | Press contact | Email | Same | None yet | Follow-up Fri Nov 13 |
| Nov 10 | Banco Davivienda | Treasury manager | Email | Same | Out-of-office auto-reply pointing to a colleague | Jack wrote to that colleague on Nov 11 |
| Nov 11 | Banco Davivienda | Colleague named in the auto-reply | Email (Jack) | Cash-in for small shops; shop owners' trust in digital dollars; biggest obstacle | None yet | Wait to Mon Nov 16 |
| | MoneyGram | Business team | Contact form | Cash-to-USDC deposits for small shops; cost per $100 | | Not sent yet |
| | Banco Cuscatlán | Digital/innovation team | LinkedIn | Same | | Not sent yet |
| | Conamype | General | Social media message | Best cash-in option for tiendas; which partners to talk to | | Not sent yet |
| | Distribución Dinámica | Director | LinkedIn | How many tiendas buy on credit; how they deposit cash; would distributors pay 1.5% | | Not sent yet |
| | Tienda Pago | CEO | LinkedIn | Default rate in first pilots; how shops repay in cash | | Not sent yet |

### Nov 12 round (16 emails)

Rohan wrote 16 emails on Nov 12. Thirteen were queued in his Outlook Outbox and still need verification. Ruhaan sent the remaining three on Nov 13 ET and verified them in Waterloo Outlook Sent Items (#120).

| Date | Organisation | Person and role | Channel | What we asked | Status |
|---|---|---|---|---|---|
| Nov 12 | Niu (digital wallet) | Business inbox | Email | Could a tienda deposit cash and pay its distributor in the app; cost per $100 | Queued, not confirmed |
| Nov 12 | Productos Alimenticios Diana | Customer service | Email | How much of their sales to shops is on credit, and for how long; would they take a fee to be paid at delivery | Queued, not confirmed |
| Nov 12 | FEDECACES (cooperatives) | Corporate inbox | Email | Default rates on small working-capital loans; how cash-only members pay | Queued, not confirmed |
| Nov 12 | CrediCampo | Staff contact | Email | Default rates on short micro-loans; use of Tigo Money points for cash payments | Queued, not confirmed |
| Nov 12 | Banco Hipotecario | Customer service | Email | Options for shops to deposit cash and finance stock; cash-to-digital-dollar deposits | Queued, not confirmed |
| Nov 12 | BANDESAL | Customer service | Email | Funding lines for 7-day working capital through a licensed institution | Queued, not confirmed |
| Nov 12 | SSF (financial supervisor) | General inbox | Email | Which rules apply to our model; channel for fintech questions | Queued, not confirmed |
| Nov 12 | Superintendencia de Competencia | General inbox | Email | Newer data on how tiendas finance stock | Queued, not confirmed |
| Nov 12 | FUSADES | General inbox | Email | Data on tienda financing and digital payments | Queued, not confirmed |
| Nov 12 | ASI (industry association) | General inbox | Email | Do members give shops credit through distributors; who to talk to | Queued, not confirmed |
| Nov 12 | FUNDEMAS | General inbox | Email | Programs or firms working on payments or credit for tiendas | Queued, not confirmed |
| Nov 12 | UCA | Economics researcher | Email | Studies on how tiendas pay distributors and finance stock | Queued, not confirmed |
| Nov 12 | UCA | Professor | Email | How common supplier credit is for the smallest businesses | Queued, not confirmed |
| Nov 13 | UCA | Professor (financial inclusion) | Email | Small merchants' trust in digital payments | Sent via Waterloo Outlook (#120) |
| Nov 13 | Zumma Ratings | Analyst | Email | Default rates on short-term micro-credit | Sent via Waterloo Outlook (#120) |
| Nov 13 | MicroRate | Analyst | Email | Default rates on short-term micro-credit | Sent via Waterloo Outlook (#120) |

### Stellar anchor check (Nov 12)
- The Stellar Anchor Directory (anchors.stellar.org), filtered to El Salvador and the "Cash" payment rail, lists two anchors: **MoneyGram Ramps** and **Bitnovo**. The directory doesn't say whether each one supports cash-in, cash-out or both in El Salvador, so Bitnovo is a new outreach target to ask. Without the cash filter it also lists Amero Exchange and Dollarize for El Salvador.
- Raven (raven.stellar.org) is now an MCP server that needs sign-in, so the "Which anchors support cash-in to USDC in El Salvador?" question wasn't asked yet.

**Pitch line (so far):** "We emailed 5 organisations in El Salvador, 4 banks and a supermarket chain; no replies yet beyond one auto-reply, and we follow up Friday." Don't count the Nov 12 round until those emails are confirmed sent.
