#!/bin/sh
# After `npx hyperframes skills update [<name>]`: the CLI installs skills into .agents/skills and symlinks
# them from .claude/skills. This copies the HyperFrames skills the explainer-video workflow uses (plus any
# names given as arguments) into .claude/skills/explainer-video/vendor/ as real folders, removes every
# symlink the CLI left in .claude/skills, and removes .agents/. .claude/skills then holds only our skills.
# usage (repo root): sh .claude/skills/explainer-video/scripts/vendor_skills.sh [extra-skill ...]
set -e
cd "$(dirname "$0")/../../../.."   # scripts -> explainer-video -> skills -> .claude -> repo root
[ -d .claude/skills ] || { echo "not at the repo root: $(pwd)"; exit 1; }
[ -d .agents/skills ] || { echo "nothing to vendor: no .agents/skills"; exit 0; }
V=.claude/skills/explainer-video/vendor
mkdir -p "$V"
for n in hyperframes faceless-explainer hyperframes-core hyperframes-cli hyperframes-animation hyperframes-creative media-use "$@"; do
  if [ -d ".agents/skills/$n" ]; then
    rm -rf "${V:?}/$n"
    cp -R ".agents/skills/$n" "$V/$n"
    echo "vendored $n"
  fi
done
for l in .claude/skills/*; do [ -L "$l" ] && rm "$l" && echo "removed link $l"; done
rm -rf .agents
