# Reading tab: open items (2026-10-05)

- **Root KSK rollover (closed 2026-10-05).** The atlas moved it to confirmed (IANA trust anchors, ICANN); the Reading box was rewritten to match the DNS child (KSK-2024 published since January 2025, signs the key set from 11 October 2026). Make it past tense after 2026-10-11.
- **Cloudflare PQ percentages (closed 2026-10-05).** The atlas now lists them as confirmed (Cloudflare post of 2026-02-27, correction 23).
- **Wire numbers quoted in the Reading** (TLS 1.3 53 ms vs TLS 1.2 107 ms on an emulated 50 ms path; HTTP/2 loss +68/+56/+43 ms on three streams vs HTTP/3 +66 ms on one; cold first byte 108 ms vs 54 ms reused; uncached DNS 212 to 451 ms vs 2.4 ms cached) come from the On the wire agent's message and `src/wire/raw/`; the h2/h3 loss deltas were recomputed here from `src/wire/raw/hol/{base,loss}_h{2,3}.json` (second token of each stream). If the wire tab re-records, re-check these.
- **Failure lab cross-links.** The Reading's "Go deeper" notes say the Failure lab shows DNS, connection, certificate, proxy-buffering, idle-timeout and token-audience failures. Confirm each exists in `parts/32_tab_fail.html` once it is final; soften any that does not.
- **Child links (closed 2026-10-05).** Section 10 links all ten live children with one line each; every "Go deeper" note in sections 1 to 9 links its child by Notion id.
- **Shared head title.** `parts/01_head.html` still has `<title>Topic: programming-languages</title>` (scaffold copy); it is not the Reading agent's file.
