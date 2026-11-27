#!/bin/sh
# Build ../index.html for this tech-news issue from issue.md (the design of 2026-11-27: html_utils/issue_page.py).
R=$(cd "$(dirname "$0")" && pwd); while [ "$R" != / ] && [ ! -d "$R/html_utils" ]; do R=$(dirname "$R"); done
[ -x "$R/.venv/bin/python3" ] && PATH="$R/.venv/bin:$PATH"; export LC_ALL=en_US.UTF-8
set -e
python3 "$R/html_utils/issue_page.py" "$(cd "$(dirname "$0")/.." && pwd)"
