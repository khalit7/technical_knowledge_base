# Case files tab (t-cases): visual ideas, data, and checks

Question the tab answers: "does each building block of the Reading spine really matter, and what does it look like when it fails or is done well at a real company?" One card per published case, mapped to the block it teaches.

## Built
| Idea | Score (0 to 2 each: param / reproduces / computable / beyond a sentence / corrects / central / new; minus cost) | Notes |
|---|---|---|
| Flagship before/after animation: AWS EC2 DWFM congestive collapse (20 Oct 2025), Before (no limit on the line) against After (throttle and restart) | 2/1/2/2/2/2/2, cost 1 = 12 | 48 servers, a waiting line drawn to scale with the "finishes in time" boundary at C x T = 12 places, a leases-per-tick chart with both modes on one axis, counters (leased, in line, wasted, work done), a caption per step quoting the postmortem. Model sizes are illustrative (AWS gives none); the mechanism, times and fix are AWS's. JS model checked step by step against recompute.py. Chosen over Google Cloud's June 2025 restart herd because AWS published both the failure dynamic (timeouts requeue work, the line never shrinks) and the fix it shipped that morning, so the "after" is real, not proposed. |
| Building-block filter chips with counts and a one-line plain definition | supporting | Definitions shown before any case uses the term; link to the Reading tab. |
| Timeline 2011 to 2026, one dot per case, outage vs architecture colour; click a year to filter, a dot to open its card | 1/0/2/1/0/1/1 = 6 | Laid out by measured width; years shortened to '14 under 520 px. |
| Card per case | the main visual on a data page | Every field from the source; "Words on this card" glossary first, so no term precedes its definition; numbers table marks each value quoted (with the quote number) or derived (with the formula); all quotes in a collapsed list, the ones that carry numbers highlighted. |
| Correction box on a card | | Instagram's "41 bits ... gives us 41 years": 2^41 ms is 69.7 years (recompute.py). |

## Rejected
- A second animation (Google Cloud June 2025 restart herd with and without randomized backoff): the Reading tab owns retries and jitter and the Scale simulator owns load; one flagship animation keeps the tab readable. Candidate for the retries child page.
- A block x year heatmap: with 33 cases most cells are 0 or 1; the chips' counts and the timeline say the same.
- Downtime-minutes bar chart across outages: outages measure different things (partial degradation, full loss, wrong answers); one axis would mislead.
- Uber Schemaless (2016) card: source fetched, but it gives no numbers and repeats what Notion, Figma and Instagram teach. Atlassian (April 2022), Cloudflare (July 2019 regex), DynamoDB (Sept 2015 metadata retries) and Cloudflare (June 2025 Workers KV) were sourced and dropped to keep the count near 30; their extracts can be added back from the scratch downloads.
- Twitter timeline fan-out: no primary source with numbers could be fetched (InfoQ's talk page has no transcript); the 2013 Twitter engineering post was used instead (peak against average, services, back-pressure).
- Shopify flash-sale capacity numbers: no primary page with BFCM figures fetched; the 2018 pods post was used.

## Data path
inputs/extracts_*.json (verbatim quotes, URL, published and event dates, accessed 2026-10-04) + annot_a/b/c.py (plain-words cards) -> build_cases.py -> cases.json and parts/33_js_cases_0data.js.
verify_extracts.py checks every quote word for word against the downloaded source text (scratch, not committed): 240 of 240 found (inputs/verify_log.txt). build_cases.py checks every quoted number appears in a quote of its case. recompute.py checks every derived number and the animation model. check_cases.mjs drives every control at 390 px dark and 920 px light.

## What the methodology lacked here
A case gallery has no formula to reproduce, so "reproduces a figure" scores low by design; the checks that matter are quote fidelity (automated) and number-to-quote linkage (automated). Several primary sources only survive on the Wayback Machine (Builders' Library, Instagram, Netflix, Shopify, Character.AI, Twitter): the card links the original address and the extracts record that the text was read from an archive copy.
