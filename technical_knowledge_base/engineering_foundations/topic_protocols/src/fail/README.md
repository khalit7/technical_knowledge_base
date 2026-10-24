# Failure lab (tab t-fail): reproductions and raw outputs

39 failures caused on purpose on one machine (Apple M1 Pro, macOS 27.0.1), each recorded with the exact error text of
several clients and the commands that pinpoint it. The page embeds `out/*.json` byte for byte (after redaction of the
scratch path); `check_embed.py` proves it against the built `index.html`.

## Rerun

    FAIL_WORK=<scratch dir> sh run_all.sh            # everything (about 4 minutes), then make_data.py
    FAIL_WORK=<scratch dir> sh run_all.sh tls http   # some modules
    python3 make_data.py && (cd .. && sh build.sh) && python3 check_embed.py

`run_all.sh` creates, inside FAIL_WORK only: a Python 3.13 venv (requests, httpx, grpcio, h2, hypercorn, dnspython,
PyJWT, mcp 2.3.0, cryptography, aioquic), OpenSSL 3.6 from conda-forge (micromamba), nginx 1.31.6 built from source
with the poll event module (the conda-forge build spins on `kevent()` errors after failed TLS handshakes on this macOS,
writing 500 MB of log in 20 s), and the certificates (`../wire/make_ca.sh` root CA plus `pki.py` variants).

## Redaction
`lab.redact` replaces the scratch path, home directory, global IPv6 and 192.168.x.x addresses, and any secret-looking
token. Names that identify this machine's network filter are passed at run time in `FAIL_REDACT`
(`"pattern=replacement;..."`) so they never enter the repository; without it, `dns_intercept` would record them.

## Files

| File | What |
|---|---|
| `run_cases.py`, `lab.py` | start all servers, run each command through `sh -c` exactly as shown, record, redact |
| `cases/*.py` | one module per layer: meta, conn, dns, tls, http, h2, tcp, auth, agent |
| `catalog.py` | the teaching text per case (symptom, drill question, first check, cause, fix, ML angle, sources, what is simulated) |
| `make_data.py` | joins catalog and outputs into `../parts/32_js_fail_data.js` |
| `check_embed.py` | confirms the page embeds exactly `out/*.json` and no secret-looking text |
| `conf/nginx.conf.in` | one nginx server block per HTTP and TLS failure, plus a stream (L4) balancer |
| `toys.py` | sockets that misbehave one way each (RST, empty reply, short body, keep-alive drop, 429, hang) |
| `dnslab.py`, `ndots_stub.py` | local authoritative and caching DNS servers; the resolv.conf search-list rule |
| `tls_noalpn.py`, `pki.py` | a TLS server without ALPN or with mandatory client certificates; broken certificates |
| `grpc_backend.py`, `h2_bulk.py`, `delay_proxy.py`, `nagle_probe.py` | gRPC backends, HTTP/2 window measurement, added RTT, Nagle probe |
| `auth_server.py`, `mint.py`, `jwt_peek.py` | JWT gateway plus OAuth authorize endpoint, token forger, decoder |
| `mcp_tools.py`, `raw_mcp.py`, `clients/` | MCP servers (SDK and hand-rolled) and every client script |

## Simulated parts (also stated on each card)
Connect timeout uses TEST-NET-1; SERVFAIL, split-horizon and stale cache use the lab's DNS servers; ndots uses a
40-line implementation of the resolv.conf rule against a real DNS server; clock skew is a certificate (or token) dated in
the future; the keep-alive race is made deterministic; RTT comes from a userspace proxy, so the window measured is
HTTP/2's, not TCP's; the OAuth server is the lab's own. Nagle plus delayed ACK did NOT reproduce on macOS loopback.

## Environment notes
This machine's DNS on port 53 is intercepted by a filtering resolver that does not validate DNSSEC, and DoH to public
resolvers is blocked by a TLS-inspecting filter; public DNSSEC failure demos were dropped for that reason, and the interception itself became the dns_intercept case.
