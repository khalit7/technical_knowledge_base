#!/bin/sh
# Atlas "see it on the wire" recordings against public endpoints (read-only, unauthenticated, one request each).
# Recorded 2026-10-05 on macOS 27.0.1 (x86_64), home broadband. curl 8.7.1 (system, SecureTransport/LibreSSL, nghttp2, no HTTP/3),
# OpenSSL 3.6.5 (conda-forge, in the session scratchpad: put its bin/ first on PATH), DiG 9.10.6, OpenSSH 10.3p1.
cd "$(dirname "$0")"
R=./rec.sh
$R ip   'ping -c 3 1.1.1.1 | tail -n 2'
$R ipv6 'ping6 -c 3 2606:4700:4700::1111 | tail -n 2'
$R tcp  'nc -vz -w 5 api.anthropic.com 443'
$R timing "curl -s -o /dev/null -w 'dns %{time_namelookup}s  tcp %{time_connect}s  tls %{time_appconnect}s  first byte %{time_starttransfer}s  http %{http_version}\n' https://api.anthropic.com/v1/models"
$R udp  'dig @1.1.1.1 api.anthropic.com A +noall +answer +stats | grep -v "^;; WHEN"'
$R dns  'dig +noall +answer api.anthropic.com A api.anthropic.com AAAA'
$R doh  "curl -sS -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=api.anthropic.com&type=A'"
$R dohwho 'openssl s_client -connect cloudflare-dns.com:443 -servername cloudflare-dns.com </dev/null 2>/dev/null | openssl x509 -noout -issuer'
$R tls13 'openssl s_client -connect api.anthropic.com:443 -servername api.anthropic.com -brief </dev/null'
$R tls12 'openssl s_client -connect api.anthropic.com:443 -servername api.anthropic.com -tls1_2 -brief </dev/null'
$R x509 'openssl s_client -connect api.anthropic.com:443 -servername api.anthropic.com </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates'
$R acme 'curl -s https://acme-v02.api.letsencrypt.org/directory'
$R ssh  '(sleep 3) | nc github.com 22 | head -n 1'
$R sshkex 'ssh -Q kex | grep -E "mlkem|sntrup"'
$R http11 'curl -sv --http1.1 https://api.anthropic.com/v1/models -o /dev/null 2>&1 | grep -E "^[<>] " | grep -viE "^< (cf-|set-cookie|x-envoy|via|server-timing|strict-transport)"'
$R http2 'curl -sv --http2 https://api.anthropic.com/v1/models -o /dev/null 2>&1 | grep -E "ALPN|HTTP/2|^> (POST|GET)|^< HTTP"'
$R http3 'curl -sI https://www.cloudflare.com/ | grep -i "^alt-svc"'
$R ws   "curl -si --http1.1 --max-time 4 -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' https://echo.websocket.org/ | head -n 6"
$R apikey 'curl -s https://api.anthropic.com/v1/models'
$R graphql "curl -s https://countries.trevorblades.com/ -H 'content-type: application/json' -d '{\"query\":\"{ country(code: \\\"FR\\\") { name capital currency } }\"}'"
$R oidc 'curl -s https://accounts.google.com/.well-known/openid-configuration | head -c 420'
$R jwks 'curl -s https://www.googleapis.com/oauth2/v3/certs | head -c 300'
$R mcp  "curl -s https://mcp.deepwiki.com/mcp -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2025-11-25\",\"capabilities\":{},\"clientInfo\":{\"name\":\"atlas\",\"version\":\"0\"}}}' | head -c 600"
$R mcpprm 'curl -s https://mcp.notion.com/.well-known/oauth-protected-resource'
$R ucp  'curl -s https://www.allbirds.com/.well-known/ucp | head -c 640'
