# Sources checked for the HTTP page (2026-10-05)

Every fact the page states that is not measured here, with where it was read. RFC texts were downloaded from
rfc-editor.org and grepped (passages quoted on the page); web pages were read the same day.

| Fact | Source |
|---|---|
| RFC 9110 to 9114, 9204, 9218, 9220: June 2022; RFC 9113 obsoletes 7540 and 8740; RFC 9112 obsoletes 7230 | rfc-editor.org text headers |
| RFC 7541 HPACK May 2015; RFC 8470 (425 Too Early) and RFC 8441 Sept 2018; RFC 9000 May 2021; RFC 6585 April 2012 | rfc-editor.org text headers |
| CL+TE: server MAY reject or use TE alone, "Regardless, the server MUST close the connection after responding" | RFC 9112 s6.3 |
| obs-fold: reject with 400 or replace with SP | RFC 9112 s5.2 |
| single LF MAY be recognised as a line terminator | RFC 9112 s2.2 |
| 400 for a request without Host | RFC 9112 s3.2 |
| GOAWAY last stream id and REFUSED_STREAM: unprocessed requests may be retried, even non-idempotent | RFC 9113 s8.7 |
| RFC 7540 priority signalling deprecated | RFC 9113 s5.3.2 |
| idempotent methods: PUT, DELETE and safe methods | RFC 9110 s9.2.2 |
| 425 Too Early for early data | RFC 8470 s5.2 |
| nginx proxy_read/connect/send_timeout 60s, idle between reads; proxy_buffering on; X-Accel-Buffering | https://nginx.org/en/docs/http/ngx_http_proxy_module.html |
| nginx 1.29.7: upstream keepalive on, proxy_http_version 1.1, no Connection header (the directive page still lists "Connection close" as default) | inputs/nginx_changes_excerpt.txt |
| nginx 1.31.0 rejects HTTP/2 and HTTP/3 requests with Connection, Transfer-Encoding, etc. | same |
| AWS ALB idle timeout 60 s default, 1 to 4000; HTTP/2 PING does not reset it; app idle timeout should exceed it or 502; desync mitigation modes | https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html |
| API Gateway REST integration timeout 50 ms to 29 s (Regional and private can be raised, may lower throttle quota); payload 10 MB; idle connection timeout 310 s | https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-execution-service-limits-table.html |
| Cloudflare 524 after 125 s Proxy Read Timeout; Enterprise up to 6,000 s | https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-524/ |
| Google Cloud external Application LB: backend service timeout 30 s default, the whole response must arrive within it; client keepalive 610 s, backend 600 s | https://docs.cloud.google.com/load-balancing/docs/https |
| Envoy route timeout 15 s (a problem for streaming), stream idle 5 min, connection idle 1 h | https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/timeouts |
| ingress-nginx proxy-read-timeout 60, connect 5, keep-alive 75, proxy-buffering off | https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/ |
| httpx: 5 s of network inactivity by default; connect, read, write, pool | https://www.python-httpx.org/advanced/timeouts/ |
| undici (Node fetch): headersTimeout and bodyTimeout 300 s, connectTimeout 10 s, keepAliveTimeout 4 s | https://github.com/nodejs/undici/blob/main/docs/docs/api/Client.md |
| Anthropic and OpenAI Python SDK: timeout 600 s (connect 5), 2 retries, 0.5 s doubling to 8 s with jitter x U(0.75,1), retry on 408, 409, 429, >=500 and connection errors, honour retry-after-ms and Retry-After, x-should-retry | installed package source (_constants.py, _base_client.py): anthropic 1.11.0, openai 3.24.0 |
| Claude API errors (400, 401, 402, 403, 404, 409, 413, 429, 500, 504, 529), errors after 200 in SSE, 32 MB request limit and Cloudflare returns 413, request-id header, long requests >10 min, SDK TCP keep-alive | https://platform.claude.com/docs/en/api/errors |
| anthropic-ratelimit-* headers and retry-after | https://platform.claude.com/docs/en/api/rate-limits |
| Rapid Reset CVE-2023-44487, 2023-10-10, 201 million rps from about 20,000 machines (Cloudflare); 398 million rps (Google) | https://blog.cloudflare.com/technical-breakdown-http2-rapid-reset-ddos-attack/, https://cloud.google.com/blog/products/identity-security/how-it-works-the-novel-http2-rapid-reset-ddos-attack |
| CONTINUATION flood, 2024-04-03, one connection, nothing in access logs | https://nowotarski.info/http2-continuation-flood-technical-details/ |
| Chrome 106 disables HTTP/2 server push by default (post 2022-08-18); 1.25% then 0.7% of HTTP/2 sites used it; 103 Early Hints instead | https://developer.chrome.com/blog/removing-push |
| Idempotency-Key draft expired at revision 07 (atlas correction 16) | https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/ |
| HTTP/2 downgrade smuggling (H2.CL, H2.TE, CRLF in header values) | https://portswigger.net/research/http2 (James Kettle, 5 Aug 2021) |
| HTTP/2 downgrade smuggling (H2.CL, H2.TE, CRLF in header values) | https://portswigger.net/research/http2 (James Kettle, 5 Aug 2021) |
