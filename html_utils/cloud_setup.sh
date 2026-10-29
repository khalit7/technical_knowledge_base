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
# Page font stacks end in Helvetica and Arial. A bare sandbox has neither and renders a wider fallback (DejaVu), so the
# clip check reports text that does not clip on a reader's device. Liberation fonts have Arial/Helvetica/Courier metrics.
if ! fc-list 2>/dev/null | grep -qi "Liberation Sans"; then
  { apt-get install -y -qq fonts-liberation >/dev/null 2>&1 ||
    { apt-get update -qq >/dev/null 2>&1 && apt-get install -y -qq fonts-liberation >/dev/null 2>&1; }; } &&
    fc-cache -f >/dev/null 2>&1 ||
    echo "cloud setup: fonts-liberation not installed; clip checks may flag text that only clips in the sandbox's fallback font"
fi
CHROMIUM=$(readlink -f /opt/pw-browsers/chromium 2>/dev/null || command -v chromium || command -v google-chrome)
WRAP="${TMPDIR:-/tmp}/chrome-no-sandbox"
printf '#!/bin/sh\nexec "%s" --no-sandbox "$@"\n' "$CHROMIUM" > "$WRAP"
chmod +x "$WRAP"
export CHROME_PATH="$WRAP" PUPPETEER_EXECUTABLE_PATH="$WRAP"
echo "cloud setup done: python env, check tools, fonts, Chrome at $CHROMIUM (no-sandbox wrapper)"
