#!/bin/sh
# Read-only, credential-free GETs to three public LLM API hosts (one request each), to see which HTTP version they
# negotiate, which proxy or CDN answers, and what they advertise (Alt-Svc for HTTP/3). Keeps only the ALPN line and
# the request and response headers; address lines are dropped. Usage: sh public.sh > raw/public_headers.txt
for u in https://api.anthropic.com/v1/models https://api.openai.com/v1/models https://generativelanguage.googleapis.com/v1beta/models; do
  echo "### $u ($(date -u +%Y-%m-%dT%H:%MZ))"
  curl -sS -v -o /dev/null --max-time 15 -w '%{http_code} %{http_version} first-byte %{time_starttransfer}s\n' "$u" 2>&1 \
    | grep -E '^\* ALPN|^[<>] |^[0-9]{3} ' | grep -viE 'set-cookie|^< (cf-ray|x-request-id|request-id|x-goog-request|openai-organization)' | sed 's/\r$//'
  echo
done
