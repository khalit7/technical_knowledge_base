"""Shared path setup for this page's runs (child page jax_llm_codebases, prefix lc).

Every script does `import lc_env` after putting this folder on sys.path. It adds:
  $JX_SCRATCH/lc/site    a private overlay of small pure-Python packages (omegaconf, pydantic, ...)
                         installed with `uv pip install --target`, so the topic's shared venv is untouched;
  $JX_SCRATCH/src/maxtext/src, src/tunix, src/marin/lib/levanter/src   the pinned source clones.
Run with the shared venv: JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B <script>
"""
import os, sys
JX = os.environ["JX_SCRATCH"]
SRC = os.path.join(JX, "src")
OVERLAY = os.path.join(JX, "lc", "site")
MAXTEXT = os.path.join(SRC, "maxtext")
TUNIX = os.path.join(SRC, "tunix")
MARIN_LEV = os.path.join(SRC, "marin", "lib", "levanter")
for p in (os.path.join(MAXTEXT, "src"), MAXTEXT, TUNIX, OVERLAY):
    if p not in sys.path:
        sys.path.insert(0, p)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "out")

def scrub(s):
    """Replace absolute paths to the scratch folder and home by neutral names before anything is saved."""
    s = str(s)
    s = s.replace(MAXTEXT, "<maxtext>").replace(TUNIX, "<tunix>").replace(SRC, "<src>").replace(JX, "<JX_SCRATCH>")
    home = os.path.expanduser("~")
    return s.replace(home, "~")
