# DNS: source

`sh build.sh` writes `../index.html` from `parts/` (same assembly as the root's `src/build.sh`; links written `{{text|url}}`).

## Parts
- `01_head.html` (the root's CSS), `10_header.html` (title, subtitle with reading time, tabs), `05z_errbox.js.html`, `99_js_tabs.js` (skill template, storage key `dns-tab`).
- Reading: `20_read_a` (scoped CSS, section nav, the idea in one screen: core sentence, hero, you need, new terms, closed blocks for the program table, provenance and numbers), then names (c), resolution (d), wire (e), records (f), caching with the change planner (g), stub resolvers (h), Kubernetes with the resolver lab (i), cloud (j), DNSSEC (k), privacy and attacks (l), outages (m), debugging (n), Reference: drills and interview answers (o) and glossary (p), all closed; `20_read_z` closes the tab.
- JS: `21_js_rd_common.js` (skill template: `RD.anim` never autoplays), `22_js_data.js` (generated), `23_js_rd_walk.js`, `24_js_rd_wire.js` (byte parser, record table), `25_js_rd_cache.js`, `26_js_rd_stub.js` (PODX helpers and tables), `27_js_rd_sec.js` (DNSSEC stepper, key tags, rebinding), `28_js_rd_drill.js`, `29_js_rd_figs.js` (hero, zone tree, lost-packet bars, split horizon), `31_js_pod.js` (the resolver lab, section 7), `32_js_cache_model.js` + `32_js_cache.js` (the change planner and calculators, section 5).
- Tabs: only `39_tab_more.html` (Further reading).

## Data: the lab
Everything in `lab/` runs in Docker, in containers named `proto-dns-*` (each `--cpus 1 --memory 1g --rm`) on one internal network with no route out (`10.53.0.0/16`): a private root zone, `test.` and `llm.test.` served by CoreDNS 1.12.4, Unbound 1.25.2 as the resolver, CoreDNS as a Kubernetes-style cluster DNS, pods on Debian 13 (glibc 2.41) and Alpine (musl 1.2.6), tcpdump inside each pod's own network namespace. `.test` is reserved (RFC 6761), so nothing can leak. `gen_zones.py` signs the zones with fresh keys each run (keys stay in the scratch work dir).
- `DNS_WORK=<scratch dir> sh lab/run_all.sh` reruns everything (about 10 minutes): `exp_walk.py` (walk, records, truncation), `exp_wire.py` (bytes), `exp_pod.py` (ndots, timeouts, errors, TCP fallback, HTTP clients; `exp_pod.py http` reruns only the last), `exp_cache.py` (TTL change, negative caching, serve-stale), `exp_sec.py` (DNSSEC, rebinding, loop plugin), `exp_public.py` (about 25 read-only public lookups over DNS over TLS to 1.1.1.1 with the certificate checked, plus the root zone file and IANA's trust anchors over HTTPS).
- Outputs in `lab/out/`, redacted through the root's `private_patterns.py` (`common.redact`). The plain-DNS identity of this laptop's filter is never stored, only whether it matched the public resolver.
- `make_data.py` turns `lab/out/` into `parts/22_js_data.js`: tcpdump lines parsed into one event per DNS message, each assigned to its getaddrinfo call.
- `inputs/`: `facts_checked.md` (25 claims checked against primary sources on 2026-10-05, with quotes), `root-anchors.xml` (IANA), `root_dnskey_2026100500.txt` (the root zone file's DNSKEY and SOA lines).

## Checks
- `python3 check_embed.py`: the page embeds exactly the recordings; the Cache timeline's JS model equals an independent Python version; the in-browser key-tag function gives the root's real tags, which IANA publishes; every number the prose quotes is recomputed from the data; no private pattern, home path, token or em-dash in the folder.
- `node technical_knowledge_base/engineering_foundations/topic_protocols/dns/src/check_ui.mjs <out dir>` from the repo root: every control at 390 px dark and 920 px light, then, at normal motion, that no animation moves before the reader acts.
- `python3 html_utils/ledger.py check <this folder>`: the knowledge ledger.
- `sh html_utils/checkpage.sh <this folder>`.

## Departures from the child-page method
- Most data comes from a private DNS tree run in containers rather than from the public DNS: on this laptop every plain DNS packet, even to a root server, is answered by a local filter. Public facts were read over DNS over TLS instead, and the page says so.

## The 2026-10-24 rebuild to the teaching contract
- **Top**: the core sentence (a chain of caches in front of a tree of servers; four causes of nearly every problem), a new static hero (process, recursive resolver with its cache, three authoritative servers, the four failure causes where they happen), "You need", seven new terms. The program comparison table, provenance and the eight numbers are closed blocks.
- **Visuals inline**: the Pod resolver lab tab moved into section 7 (opens on ndots:5 against a trailing dot; option text shortened into optgroups); the Cache timeline tab moved into section 5 as the change planner, its three calculators into a closed block. New: the hero, a zone-tree diagram (lab and real tree, section 1), a lost-packet bar chart from the recordings (section 6, replacing a table), a split-horizon diagram (section 8). Every visual has a title saying what to notice.
- **No autoplay**: template `21_js_rd_common.js`; mode switches and presets no longer start playback.
- **Depth closed**: interception and dig +trace, compression, the glibc-only switches, record mistakes, model assumptions, serve-stale and ndots corrections, conntrack commits, the loop recording, Route 53 detail, the real root keys and adoption figures, the .de and SUNBURST details, cache-poisoning history, the outage table, the full command table, drills, interview answers (flattened so their questions do not count as core), glossary.
- **Ownership**: Kubernetes networking beyond DNS links Kubernetes for ML (by id); TLS, HTTP, networking basics, MCP stay linked. No location of the topic is named in the prose. The root key roll is phrased as scheduled for 11 October 2026 (data as of 5 October), since the page was rebuilt after that date without a new reading.
- **Images**: none. DNS has no physical object that teaches; diagrams carry every mechanism.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute) | 51.1 min | 40.7 min |
| Reading, closed details | 2.0 min | 16.8 min |
| Other tabs, core | Pod lab 2.6 + Cache timeline 1.8 = 4.4 min | none (both inline) |
| Further reading | 2.7 min | 2.5 min |
| Visuals drawn inline in Reading | 4 | 9 |

Why about 41 minutes is right: the page owns twelve distinct mechanisms (delegation, resolution, the wire format, records, three kinds of caching, stub behaviour, cluster DNS, cloud resolvers, DNSSEC, encrypted DNS and the attacks) plus the debugging toolkit, each tied to a recorded failure; about a fifth of the core words are captions, tables and counters of the recordings. Everything not needed on first read is closed. Core total fell from 55.5 to 40.7 minutes including the two tabs that moved in.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
444 units: core 300, depth 124, fat 20. 431 were drafted from the old page by `ledger.py init` and keyed with a script that picks the rarest phrase of each unit still on the page (label from whether it sits inside a closed block), then reviewed; 13 were added by hand for script-rendered tables and the new or moved visuals. Fat units are headings, control instructions, the old reading-time note and pointers to the removed tabs; each carries a `note`.
