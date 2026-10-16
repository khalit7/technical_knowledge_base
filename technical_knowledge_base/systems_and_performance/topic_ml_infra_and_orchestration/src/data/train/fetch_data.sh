#!/bin/sh
# Download TinyShakespeare at a pinned commit of karpathy/char-rnn and check it (1,115,394 bytes).
set -e
URL=https://raw.githubusercontent.com/karpathy/char-rnn/370cbcd448eb7daf32f21a6be560b70e0b33c4e3/data/tinyshakespeare/input.txt
SHA=86c4e6aa9db7c042ec79f339dcb96d42b0075e16b8fc2e86bf0ca57e2dc565ed
out=${1:-input.txt}
curl -sL -o "$out" "$URL"
echo "$SHA  $out" | shasum -a 256 -c -
