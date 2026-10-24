#!/bin/sh
# Record one command for the atlas: rec.sh <id> '<command as shown on the page>'
# Writes out/<id>.txt: the command line, then its combined output (trimmed by the command itself), then the exit code.
# Run from this folder. Commands are read-only requests to public endpoints or to local servers on 127.0.0.1.
id="$1"; cmd="$2"; mkdir -p out
{ printf '$ %s\n' "$cmd"; sh -c "$cmd" 2>&1; printf '[exit %s]\n' "$?"; } > "out/$id.txt"
echo "== $id"; cat "out/$id.txt"
