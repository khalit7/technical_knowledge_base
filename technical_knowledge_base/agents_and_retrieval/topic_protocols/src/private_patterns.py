"""Machine-specific strings that must never reach the page or the repo (the recording machine's DNS filter
vendor, its network addresses). They live in src/.private_patterns (git-ignored, one regex per line) so the
check scripts can look for them without the repository itself containing them."""
import os, re
_F = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".private_patterns")
PATTERNS = [l.strip() for l in open(_F)] if os.path.exists(_F) else []
PATTERNS = [p for p in PATTERNS if p and not p.startswith("#")]
def alternation():
    return "|".join(PATTERNS) if PATTERNS else r"(?!x)x"
