#!/bin/sh
# After `npx hyperframes skills update <name>`: the CLI installs skills into .agents/skills and symlinks
# them from .claude/skills. Symlinks break on Windows checkouts and through some script launchers, so this
# copies every installed skill into .claude/skills as a real folder and removes .agents/.
# usage (repo root): sh .claude/skills/explainer-video/scripts/vendor_skills.sh
set -e
cd "$(dirname "$0")/../../../.."   # scripts -> explainer-video -> skills -> .claude -> repo root
[ -d .claude/skills ] || { echo "not at the repo root: $(pwd)"; exit 1; }
[ -d .agents/skills ] || { echo "nothing to vendor: no .agents/skills"; exit 0; }
for s in .agents/skills/*/; do
  n=$(basename "$s")
  rm -rf ".claude/skills/$n"
  cp -R "$s" ".claude/skills/$n"
  echo "vendored $n"
done
rm -rf .agents
