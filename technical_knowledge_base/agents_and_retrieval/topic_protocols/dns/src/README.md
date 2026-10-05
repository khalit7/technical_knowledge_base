# DNS: source

`sh build.sh` writes `../index.html` from `parts/` (same assembly as the root's `src/build.sh`; links written `{{text|url}}`).

## Parts
- `01_head.html` (the root's CSS), `10_header.html` (tabs), `05z_errbox.js.html`, `99_js_tabs.js`.
- Reading: `20_read_a` (scoped CSS, section nav) to `20_read_p` (glossary), `20_read_z` (closes the tab). One screen (b), names (c), resolution (d), wire (e), records (f), caching (g), stub resolvers (h), Kubernetes (i), cloud (j), DNSSEC (k), privacy and attacks (l), outages (m), debugging (n), drills (o).
- JS: `21_js_rd_common.js` (RD.anim controller, copied from the siblings), `22_js_data.js` (generated), `23_js_rd_walk.js`, `24_js_rd_wire.js` (byte parser, record table), `25_js_rd_cache.js`, `26_js_rd_stub.js` (PODX helpers and tables), `27_js_rd_sec.js` (DNSSEC stepper, key tags, rebinding), `28_js_rd_drill.js`.
- Tabs: `31_tab_pod.html` + `31_js_pod.js` (Pod resolver lab), `32_tab_cache.html` + `32_js_cache_model.js` + `32_js_cache.js` (Cache timeline), `39_tab_more.html`.

## Data: the lab
Everything in `lab/` runs in Docker, in containers named `proto-dns-*` (each `--cpus 1 --memory 1g --rm`) on one internal network with no route out (`10.53.0.0/16`): a private root zone, `test.` and `llm.test.` served by CoreDNS 1.12.4, Unbound 1.25.2 as the resolver, CoreDNS as a Kubernetes-style cluster DNS, pods on Debian 13 (glibc 2.41) and Alpine (musl 1.2.6), tcpdump inside each pod's own network namespace. `.test` is reserved (RFC 6761), so nothing can leak. `gen_zones.py` signs the zones with fresh keys each run (keys stay in the scratch work dir).
- `DNS_WORK=<scratch dir> sh lab/run_all.sh` reruns everything (about 10 minutes): `exp_walk.py` (walk, records, truncation), `exp_wire.py` (bytes), `exp_pod.py` (ndots, timeouts, errors, TCP fallback, HTTP clients; `exp_pod.py http` reruns only the last), `exp_cache.py` (TTL change, negative caching, serve-stale), `exp_sec.py` (DNSSEC, rebinding, loop plugin), `exp_public.py` (about 25 read-only public lookups over DNS over TLS to 1.1.1.1 with the certificate checked, plus the root zone file and IANA's trust anchors over HTTPS).
- Outputs in `lab/out/`, redacted through the root's `private_patterns.py` (`common.redact`). The plain-DNS identity of this laptop's filter is never stored, only whether it matched the public resolver.
- `make_data.py` turns `lab/out/` into `parts/22_js_data.js`: tcpdump lines parsed into one event per DNS message, each assigned to its getaddrinfo call.
- `inputs/`: `facts_checked.md` (25 claims checked against primary sources on 2026-10-05, with quotes), `root-anchors.xml` (IANA), `root_dnskey_2026100500.txt` (the root zone file's DNSKEY and SOA lines).

## Checks
- `python3 check_embed.py`: the page embeds exactly the recordings; the Cache timeline's JS model equals an independent Python version; the in-browser key-tag function gives the root's real tags, which IANA publishes; every number the prose quotes is recomputed from the data; no private pattern, home path, token or em-dash in the folder.
- `node technical_knowledge_base/agents_and_retrieval/topic_protocols/dns/src/check_ui.mjs <out dir>` from the repo root: every control at 390 px dark and 920 px light.
- `sh html_utils/checkpage.sh <this folder>`.

## Departures from the child-page method
- Most data comes from a private DNS tree run in containers rather than from the public DNS: on this laptop every plain DNS packet, even to a root server, is answered by a local filter. Public facts were read over DNS over TLS instead, and the page says so.
- Reading is about 45 minutes of prose (55 with tables): the brief asked for teaching from zero to production depth, with every section readable alone.
