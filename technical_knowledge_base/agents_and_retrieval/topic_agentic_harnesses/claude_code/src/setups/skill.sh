mkdir -p .claude/skills/run-tests
cat > .claude/skills/run-tests/SKILL.md <<'S'
---
name: run-tests
description: Run this project's test suite and summarise the failures. Use whenever you need to know whether the tests pass.
allowed-tools: Bash(python3 tests/test_core.py)
---
# Running the textstats tests

Canary: KILO-SKILLBODY (this line is in the body of SKILL.md, not in its description).

1. Run `python3 tests/test_core.py` from the repository root. It needs no pytest.
2. Every line starting with FAIL is one failing test; the last line counts them.
3. Report each failing test with the expected and actual value if the assertion shows them.
S
