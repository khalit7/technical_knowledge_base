# The running example: one streaming LLM request

Every tab of Topic: protocols follows this one request. It is a local stand-in for an LLM API, so every byte can be recorded; real public hosts appear only in timing comparisons, labelled.

Recorded 2026-10-05 on an Apple M1 Pro MacBook Pro, macOS (Darwin 27.0.0), curl 8.7.1 (SecureTransport, nghttp2 1.69.0), LibreSSL 3.3.6, Python 3.13, hypercorn 0.18.0, h2 4.4.1, aioquic 1.3.0.

## The server

- `llm_server.py`: an ASGI app. `POST /v1/messages` with a JSON body answers `200` with `content-type: text/event-stream` and streams Server-Sent Events: `message_start`, then one `content_block_delta` per token (`"The"`, `" sky"`, `" is"`, `" blue"`, `"."`), then `message_stop`. The event names and JSON shapes follow Anthropic's Messages API streaming format, trimmed (the real API also sends `content_block_start`, `content_block_stop`, `message_delta` and `ping`). No model runs: the tokens are fixed so every run sends the same bytes. `FIRST_TOKEN_DELAY` (0.12 s, stands in for prefill) and `TOKEN_GAP` (0.05 s) are env vars. Also `GET /health` (200 `ok`), anything else 404, a bad JSON body 400.
- Served by hypercorn with TLS from a throwaway local CA (`make_ca.sh`: ECDSA P-256 root "Wire Lab Root CA", leaf `CN=api.llm.test`, SAN `api.llm.test`, `localhost`, `127.0.0.1`, 7 days):
  - HTTPS on TCP `127.0.0.1:8443`: HTTP/1.1 or HTTP/2, chosen by ALPN.
  - HTTP/3 over QUIC on UDP `127.0.0.1:8443` (advertised by `alt-svc: h3=":8443"; ma=3600`).
  - Plain HTTP/1.1 (no TLS) on TCP `127.0.0.1:8080`, for `nc` and byte-level demos.
  - Ports are env vars: `TLS_PORT`, `PLAIN_PORT` (another tab should run its own instance on other ports).
- The name `api.llm.test` is not in DNS (`.test` is reserved by RFC 6761 section 6.2); clients pin it with `curl --resolve api.llm.test:8443:127.0.0.1`. DNS itself is shown against real public names.

## The exact request (117-byte body, `request.json`)

```
POST /v1/messages HTTP/1.1
Host: api.llm.test
content-type: application/json
x-api-key: sk-wirelab-not-a-real-key
content-length: 117
connection: close

{"model":"wire-lab-1","max_tokens":16,"stream":true,"messages":[{"role":"user","content":"What colour is the sky?"}]}
```

`raw/h1_request.bin` is exactly these 277 bytes (CRLF line ends) as sent to the plain port. The key is a fake placeholder.

## The exact response (plain HTTP/1.1, `raw/h1_response.bin`, 1062 bytes)

```
HTTP/1.1 200 
content-type: text/event-stream
cache-control: no-cache
x-request-id: req_wirelab_0001
date: Mon, 05 Oct 2026 13:47:37 GMT
server: hypercorn-h11
alt-svc: h3=":8443"; ma=3600
Transfer-Encoding: chunked
Connection: close

81
event: message_start
data: {"type":"message_start","message":{"id":"msg_wirelab_0001","model":"wire-lab-1","role":"assistant"}}


76
event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"The"}}

...(one chunk per token: " sky", " is", " blue", ".")...
33
event: message_stop
data: {"type":"message_stop"}


0

```

`81`, `76` are HTTP/1.1 chunk sizes in hex (RFC 9112 section 7.1). The response head is 244 bytes and the SSE payload alone (what an app parses) is 771 bytes; over HTTP/2 and HTTP/3 the same events travel in DATA frames instead of chunks. `raw/h1_arrivals.json` holds the arrival times of each read (headers and the message_start event together at about 2 ms, the first token at about 124 ms, tokens about 50 ms apart, end at about 330 ms).

## How to reproduce

```sh
S=<scratch dir>; python3.13 -m venv $S/.venv && $S/.venv/bin/pip install h2 hypercorn aioquic httpx cryptography dnspython
sh make_ca.sh $S/pki
sh serve.sh $S/.venv/bin/python $S/pki &          # TLS_PORT / PLAIN_PORT env to move it
# HTTP/1.1 and HTTP/2 over TLS
curl -sS --http1.1 -N --cacert $S/pki/ca.pem --resolve api.llm.test:8443:127.0.0.1 \
  https://api.llm.test:8443/v1/messages -H 'content-type: application/json' \
  -H 'x-api-key: sk-wirelab-not-a-real-key' --data-binary @request.json      # or --http2
# HTTP/3 (macOS curl has no HTTP/3; aioquic client)
$S/.venv/bin/python h3_client.py --ca $S/pki/ca.pem
# raw bytes over plain TCP
$S/.venv/bin/python raw_h1.py
```

`run_all.sh` reruns every capture used by the On the wire tab into `raw/`. Private keys stay in the scratch dir; `raw/ca.pem` and `raw/server.pem` are the public certificates of the recorded run.

## Notes for the other tabs (found while recording, 2026-10-05)

- **Python 3.13 rejects a CA made without key identifiers.** The first CA from `make_ca.sh` lacked `subjectKeyIdentifier`/`authorityKeyIdentifier`; curl (SecureTransport) accepted it, Python's `ssl` (OpenSSL 3.5, `VERIFY_X509_STRICT` on by default since Python 3.13) failed with `CERTIFICATE_VERIFY_FAILED ... Missing Authority Key Identifier`. The kept CA has both extensions. A good Failure lab case: same cert, one client accepts, one refuses.
- **Post-quantum key exchange is already on.** Python's OpenSSL 3.5 ClientHello carries two key shares, `X25519MLKEM768` (1216 bytes) and `x25519` (32), and the Wire Lab server picked the hybrid: ClientHello 1523 bytes, ServerHello 1210 (`raw/client_h2.json`, parsed by `build_data.py`). Against www.cloudflare.com the TLS 1.3 handshake was 1573 bytes out (`raw/public_tls1.3_cloudflare.json`).
- **DNS on this laptop is intercepted.** `dig @198.41.0.4 api.anthropic.com A +norecurse` (a.root-servers.net, which never answers for a name below .com and never recurses) returned a final answer with the `ra` flag (`raw/dig_root_norecurse.txt`), and `dig +trace` shows a "root server" answering the A query: a device-management DNS filter answers every port-53 query. DoH by name (`https://cloudflare-dns.com/dns-query`) resolves to the filter's block page and fails with `curl: (60) SSL certificate problem: unable to get local issuer certificate` (`raw/doh_by_name_blocked.txt`; vendor name redacted); DoH by IP literal (`https://1.1.1.1/dns-query`) works. Symptom: certificate error; cause: DNS.
- **Uncached DNS costs hundreds of ms here** (first curl runs: 212--451 ms; later runs about 2.4 ms from the OS cache; `dig` bypasses that cache: 105--124 ms each, `raw/dig_repeat.tsv`). TTL of api.anthropic.com in the recorded files: 198 and 206 s from the filtering resolver, 63 s from 1.1.1.1 over DoH: each cache counts down its own copy.
- **Ports in use by this tab's scripts:** server 8443 (TCP+UDP) and 8080, `netem.py` proxy 18443 (TCP+UDP). The Reading agent's instance uses 9443/9080. Please do not `pkill -f hypercorn` (an earlier instance of this server was killed that way).
