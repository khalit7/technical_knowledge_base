# Set up a fresh cloud sandbox (a claude.ai routine) to build and check pages.
# usage, from the repo root:  . html_utils/cloud_setup.sh   (sourced, so the exports stay)
# Installs the page-data Python env and the check tools, then points every page check at the
# sandbox's preinstalled Chromium through a wrapper that adds --no-sandbox (the sandbox runs as
# root, and Chrome refuses to start as root without it). Per-page check scripts launch puppeteer
# in many ways; PUPPETEER_EXECUTABLE_PATH and CHROME_PATH between them cover all of them.
uv sync -q
# npm ci deletes node_modules first, so re-running it while another shell or agent is checking a page
# breaks that check: install only when node_modules is missing or older than the lockfile.
[ html_utils/node_modules/.package-lock.json -nt html_utils/package-lock.json ] ||
  (cd html_utils && PUPPETEER_SKIP_DOWNLOAD=1 NPM_CONFIG_USERCONFIG= npm ci --no-audit --no-fund >/dev/null)
CHROMIUM=$(readlink -f /opt/pw-browsers/chromium 2>/dev/null || command -v chromium || command -v google-chrome)
WRAP="${TMPDIR:-/tmp}/chrome-no-sandbox"
printf '#!/bin/sh\nexec "%s" --no-sandbox "$@"\n' "$CHROMIUM" > "$WRAP"
chmod +x "$WRAP"
export CHROME_PATH="$WRAP" PUPPETEER_EXECUTABLE_PATH="$WRAP"
echo "cloud setup done: python env, check tools, Chrome at $CHROMIUM (no-sandbox wrapper)"
