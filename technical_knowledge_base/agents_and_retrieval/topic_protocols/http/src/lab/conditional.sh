#!/bin/sh
# A conditional GET against the lab server: the first answer carries an ETag; asking again with If-None-Match returns
# 304 with no body. Usage: sh conditional.sh <plain port> > raw/conditional.txt
PORT="${1:-30301}"
echo "### first request"
curl -sS -v "http://127.0.0.1:$PORT/v1/models" 2>&1 | grep -E '^[<>] |^\{' | sed 's/\r$//'
echo
echo "### second request, revalidating with the ETag"
curl -sS -v "http://127.0.0.1:$PORT/v1/models" -H 'If-None-Match: "models-v1"' 2>&1 | grep -E '^[<>] |^\{' | sed 's/\r$//'
