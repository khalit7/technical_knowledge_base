# 2026-08-24: core networking protocols added

Ad-hoc update requested by Khalid: "add more protocols like UDP, TCP, SSH, and other important must-know protocols if they are not already in there". Scope confirmed with him as the core networking set; messaging/queues and data-movement protocols were deliberately left out for a later pass.

### What changed

Four new deep-dive child pages under **Topic: protocols**. Placement rule applied: no new topic, since all four are protocols and the topic already existed.

- **[new]** [TCP, UDP, and IP: the transport foundations](../topics/protocols/tcp-udp-ip.md). IP addressing and MTU (PMTUD blackholes, AWS 9001 jumbo frames and the 8500/1500 caps, NAT gateway connection limits), TCP window and bandwidth-delay-product math, the Mathis loss bound, Nagle plus delayed ACK, TIME_WAIT and port exhaustion, `SO_REUSEPORT`, keepalive versus heartbeats, accept-queue overflow, congestion control (CUBIC still default, BBRv3 still a draft), UDP sizes and buffer tuning, the Linux knobs that matter, a nine-item checklist for a stalled distributed job, and the ML cases (NCCL socket transport, checkpoint upload throughput, small-file dataloading).
- **[new]** [DNS: resolution, caching, and the failure modes](../topics/protocols/dns.md). Resolver roles and the wire protocol, TTL and negative caching, the record types plus the apex CNAME problem and its three fixes, Kubernetes `ndots:5` amplification and the conntrack 5-second timeout, CoreDNS traps, VPC resolver limits, headless services for training rendezvous, DNSSEC and encrypted transports, rebinding and SSRF against instance metadata, exfiltration, tooling, and three postmortems worth reading.
- **[new]** [TLS and PKI: handshake, certificates, and mTLS](../topics/protocols/tls-and-pki.md). TLS 1.3 mechanics and 0-RTT replay, ALPN and SNI/ECH, the post-quantum migration with measured adoption, certificate lifetime collapse, ACME and ARI, OCSP retirement, CT and CAA, mTLS and workload identity, trust-store and MITM-proxy failure modes, and TLS specifics for LLM serving.
- **[new]** [SSH: protocol, keys, tunnels, and cluster workflows](../topics/protocols/ssh.md). The three protocol layers, current algorithm defaults and the PQ timeline, certificates versus `authorized_keys` sprawl, agent forwarding risk versus ProxyJump, a full `~/.ssh/config` pattern for a jump-host cluster, tunnelling a remote notebook, host-key churn on ephemeral nodes, regreSSHion and Terrapin, and the 2025-2026 CVE cadence.
- **[update]** [Topic: protocols](../topics/protocols/summary.md): taxonomy gained a Foundations branch and a Secure transport and access branch; the map, routing table, and Files list cover all four pages.
- **[update]** [HTTP: 1.1, 2, 3, and what matters for LLM services](../topics/protocols/http.md): TLS section now points at the deep dive, with a dated correction noting RFC 9846 supersedes RFC 8446 and that 90-day certificates are no longer the norm.
- **[update]** [Auth: OAuth2/OIDC, JWTs, API keys, service-to-service, and the agent era](../topics/protocols/auth.md): mTLS bullet points at the new page and flags the end of public-CA client certificates.
- **[update]** Tracker: four unchecked boxes at the top of the protocols section, plus this update.

### Facts from this pass worth acting on

- **Root DNSSEC KSK rollover is 2026-10-11** (KSK-2024, key tag 38696). Trust anchors baked into old container images will SERVFAIL everything afterwards. Audit base images and resolver configs.
- **Certificates issued right after 2026-03-15 were the first capped at 200 days and start expiring in the week of 2026-10-01.** Anything renewed by hand in March or April 2026 is on a clock its owner probably has not noticed.
- **Public CAs stop issuing client-auth certificates by February 2027** (Chrome Root Program hierarchy dedication). Any service-to-service mTLS using publicly trusted client certificates has a deadline.
- **Post-quantum key exchange passed 60 percent of Cloudflare client traffic by February 2026 but only about 10 percent of origins support it.** Own inference endpoints are the exposed leg, and closing it is mostly an OpenSSL 3.5+ or Go 1.24+ upgrade.
- **A single TCP flow on AWS is capped at 5 Gbps** (10 in a cluster placement group, 25 with ENA Express), which is why 140 GB of bf16 weights takes about four minutes single-stream and why `torch.distributed.checkpoint` sharding is worth it for free.
- **`publishNotReadyAddresses: true`**** on the headless service** is the fix for a `torchrun` job that hangs at initialisation: pods cannot get DNS records until ready, and cannot become ready until rendezvous completes.

### Deliberately not added

Messaging and queue protocols (Kafka wire protocol, AMQP, MQTT, NATS, SQS) and data-movement protocols (S3 API semantics, NFS, RDMA verbs) were scoped out of this pass. Both are reasonable future additions: the first probably belongs in ml-infra-and-orchestration, the second overlaps the hardware topic's interconnects page. Ask before assuming they exist.
