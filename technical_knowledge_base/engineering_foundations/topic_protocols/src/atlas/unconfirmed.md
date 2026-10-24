# Not confirmed against a primary source (atlas, 2026-10-05)

Dropped from the atlas, or shown only with the word "unconfirmed". Each line says what was tried. Web search was unavailable in this session (budget spent), so checks were direct fetches of canonical URLs, RFC Editor and Datatracker metadata, and GitHub's API.

## Newer agent shapes and news (old root and MCP page)
- **Meta's Muse searching Shopify and buying through Shop Pay over UCP (September 2026), and Amazon blocking Muse the next day.** No primary source fetched (no Meta, Shopify or Amazon announcement URL was available). Not in the atlas. Note for the Reading: ucp.dev lists Amazon and Meta among UCP's co-developers as of 2026-10-05, which sits oddly with the "blocked" story; check before repeating it.
- **Meta "Muse Spark 1.3" credential-isolation design.** The old root itself says "described only in The Batch of 18 September with no primary source resolved". Not in the atlas.
- **Google Home MCP early access (September 2026, Premium Advanced subscription and a Cloud project).** No Google Home developer page found by direct URL. Not in the atlas.
- **A2A "150+ member organisations".** The Linux Foundation launch release (23 June 2025) says "more than 100 leading technology companies"; no newer count was found. The atlas gives no count.
- **AGNTCY archived its ACP SDK "in April 2026".** The repository is archived but GitHub does not expose the date (correction 22).
- **Agentic Commerce Protocol (OpenAI and Stripe) and AP2 (Google).** Their repositories exist (ACP spec versions 2025-09-29 to 2026-04-17; AP2 created 2025-05-30), but their specifications were not read in depth: named in the UCP entry as neighbours only, with no feature claims.

## Adoption and measurement figures (old root, TLS and TCP pages)
- HTTP/3 share of websites ("roughly 40 percent by August 2026") and IPv6 shares (Google 50.10 percent on 2026-03-28, APNIC 42 percent): not fetched; the atlas gives no adoption percentages.

## Confirmed since (2026-10-05, by the child pages)
Moved here from the lists above once a child page checked them against a primary source.
- **Root KSK rollover, 2026-10-11.** KSK-2024 (key tag 38696), published in the root zone since 11 January 2025, signs the root key set from 11 October 2026; KSK-2017 (20326) is to be revoked in early 2027. Sources: [IANA trust anchors](https://www.iana.org/dnssec/files), [ICANN](https://www.icann.org/resources/pages/ksk-rollover-en); the DNS child recorded the root serving both keys on 2026-10-05.
- **Cloudflare post-quantum adoption.** Over 60% of client requests used post-quantum key agreement in February 2026; about 10% of origins supported it. Source: [Cloudflare, 27 February 2026](https://blog.cloudflare.com/radar-origin-pq-key-transparency-aspa/) (cited by the root Reading and the TLS child). See correction 23.
- **OpenAI-style `data: [DONE]` sentinel.** Confirmed in [openai-python `_streaming.py`](https://github.com/openai/openai-python/blob/main/src/openai/_streaming.py) and [vLLM's OpenAI-compatible server](https://github.com/vllm-project/vllm/blob/main/vllm/entrypoints/openai/chat_completion/serving.py) (commit b0eb87fe49), by the streaming child.
- **Stripe webhook retries for up to three days.** [Stripe docs](https://docs.stripe.com/webhooks): "up to three days with an exponential back off in live mode", recorded by the streaming child.
- **End of public-CA client-authentication certificates.** [Chrome Root Program policy](https://googlechrome.github.io/chromerootprogram/crp/policy/) v1.8 (5 February 2026, section 1.3.2): subordinate CAs disclosed from 2026-06-15 must be serverAuth-only; leaf certificates issued from 2027-03-15 must carry only serverAuth (TLS child, section 7). The mTLS entry now states it.

## Time-critical items flagged for the Reading and Failure lab agents
- None open: the KSK rollover and the client-certificate deadline are now under "Confirmed since". The KSK sentence becomes past tense on 2026-10-11.
