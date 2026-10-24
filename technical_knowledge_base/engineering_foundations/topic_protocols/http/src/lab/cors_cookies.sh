#!/bin/sh
# Read-only, credential-free CORS preflights (OPTIONS) to two public LLM API hosts, as a browser page on
# https://example.com would send before a cross-origin POST with a JSON body and an API-key header; plus the
# attribute names of any Set-Cookie the responses carry (cookie values replaced by <redacted>). Address lines,
# request ids and ray ids are dropped. Usage: sh cors_cookies.sh > ../inputs/cors_cookies.txt
probe(){ echo "### OPTIONS $1 ($(date -u +%Y-%m-%dT%H:%MZ))"
  curl -sS -v -o /dev/null --max-time 15 -X OPTIONS "$1" -H 'Origin: https://example.com' \
    -H 'Access-Control-Request-Method: POST' -H "Access-Control-Request-Headers: $2" -w '%{http_code} %{http_version}\n' 2>&1 \
    | grep -E '^[<>] |^[0-9]{3} ' | grep -viE '^< (cf-ray|x-request-id|request-id|x-goog-request|openai-organization|date)' \
    | sed -E 's/^(< set-cookie: [^=]+=)[^;]*/\1<redacted>/I; s/(expires=)[^;]*/\1<date>/I; s/\r$//'
  echo; }
probe https://api.anthropic.com/v1/messages 'content-type,x-api-key,anthropic-version'
probe https://api.openai.com/v1/chat/completions 'content-type,authorization'
# The Anthropic SDK's dangerouslyAllowBrowser option adds this request header; the preflight lists it.
probe https://api.anthropic.com/v1/messages 'content-type,x-api-key,anthropic-version,anthropic-dangerous-direct-browser-access'
