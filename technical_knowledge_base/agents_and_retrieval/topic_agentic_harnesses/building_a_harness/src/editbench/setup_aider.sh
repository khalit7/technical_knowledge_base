#!/bin/sh
# Recreate the folder of Aider's edit appliers that bench.py imports (--aider DIR), outside the repo.
# Aider 0.86.2 wheel from PyPI, sha256 64f6a0c66c9f4633ad9f479bca3e64ebcba02b9da03c6b604b74a44736b2416e (Apache-2.0).
# Needs: pip/uv install diff-match-patch tqdm. The sed lines only cut imports of Aider's app classes.
set -e
DIR=${1:?usage: setup_aider.sh DIR}
mkdir -p "$DIR/whl" && cd "$DIR"
curl -sL -o whl/aider.whl https://files.pythonhosted.org/packages/75/f7/e20749d9a510673e7adf910b005e3efe4ceaf9c194f1dd40d6931a3f34b9/aider_chat-0.86.2-py3-none-any.whl
unzip -q -o whl/aider.whl 'aider/coders/editblock_coder.py' 'aider/coders/udiff_coder.py' 'aider/coders/search_replace.py' -d whl
for f in editblock_coder udiff_coder search_replace; do
  sed -e 's/^from \.\.dump import dump.*$/def dump(*a, **k): pass/' -e 's/^from aider\.dump import dump$/def dump(*a, **k): pass/' \
      -e 's/^from \.base_coder import Coder$/Coder = object/' -e 's/^from aider import utils$/utils = None/' \
      -e 's/^from aider\.utils import GitTemporaryDirectory$/GitTemporaryDirectory = None/' \
      -e 's/^from \.editblock_prompts import EditBlockPrompts$/EditBlockPrompts = object/' \
      -e 's/^from \.udiff_prompts import UnifiedDiffPrompts$/UnifiedDiffPrompts = object/' \
      -e 's/^from \.search_replace import (/from search_replace import (/' whl/aider/coders/$f.py > $f.py
done
