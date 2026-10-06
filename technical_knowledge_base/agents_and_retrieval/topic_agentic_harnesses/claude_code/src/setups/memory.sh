mkdir -p docs .claude/rules
printf 'Canary: ALPHA-ROOT (project CLAUDE.md)\nStyle guide: @docs/style.md\n' > CLAUDE.md
printf 'Canary: BRAVO-IMPORT (imported by CLAUDE.md)\n' > docs/style.md
printf 'Canary: CHARLIE-LOCAL (CLAUDE.local.md)\n' > CLAUDE.local.md
printf 'Canary: DELTA-RULE (.claude/rules/general.md, no paths)\n' > .claude/rules/general.md
printf -- '---\npaths:\n  - "textstats/**"\n---\nCanary: ECHO-PATHRULE (.claude/rules/python.md, paths textstats/**)\n' > .claude/rules/python.md
printf 'Canary: FOXTROT-SUBDIR (textstats/CLAUDE.md)\n' > textstats/CLAUDE.md
printf 'Canary: GOLF-AGENTS (AGENTS.md)\n' > AGENTS.md
printf 'Canary: HOTEL-PARENT (CLAUDE.md in the parent directory)\n' > ../CLAUDE.md
