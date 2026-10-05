# Visualisation ideas: DNS (2026-10-05)

Scored 1 to 5 on teaches-more-than-text (T), uses real data (D), cost (C, 5 = cheap). The question the page keeps returning to: where did the time (or the wrong answer) come from, cache, search list, lost packet or wrong server? The root already owns the six DNS cases of the Failure lab (linked by name) and the atlas entry; none is rebuilt here.

## Built

| Idea | T | D | C | Placement | Data |
|---|---|---|---|---|---|
| Pod resolver lab: two recorded getaddrinfo calls replayed packet by packet side by side (ndots:5 vs trailing dot, ndots:5 vs 1, glibc vs musl, lost packet, timeouts, dead server, SERVFAIL, TCP fallback), durations to one scale | 5 | 5 | 2 | own tab | tcpdump in each pod's namespace, `lab/exp_pod.py`; glibc 2.41, musl 1.2.6, CoreDNS 1.12.4, Unbound 1.25.2 |
| Resolution walk, before/after: cold with QNAME minimisation, cold without, warm; sequence diagram from the authoritative servers' own logs, counters (what the root learned) | 5 | 5 | 3 | Reading 2 | CoreDNS `log` plugin, `lab/exp_walk.py` |
| Message bytes: a real query, answer and CNAME answer parsed in the browser, every field clickable, compression pointers marked | 5 | 5 | 3 | Reading 3 | `lab/exp_wire.py` (dnspython client to Unbound) |
| DNSSEC chain stepper with four modes (valid, expired signatures, root key rolled with old anchor, NSEC proof); key tags recomputed in the browser; delv trace | 5 | 5 | 2 | Reading 9 | signed lab tree (`gen_zones.py`, ECDSA P-256), Unbound validating, delv |
| Real root keys: tags and DS digests recomputed from the root zone file, matched to IANA, plus the live key set over DoT | 4 | 5 | 4 | Reading 9 | InterNIC root.zone, IANA root-anchors.xml, `keytags.py` |
| Rebinding against an agent fetch tool, before/after (check-then-fetch-by-name vs resolve-once) | 5 | 5 | 3 | Reading 10 | attacker DNS server log and tool output, `lab/exp_sec.py` |
| Cache timeline: share of clients on the old address after a change, not lowered vs lowered first, 100 caches flipping, JVM and pinned-connection shares; plus negative-cache, failover and NS-move calculators | 5 | 3 | 3 | own tab | illustrative model (`32_js_cache_model.js`, checked against Python in `check_embed.py`); lab recording overlaid |
| Recorded TTL change and negative caching charts (resolver vs authoritative over 44 s) | 5 | 5 | 4 | Reading 5 | `lab/exp_cache.py` |
| Serve-stale ladder (default vs serve-expired) | 4 | 5 | 5 | Reading 5 | same |
| Tables from recordings: lost packet timings, dead server, error texts per libc, HTTP clients' query counts, ndots per name per libc, truncation, loop plugin | 4 | 5 | 5 | Reading 3, 6, 7 | `lab/out/pod.json` |
| Predict-then-reveal drills (9), interview questions (6) | 4 | 4 | 5 | Reading 13 | page numbers |

## Rejected or not possible

- A real `dig +trace` of a public name: every plain DNS packet from this laptop (and from containers on it) is answered by a local filter; recorded as the interception check and replaced by the private tree.
- A real Kubernetes cluster (kind): needs a privileged node container and more than the 1 GB cap; the pod's resolv.conf, glibc/musl and a real CoreDNS reproduce the DNS behaviour exactly, which is the part that matters. Kube-proxy DNAT and the conntrack races themselves were not reproduced; a relay that drops one packet shows their symptom.
- Timing the walk at internet distances with netem: it would only show delays chosen by hand; the root's measured cold and cached times are quoted instead.
- DoH and DoQ latency comparison from this laptop: TLS-inspected path for some destinations; the published IMC 2022 measurement is cited instead.
- A map of root server instances: a single dated count (2,045) teaches as much.
- Route 53 health-check simulator: a formula (interval x failures + TTL) in the Cache timeline tab is enough.

## What the methodology lacked

A rule for a lab that replaces an unreachable public system: say why the public path could not be observed, record the substitute with real software at real versions, and keep a few real public readings (here over DoT, certificate checked) so the lab is anchored to the world. Also: when a recording contradicts the old page (bare short names with ndots:1, "pooled" clients against a closing server), the recording wins and the correction is shown.
