# DNS: resolution, caching, and the failure modes

⏱ 21 min read · +6h 15m resources

DNS is the most boring protocol you depend on and the most common cause of an outage that looks like something else. Mechanics first, then the specific ways it breaks in Kubernetes, clusters, and AWS, which is where you will actually meet it.

### Best resources (1 min)

- [RFC 1034](https://www.rfc-editor.org/rfc/rfc1034) (1h 20m) and [RFC 1035](https://www.rfc-editor.org/rfc/rfc1035) (1h 20m) for the original model and wire format, [RFC 9499](https://www.rfc-editor.org/rfc/rfc9499) (1h 20m) for current terminology, [RFC 2308](https://www.rfc-editor.org/rfc/rfc2308) (30 min) for negative caching (the one that causes outages).
- [Kubernetes DNS specification](https://github.com/kubernetes/dns/blob/master/docs/specification.md) (30 min): normative record schemas for services, headless services, SRV and PTR.
- [ndots:5 explained](https://pracucci.com/kubernetes-dns-resolution-ndots-options-and-why-it-may-affect-application-performances.html) (15 min): the clearest writeup of the search-path amplification problem.
- [Racy conntrack and DNS lookup timeouts](https://lambda.lt/blog/2018/racy_conntrack.html) (20 min): the original analysis of the three kernel races behind Kubernetes 5-second DNS timeouts.
- [AWS post-event summary, DynamoDB us-east-1, 2025-10-19](https://aws.amazon.com/message/101925/) (25 min): the best modern case study in DNS control-plane failure.
- [ICANN root KSK rollover](https://www.icann.org/resources/pages/ksk-rollover-en) (15 min): the dated action item, see the bottom of this page.

### Mechanics (4 min)

Three roles. The **stub resolver** is libc (`getaddrinfo`), which asks one question and caches nothing. The **recursive resolver** does the legwork and holds the cache (1.1.1.1, CoreDNS, the AWS VPC resolver). The **authoritative server** holds zone data and never recurses.

The client-to-resolver leg is recursive; the resolver-to-root-to-TLD-to-authoritative legs are iterative, each returning a referral rather than an answer. There are 13 root server identities across roughly 1,900 anycast instances, and the number 13 is a legacy artifact of fitting the priming response into 512 bytes. **QNAME minimisation** (RFC 9156) is now default in the major resolvers: only the labels the next server needs are sent, so the root no longer learns your full query.

**Wire format.** UDP and TCP port 53, a 12-byte header, labels at most 63 octets, names at most 255 octets, classic UDP payload at most 512 bytes. **EDNS(0)** (RFC 6891) adds an OPT pseudo-record carrying a larger advertised payload size, the DNSSEC OK bit, and the option space (client subnet, cookies, padding). DNS Flag Day 2020 settled on advertising **1232 bytes** to avoid IP fragmentation, which is both lossy and a poisoning vector; the older 4096 default is now considered harmful. Truncated responses set TC=1 and the client retries over TCP, which **RFC 7766 makes mandatory to support** and firewalls still block. Message compression uses a 14-bit offset pointer, so it only reaches into the first 16,383 bytes.

**TTL and caching.** The zone owner sets a TTL per RRset; the resolver counts it down. There is no push and no invalidation, which is the root of the "propagation" misconception below. RFC 8767 lets a resolver serve stale data when authoritatives are unreachable, and it is on by default in Unbound and BIND.

**Negative caching is the sharp edge.** The negative TTL is `min(SOA MINIMUM, TTL of the SOA record)`, and RFC 2308 repurposed the old MINIMUM field for exactly this. So a zone with `MINIMUM 86400` caches your accidentally-deleted record's NXDOMAIN for a day, and fixing the record does not fix clients. It covers NODATA as well as NXDOMAIN, which is what bites services queried for AAAA when they only have an A. **Keep SOA MINIMUM at 300 to 900 seconds on zones under active change.**

### Records that matter (2 min)

| Type | Note |
| --- | --- |
| A / AAAA | `getaddrinfo` queries both in parallel, which is load-bearing for the conntrack race below. |
| CNAME | Alias to another name. If a CNAME exists at a node, no other data may exist there (RFC 1034), which is why it is illegal at a zone apex. |
| MX | Target must be an A/AAAA name, never a CNAME. Null MX is `0 .` (RFC 7505). |
| TXT | Strings of at most 255 octets, concatenated. Carries SPF, DKIM, DMARC, and every domain-verification challenge. A 2048-bit DKIM key must be split across multiple strings, and forgetting that is the classic misconfiguration. |
| SRV | `_service._proto.name` with priority, weight, port, target. Kubernetes publishes these per service port. |
| SOA | Serial, refresh, retry, expire, and the negative-cache MINIMUM. |
| CAA | RFC 8659. Restricts which CAs may issue for the name; mandatory for CAs to check since 2017. See [TLS and PKI: handshake, certificates, and mTLS](tls-and-pki.md). |
| PTR | Reverse lookups under `in-addr.arpa` and `ip6.arpa`. Rarely load-bearing except for mail and some cluster tooling. |
| SVCB / HTTPS | RFC 9460. The modern one: carries ALPN, port, IP hints, and the `ech` parameter, and provides standards-track apex aliasing. |

**The apex CNAME problem has three fixes.** Provider-side ALIAS or CNAME flattening, where the authoritative server resolves the target and returns a synthetic A record (the ANAME draft expired, so every implementation is proprietary). Route 53 **alias records**, which are legal at the apex, free to query, take their TTL from the target, and answer only when name and type both match. Or **HTTPS/SVCB AliasMode**, the standards-track answer, now supported by all major browsers.

### The failure modes (6 min)

**"Propagation" is a myth.** Nothing propagates; authoritative data changes instantly and you are waiting for caches to expire. Lower the TTL at least one old-TTL period *before* the change, then change, then raise it. Nameserver changes are the genuinely slow ones because `.com` delegation records carry a **48-hour** TTL at the TLD.

**Clients ignore TTL in both directions.** The JVM caches DNS indefinitely under a SecurityManager and for about 30 s otherwise, which is why long-lived Java services pin themselves to dead load balancer IPs. **Python caches nothing at all**: `socket.getaddrinfo` calls libc every time, and neither `requests` nor `urllib3` adds a cache. What saves you in practice is connection pooling, so code that creates a fresh `Session` per request resolves on **every single call**. That is exactly how a training loop pulling from S3 generates five-figure QPS at CoreDNS.

**glibc versus musl matters.** glibc queries nameservers sequentially with a 5 s timeout and supports `single-request`, `single-request-reopen`, and `use-vc`; musl queries all nameservers in parallel and supports none of those options, so the conntrack workarounds below do not exist on Alpine. Search-domain handling differs enough that lowering `ndots` can break Alpine pods where it works on Debian. Prefer glibc base images for ML containers anyway.

#### Kubernetes ndots:5 amplification

kubelet writes a search list plus `options ndots:5` into every pod. A name with fewer than 5 dots is tried against the **search list first** and as an absolute name last. So `s3.us-east-1.amazonaws.com` (3 dots) produces five sequential queries, four of which are NXDOMAIN, and glibc doubles it by asking for A and AAAA in parallel: **ten packets for one hostname**. On an object-store-heavy job this is where CoreDNS falls over.

Fixes, in order: a **trailing dot** on the hostname (one query), a per-pod `dnsConfig` setting `ndots: 1`, NodeLocal DNSCache, or the CoreDNS `autopath` plugin. Lowering ndots breaks bare short names like `myservice`, so callers must use `myservice.namespace` or the FQDN.

#### The 5-second timeout (conntrack race)

glibc and musl both send A and AAAA **from the same socket and source port**. UDP has no handshake, so no conntrack entry exists until a packet is sent, and the two packets race through `nf_conntrack`. Three distinct races follow: both packets create entries for the same tuple and one is dropped; one entry confirms first and the second gets its source port rewritten so the reply no longer matches; or the two packets DNAT to different CoreDNS backends. The first two were fixed in Linux 4.17. **The third was never fixed in-kernel** and requires avoiding DNAT for DNS entirely.

The symptom is a clean **5-second latency spike**, because that is glibc's default resolver timeout before retry. The real fix is **NodeLocal DNSCache**: a per-node DaemonSet cache on link-local `169.254.20.10` that bypasses DNAT for the pod-to-cache hop and upgrades the cache-to-CoreDNS hop to TCP. It has been stable since Kubernetes 1.18.

#### CoreDNS traps

`forward . /etc/resolv.conf` inherits the node's resolver, and if that is a systemd-resolved stub at `127.0.0.53` you have built a loop. The `loop` plugin detects this and deliberately crashes the pod, which is the leading cause of CrashLoopBackOff on a new cluster. CoreDNS is CPU-bound and has no HPA by default, so scale it with node count. Alarm on `coredns_dns_responses_total{rcode="NXDOMAIN"}`, whose rate is the ndots-amplification signature.

#### AWS specifics

The **VPC resolver is limited to 1,024 packets per second per ENI**, and excess queries are silently dropped, surfacing as random timeouts. A dense pod-per-node cluster with ndots amplification hits this routinely. Private hosted zones give you split-horizon resolution (and need `enableDnsSupport` and `enableDnsHostnames`); Resolver endpoints bridge to on-prem in both directions and are billed per query, which is a surprisingly common bill spike.

Route 53 health checks run at 30 s standard or 10 s fast intervals with a default failure threshold of 3, and **require a public endpoint**: for private resources you need a CloudWatch alarm plus a calculated check. Routing policies worth knowing are weighted, latency, failover, and multivalue-answer (up to 8 healthy records).

#### Distributed training rendezvous

Collectives need every rank to address every other rank directly, so a ClusterIP that DNATs to one random pod is useless. Use a **headless service** (`clusterIP: None`), which returns one A record per ready endpoint and, with a StatefulSet, gives stable ordinal names like `myjob-0.myjob-headless.default.svc.cluster.local`.

**Set publishNotReadyAddresses: true.** Otherwise pods get no DNS record until they pass readiness, and they cannot become ready until rendezvous completes, which needs DNS. That deadlock is the single most common cause of a `torchrun` job hanging at initialisation.

Ray needs DNS only to find the head node (GCS on 6379) and does its own actor discovery afterwards, but it is not forgiving of a 5-second DNS stall. Multi-replica vLLM should sit behind a real router that can do KV-cache-aware routing, not DNS round-robin.

### Security and privacy (4 min)

**DNSSEC** authenticates data origin and integrity and provides authenticated denial of existence, via a chain from the root trust anchor through DS and DNSKEY records to per-RRset signatures. It does **not** provide confidentiality, does not protect the stub-to-resolver hop, does not help against DDoS (it makes amplification worse), and says nothing about the service you then connect to. Roughly **36 percent of users sit behind validating resolvers, while only about 7 percent of zones are signed**, essentially flat after twenty years.

On **2026-05-05 DENIC published non-validatable signatures for the .de zone during a KSK rollover**, and every compliant validating resolver was obliged to return SERVFAIL, taking millions of domains dark regardless of who hosted them. Cloudflare mitigated hours later by marking `.de` insecure. DNSSEC converts a signing bug into a total hierarchy-wide outage.

**Encrypted transports.** DoT (RFC 7858) on port 853/TCP is trivially blockable by policy. DoH (RFC 8484) on 443 is indistinguishable from HTTPS, which is why enterprises dislike it. DoQ (RFC 9250) on 853/UDP is where things are actually heading: 2026 measurements found far better session resumption and 0-RTT support than DoH/3, median RTT of 88 ms against 883 ms, and at most a 1 percent page-load difference against plain DNS.

**Poisoning.** Kaminsky (2008) worked because the only entropy was a 16-bit transaction ID; source port randomisation (RFC 5452) raised that to roughly four billion combinations, with DNS cookies and 0x20 encoding as further defence. SAD DNS (2020) re-opened it via an ICMP rate-limit side channel that leaked the source port, and was fixed by randomising the counters. Fragmentation also bypasses port randomisation, which is a second reason for the 1232-byte buffer.

**DNS rebinding is the one that should worry an ML engineer.** The attacker serves a hostname with TTL 0, answers first with their own IP so your browser loads their JavaScript under that origin, then re-answers with `169.254.169.254` or an internal RFC 1918 address. The same-origin policy keys on the **name**, not the IP. Every Jupyter, Ray dashboard, MLflow, TensorBoard, and vLLM endpoint bound to `0.0.0.0` without auth is reachable this way from a colleague's browser.

The same trick is the SSRF time-of-check bypass: validate a URL by resolving the hostname, see a public IP, allow it, then let the HTTP client resolve again and get the metadata IP. **Any allowlist that validates a name and then connects by name is broken.** Resolve once, validate the IP, connect to the literal IP with an explicit Host header. Enforce **IMDSv2** (session tokens, so a bare GET fails) with `HttpPutResponseHopLimit: 1` so containers cannot reach the metadata service.

**Exfiltration.** Data encoded into query labels of an attacker-controlled domain leaves via your own resolver, so egress firewalls and proxies never see it. Throughput is low but sufficient for credentials and keys. SUNBURST used exactly this. Detection means watching unique-subdomain cardinality, label entropy, and NXDOMAIN ratios per domain; on AWS, Route 53 Resolver query logging is the native control and is **off by default**.

### Tools (1 min)

```bash
dig example.com +short                       # the answer
dig @ns1.example.com example.com +norecurse  # ask the authoritative directly
dig example.com +trace                       # iterate from the root, bypassing your cache
dig example.com SOA +noall +answer           # find the negative-cache TTL
dig example.com +dnssec                      # look for the ad flag
dig example.com +cd                          # checking disabled: proves it is DNSSEC
dig -x 8.8.8.8                               # reverse
dig example.com +nsid                        # which anycast instance answered
```

Repeat a query and watch the TTL count down: decreasing means you are being served from cache, resetting to maximum means you reached the authoritative. `+trace` is how you separate "my zone is broken" from "my resolver cached garbage". Use **`delv`** for real DNSSEC chain debugging, **`kdig`** for DoT/DoH/DoQ, and **`doggo`** as a modern `dig` replacement with JSON output. `nslookup` is not formally deprecated but is discouraged: it uses its own resolution path and obscures errors.

Always compare three answers when diagnosing: the authoritative directly, your resolver, and a public resolver. Divergence localises the fault to zone data, your cache, or split-horizon.

### Outages worth reading (2 min)

- **AWS us-east-1, 2025-10-19.** Three independent DNS Enactors raced: one stalled while applying an old plan, a second applied a newer plan and then cleaned up older ones, and the first woke and overwrote the newer plan with its stale copy, after which the cleanup deleted the now-active plan. The result was **an empty DNS record** for `dynamodb.us-east-1.amazonaws.com`, an inconsistent state that blocked automated repair and required manual intervention. DynamoDB impact ran 14 h 32 m, with cascades into EC2 lease management and NLB health checks. The lessons: a control plane can race with itself, "empty answer set" is a valid and catastrophic state, and recovery time is floored by TTL.
- **Cloudflare 1.1.1.1, 2025-07-14.** A configuration error introduced on 6 June sat dormant with no alert for five weeks, then a routine change activated it and collapsed the resolver prefixes to a single offline location. 62 minutes. An unrelated BGP hijack became visible during the window and was widely misreported as the cause.
- **The .de DNSSEC failure, 2026-05-05.** Above.

### Dated action item (1 min)

**The root KSK rollover is scheduled for 2026-10-11** (new key KSK-2024, key tag 38696). RFC 5011 automatic updates are not guaranteed to have succeeded, and **stale trust anchors baked into container images are the top risk**: an image built in 2023 has no KSK-2024 and will SERVFAIL everything afterwards. Audit trust anchors in base images, AMIs, and resolver configs before then.

### Connections

- UDP payload limits, fragmentation, and buffer tuning that DNS depends on: [TCP, UDP, and IP: the transport foundations](tcp-udp-ip.md) (17 min read · +5h 35m resources).
- CAA records, certificate DNS validation, and why a 10-day validation-reuse window makes DNS a hard dependency of certificate renewal: [TLS and PKI: handshake, certificates, and mTLS](tls-and-pki.md) (22 min read · +17h 30m resources).
- The HTTPS/SVCB record's role in Encrypted Client Hello: same page.
- Service discovery and rendezvous for distributed training: [Topic: ml-infra-and-orchestration](../ml-infra-and-orchestration/summary.md).
