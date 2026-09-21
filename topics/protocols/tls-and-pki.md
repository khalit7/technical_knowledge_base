# TLS and PKI: handshake, certificates, and mTLS

⏱ 22 min read · +17h 30m resources

Added 2026-08-24. [HTTP: 1.1, 2, 3, and what matters for LLM services](http.md) (13 min read · +19h 40m resources) covers TLS in one paragraph as a dependency of HTTP; this is the deep dive. Two things make it worth reading now rather than treating as solved plumbing: the post-quantum migration is genuinely underway on the client side and barely started on the server side, and certificate lifetimes are collapsing on a fixed schedule that ends manual issuance.

### Best resources (1 min)

- [RFC 9846](https://www.rfc-editor.org/info/rfc9846) (July 2026) (4h): TLS 1.3 respecified, **obsoleting RFC 8446** and RFC 5246. Its change list is what your TLS library will adopt on the next upgrade.
- [RFC 10024](https://datatracker.ietf.org/doc/rfc10024/) (2026-08-10) (30 min): post-quantum/traditional hybrid key agreement for TLS 1.3. Definitive codepoints and share sizes for X25519MLKEM768.
- [Cloudflare Radar on PQ adoption](https://blog.cloudflare.com/radar-origin-pq-key-transparency-aspa/) (20 min): the only good measured data, and the source of the client-versus-origin gap below.
- [CA/Browser Forum ballot SC-081v3](https://cabforum.org/2025/04/11/ballot-sc081v3-introduce-schedule-of-reducing-validity-and-data-reuse-periods/) (15 min): the 398 to 200 to 100 to 47 day schedule.
- [Let's Encrypt post-quantum plan](https://letsencrypt.org/2026/06/03/pq-certs) (15 min): the clearest explanation of why PQ signatures lag PQ key exchange, and what Merkle Tree Certificates do about it.
- [Ivan Ristic, Bulletproof TLS](https://www.feistyduck.com/books/bulletproof-tls-and-pki/) (book, ~12h) and [SSL Labs](https://www.ssllabs.com/ssltest/) (10 min): the reference book, and the test you run against your own endpoint.

### TLS 1.3 mechanics (5 min)

**One round trip.** The ClientHello carries a speculative `key_share` plus `supported_groups`, `signature_algorithms`, ALPN, and SNI. The server answers with ServerHello, EncryptedExtensions, Certificate, CertificateVerify, and Finished, and application data flows on the client's second flight. Guess the wrong group and you eat a **HelloRetryRequest** and an extra round trip, which is a live concern now that some clients offer only X25519 while some servers prefer a hybrid PQ group.

**Everything after ServerHello is encrypted**, including the certificate. Passive network monitoring lost certificate visibility when 1.3 shipped, which is why middleboxes fall back to SNI inspection, which ECH is now taking away too.

**What 1.2 lost.** Static RSA key transport is gone, so **forward secrecy is mandatory rather than a configuration choice**. Custom DH groups, compression, DSA, and renegotiation are gone. The ciphersuite now names only the AEAD and hash: `TLS_AES_128_GCM_SHA256` (mandatory to implement), `TLS_AES_256_GCM_SHA384`, and `TLS_CHACHA20_POLY1305_SHA256`. AES-GCM wins anywhere AES-NI exists (all modern x86-64 and Graviton); ChaCha20 wins on hardware without it.

**Resumption and 0-RTT.** Resumption is PSK-based via post-handshake session tickets. Use `psk_dhe_ke`, which keeps forward secrecy. **0-RTT early data is replay-vulnerable by construction** and every mitigation is partial, so it is only safe for idempotent requests. The concrete rule for you: **never enable 0-RTT on an inference endpoint.** A replayed generation request is a duplicate billed inference and, in an agent loop, a duplicate side-effecting tool call.

Session ticket keys must be shared and rotated across a terminator fleet, or resumption silently never hits behind a load balancer.

**ALPN** is negotiated in the ClientHello before any application bytes: `http/1.1`, `h2`, `h3`. **HTTP/2 over TLS is only reachable via ALPN h2**, and gRPC rides h2, so a proxy that does not negotiate it is the single most common cause of "gRPC works locally, breaks behind the load balancer". QUIC requires TLS 1.3 outright and uses the handshake as a key-schedule component (RFC 9001); there is no QUIC over TLS 1.2.

**SNI and ECH.** SNI is plaintext and is the last significant metadata leak in the handshake. **Encrypted Client Hello is now RFC 9849 (March 2026)**, encrypting the inner ClientHello (SNI and ALPN both) under a server key published in a DNS HTTPS/SVCB record, with the key parameter defined by RFC 9848. **ECH is only meaningful over encrypted DNS**, since a plaintext lookup leaks exactly what ECH hides. It needs a shared outer public name across tenants, which makes it effectively CDN-only: you cannot meaningfully deploy it on a single-origin ALB.

The operational consequence is worth planning for: **if your organisation filters egress by SNI, ECH-enabled clients degrade to IP-based control**, and the failure will look like a network error rather than a policy block. Expect this to surface first on `pip` and Hugging Face traffic through corporate proxies.

### Post-quantum: where the migration actually is (4 min)

**Standards.** FIPS 203 (ML-KEM), 204 (ML-DSA), and 205 (SLH-DSA) were finalised on 2024-08-13. HQC was selected in March 2025 as a mathematically distinct backup KEM, with a final standard expected in 2027 and no TLS deployment today. **RFC 10024 (2026-08-10)** standardises the hybrid groups.

| Group | Codepoint | Client share | Server share |
| --- | --- | --- | --- |
| SecP256r1MLKEM768 | 0x11EB | 1249 B | 1153 B |
| X25519MLKEM768 | 0x11EC | 1216 B | 1120 B |
| SecP384r1MLKEM1024 | 0x11ED | 1665 B | 1665 B |

X25519MLKEM768 concatenates the ML-KEM key first, the NIST-curve variants put ECDH first, and getting that backwards is a real interop footgun. The older `X25519Kyber768Draft00` (codepoint 0x6399) from the 2024 Chrome experiment is **not** interoperable with it.

**Adoption, measured.** Cloudflare saw post-quantum key exchange go from under 3 percent of HTTPS requests in January 2024 to 29 percent at the start of 2025, 52 percent by December 2025, and **over 60 percent by February 2026**. Apple enabling it by default in iOS 26 moved iOS from under 2 percent to 11 percent globally in four days. Meanwhile **origin servers went from under 1 percent to only about 10 percent** over the same period.

That gap is the actionable finding: **the client half of the internet is done and your own inference endpoints are almost certainly in the unprotected 90 percent.** If harvest-now-decrypt-later is in your threat model, the exposed legs are your endpoints and internal service hops, and closing them is mostly an OpenSSL 3.5+ or Go 1.24+ upgrade. OpenSSL 3.5.0 (2025-04-08) offers and prefers hybrid groups **by default**, so an upgrade turns this on silently; test for middlebox intolerance to the larger ClientHello.

**Why signatures lag.** The threat models differ. Key exchange is vulnerable retroactively (record now, decrypt later), so the fix must land before a quantum computer exists. Authentication only breaks on the day one exists, because forging a signature has to happen in real time. Then there is size: ECDSA P-256 is a 65-byte key and 72-byte signature; **ML-DSA-44 is 1,312 bytes and 2,420 bytes**. A naive ML-DSA chain runs 14 to 18 KB, blowing straight past the roughly 14.5 KB initial congestion window and adding a round trip at the worst possible moment, and Certificate Transparency takes a handshake from three signatures to five. **Merkle Tree Certificates** are the way out: the CA signs a batch, browsers fetch batch roots out of band, and the handshake carries one signature plus an inclusion proof, ending up smaller than today's classical handshake. Let's Encrypt plans staging issuance in late 2026 and production in 2027.

**Deadlines.** NSA's CNSA 2.0 wants browsers, servers, and cloud services to support and prefer PQ from 2025 and to use it exclusively by 2033, with software and firmware signing at 2030 and an overall 2035 target. Google has publicly aimed at 2029 for its own migration.

### Certificates and PKI (5 min)

**Chain of trust.** Leaf, then intermediates, then a self-signed root distributed out of band in trust stores. Roots stay offline; intermediates do the signing so a compromise is recoverable without a trust-store update. **The server must send leaf plus all intermediates and not the root.** Path building is a graph search rather than a linked list, because cross-signed intermediates create multiple valid paths, and clients differ in which they find. That is why "works in Chrome, fails in Java" happens.

**CN as a hostname is dead.** Chrome dropped the fallback in 2017 and every modern stack requires SAN. Wildcards match exactly one label, so `*.example.com` does not cover `a.b.example.com` and does not cover the apex.

**Lifetimes are collapsing on a schedule.** Ballot SC-081v3 passed on 2025-04-11:

| Effective | Max validity | Max domain-validation reuse |
| --- | --- | --- |
| through 2026-03-14 | 398 days | 398 days |
| 2026-03-15 (in force now) | 200 days | 200 days |
| 2027-03-15 | 100 days | 100 days |
| 2029-03-15 | 47 days | 10 days |

The 47 is 31 plus 15 plus 1 day of slack. **The 2029 drop in validation reuse to 10 days is the harder change than the short certificate**: it means re-validating domain control on essentially every issuance, which ends manual DNS or HTTP validation at any scale and makes your DNS provider a hard dependency of certificate renewal. CAs already issue below the cap for margin (DigiCert 199 days, AWS ACM 198).

**Near-term risk.** Certificates issued right after 2026-03-15 were the first capped at 200 days, so they begin expiring **in the week of 2026-10-01**. Anything renewed by hand in March or April 2026, by someone who assumed a year, is on a clock they have not noticed.

**ACME.** RFC 8555, with IP identifiers in RFC 8738 and **ARI (renewal information) in RFC 9773, June 2025**. ARI lets the CA hand clients a suggested renewal window, which is how mass-revocation events get spread instead of stampeding, and it becomes load-bearing at 47-day lifetimes. Turn it on. Let's Encrypt made **6-day certificates and IP-address certificates generally available on 2026-01-15** via the `shortlived` profile, and has said the default will fall from 90 to 45 days. **AWS ACM shipped a managed ACMEv2 endpoint on 2026-06-30**, compatible with Certbot, `acme.sh`, and cert-manager, using External Account Binding: a genuinely useful way to issue publicly trusted certificates to EKS workloads.

**OCSP is gone at Let's Encrypt.** OCSP URLs were removed from certificates on 2025-05-07 and **the responders were switched off on 2025-08-06**. If you still have `ssl_stapling on` pointed at an LE certificate it is a silent no-op, and any code path that hard-requires an OCSP response now fails closed. Revocation moved to CRLs plus the browsers' own aggregated push (CRLite, CRLSets), which is both cheaper and more private, since OCSP leaked visitor IP and destination to the CA.

**Certificate Transparency** (RFC 6962) requires SCTs for a certificate to be trusted by Chrome. The ecosystem is migrating from RFC 6962 logs to the **Static CT API**, with Let's Encrypt's old logs fully shut down on 2026-02-28. Two practical uses: monitor `crt.sh` or Cert Spotter for your domains to catch shadow-IT and mis-issuance, and remember that **CT is public**, so internal hostnames in a public certificate are permanently disclosed. Internal names belong in a private CA.

**CAA** restricts which CAs may issue for a name and has been mandatory for CAs to check since 2017. The `accounturi` and `validationmethods` parameters bind issuance to a specific ACME account, which is a strong and underused control. Since **MPIC enforcement began on 2025-09-15**, CAs must corroborate domain validation and CAA checks from multiple network vantage points, so split-horizon or geo-varying DNS answers can now fail issuance where they previously worked.

### mTLS (2 min)

The server sends a CertificateRequest; the client answers with its certificate and a CertificateVerify signature over the handshake transcript. In TLS 1.3 this sits inside the encrypted handshake, so client certificates are not exposed on the wire. Post-handshake client authentication replaces 1.2's renegotiation-based "authenticate on demand".

**Authorization is a separate step.** After chain validation you still map the identity to a policy decision. A certificate from your internal CA proves membership, not permission, so pin on the SPIFFE ID or SAN, never on "was signed by our CA".

Where you meet it: **Istio** (identity as a SPIFFE URI SAN, certificates typically 24 h and rotated at half life, ambient mode moving mTLS from a per-pod sidecar into a node-level ztunnel), **Linkerd** (on by default, identity from the ServiceAccount token), **SPIFFE/SPIRE** (node attestation plus workload attestation, SVIDs delivered over a Unix socket with typical 1-hour TTLs, federation across trust domains), and **AWS IAM Roles Anywhere** (X.509 from your private CA exchanged for temporary STS credentials, up to 12 hours) for on-prem and CI workloads.

**Rotation is the real cost.** One-hour SVIDs mean the application must reload credentials without restarting: Go handles it via `GetCertificate` callbacks, while Python needs a whole new `SSLContext` because you cannot mutate one in place. **Long-lived connections never pick up rotated certificates or revocation**, so set gRPC `max_connection_age` if you want identity to actually turn over. Clock skew is fatal at short TTLs (five minutes of skew burns 8 percent of a one-hour lifetime), so run chrony everywhere, and on EC2 point it at 169.254.169.123. Trust-bundle rotation is the genuinely hard part: distribute the new CA to every verifier **before** any issuer starts signing with it, as an overlap and not a cutover.

**A dated change that will break things.** Chrome's Root Program requires roots in its store to be dedicated to TLS server authentication, so public CAs are ending certificates that carry both serverAuth and clientAuth. Sectigo stopped including clientAuth by default on 2025-09-15, with full removal by **February 2027** and the Chrome policy deadline in March 2027. **If any service-to-service mTLS relies on publicly trusted certificates for the client side, that path is scheduled for removal.** Move to ACM Private CA, SPIRE, Vault, or cert-manager with a private issuer before it becomes urgent.

### Failure modes you will actually hit (3 min)

- **Expired certificates** remain the top outage cause. Alert on days remaining, not on renewal-job success, and at short lifetimes alert at one third of remaining life.
- **Clock skew**: "certificate is not yet valid" on a fresh certificate means the client's clock is behind. Common in containers, CI runners, and devices without an RTC, and it breaks JWT `nbf` at the same time, which is a useful tell.
- **Incomplete chains**: browsers paper over a missing intermediate by fetching it from the AIA extension; curl, Python, and Go do not. So the site is green in Chrome and Python raises `unable to get local issuer certificate`. **The server is misconfigured and the client is correct.** Diagnose with `openssl s_client -connect host:443 -servername host -showcerts` and count what came back; fix by serving `fullchain.pem`.
- **Trust-store confusion**: `SSL_CERT_FILE` is the broadest lever (OpenSSL, and Python's default context), `REQUESTS_CA_BUNDLE` is requests-only, `CURL_CA_BUNDLE` covers curl and requests, `NODE_EXTRA_CA_CERTS` is additive and the most civilised of them. Setting the requests variable does nothing for `httpx`, `aiohttp`, or a Go binary.
- **Corporate MITM proxies** (Zscaler, Netskope) terminate TLS and re-sign with a private root pushed to the OS store. **Python does not use the OS store; it uses certifi's bundled file.** Hence browser fine, `pip install` broken, `huggingface_hub` broken, `docker pull` broken. The right fix is installing the corporate root into the system store and using **`truststore`** (`pip --use-feature=truststore`) so Python inherits OS policy. Never `verify=False` or `--trusted-host`. Note that such proxies frequently do not support PQ key exchange and choke on large ClientHellos, which is a new 2025-2026 failure class against OpenSSL 3.5+ clients.
- **certifi drift**: it ships Mozilla's bundle frozen at package build time, so a pinned old certifi in a Docker image knows nothing about your corporate root and lags trust-store removals. Prefer `truststore` in production.
- **Verification disabled in sample code**: `verify=False`, `InsecureSkipVerify: true`, `curl -k`, `ssl._create_unverified_context()`. Encryption without authentication is encryption to an unknown party. Note that `ssl.CERT_NONE` also silently disables hostname checking, and that disabling hostname checking while keeping `CERT_REQUIRED` accepts any valid certificate for any name, which is subtly rather than obviously broken. Add a CI lint rule.
**Know where TLS actually terminates.** "We have mTLS" usually means the sidecar has mTLS, while traffic from ALB to ingress to sidecar may traverse several plaintext hops. An NLB in TCP mode passes everything through; an ALB terminates and sees plaintext, and **does not verify the backend certificate** when re-encrypting. If the application needs the client certificate behind an L7 terminator you must forward it explicitly (Envoy's XFCC, nginx's `ssl_client_escaped_cert`), and then you must not trust that header from untrusted sources or you have built an authentication bypass.

### What an LLM-serving engineer hits (1 min)

- **Handshakes, not bytes, are the cost.** AES-GCM at tens of Gbps per core is free; the asymmetric crypto in the handshake is not. So the lever is connections per second. A Python client creating a fresh `Session` per inference call pays a full handshake per token stream, which is a real and frequently missed p99 contributor.
- **PQ adds bytes, not CPU.** ML-KEM operations are fast; the 1,216-byte client share versus 32 for X25519 spreads the ClientHello across packets. It is a per-connection cost, so connection reuse mitigates it too.
- **Long-lived streams like TLS 1.3 specifically.** Renegotiation is gone, replaced by `KeyUpdate`, a one-way symmetric ratchet with no re-authentication and no stall, which is exactly what a multi-hour SSE or bidirectional gRPC stream needs to stay inside AEAD key-usage limits. RFC 9846 tightened those limits from SHOULD to MUST and restricted KeyUpdate frequency, so check your library's behaviour after upgrading.
- **gRPC and Triton** need ALPN `h2` end to end. On AWS that means an ALB target group with protocol version GRPC, and TLS to the target.
- **Ray's internal gRPC is unauthenticated and unencrypted by default.** TLS exists behind `RAY_USE_TLS` but is off and costs throughput on the object-transfer path. Treat a Ray cluster as one trust domain on an isolated network, never spanning a security boundary, and remember the dashboard on 8265 is a known remote-code-execution vector when exposed. vLLM's own security guidance is the same shape: put it behind a reverse proxy and do real authentication there, because its API-key check is a static bearer comparison rather than an authentication system.
- **Multi-node inference over NCCL has no TLS at all.** That traffic is plaintext by design; isolate it at the network level and say so explicitly in a threat model rather than assuming the mesh covers it.

### Timeline of recent changes (1 min)

| Date | Change |
| --- | --- |
| 2026-08-10 | RFC 10024: hybrid PQ key agreement standardised |
| 2026-07 | RFC 9846 respecifies TLS 1.3, obsoleting RFC 8446 |
| 2026-06-30 | AWS ACM managed ACMEv2 endpoint |
| 2026-03 | RFC 9849 (ECH) published |
| 2026-03-15 | SC-081 phase 1: 200-day maximum validity |
| 2026-02-18 | ACM default validity 395 to 198 days |
| 2026-01-15 | Let's Encrypt 6-day and IP-address certificates GA |
| 2025-09-15 | MPIC enforcement; Sectigo drops default clientAuth |
| 2025-08-06 | Let's Encrypt OCSP responders switched off |
| 2025-04-08 | OpenSSL 3.5.0 prefers hybrid PQ groups by default |

### Connections

- TLS as a dependency of HTTP versions, ALPN, and Alt-Svc: [HTTP: 1.1, 2, 3, and what matters for LLM services](http.md) (13 min read · +19h 40m resources).
- Tokens, OAuth, and where mTLS fits among service-to-service options: [Auth: OAuth2/OIDC, JWTs, API keys, service-to-service, and the agent era](auth.md) (11 min read · +9h resources).
- CAA records, DNS-01 validation, and the HTTPS/SVCB record that carries the ECH key: [DNS: resolution, caching, and the failure modes](dns.md) (21 min read · +6h 15m resources).
- Host keys, TOFU, and SSH's parallel post-quantum migration: [SSH: protocol, keys, tunnels, and cluster workflows](ssh.md) (21 min read · +7h resources).
