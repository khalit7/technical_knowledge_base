---
name: release-notes
description: Write the release notes for a textstats version. Use when the user asks for release notes, a changelog entry or a version summary for textstats.
---

# Writing textstats release notes

Release notes go in RELEASE_NOTES.md at the repository root, newest version first.

## Steps
1. Run `python3 tests/test_core.py` and copy the final summary line into the notes. Never publish notes for a version whose tests fail.
2. Read `textstats/core.py` and list every public function (no leading underscore) with a one-line description.
3. Compare with the previous section of RELEASE_NOTES.md, if any, and classify each change as Added, Changed, Fixed or Removed.
4. Write the section with the template below. Keep each bullet under 20 words.
5. End the section with the line `Reviewed-by: (pending)`.

## Template
```
## textstats VERSION (YYYY-MM-DD)
Tests: <summary line>
### Added
- ...
### Changed
- ...
### Fixed
- ...
### Public API
- function(args): what it returns
Reviewed-by: (pending)
```

## Style rules
- Rule 1: Name the function in backticks the first time it appears in a section.
- Rule 2: Do not mention internal helper functions unless their behaviour changed for users.
- Rule 3: Give numbers with units and the input that produced them.
- Rule 4: Prefer one bullet per user-visible change; merge refactors into one bullet.
- Rule 5: Never copy test names into the notes; describe the behaviour instead.
- Rule 6: Link nothing outside the repository.
- Rule 7: Keep the whole section under 40 lines.
- Rule 8: Use the past tense for fixes, for example 'Fixed apostrophes being split'.
- Rule 9: Name the function in backticks the first time it appears in a section.
- Rule 10: Do not mention internal helper functions unless their behaviour changed for users.
- Rule 11: Give numbers with units and the input that produced them.
- Rule 12: Prefer one bullet per user-visible change; merge refactors into one bullet.
- Rule 13: Never copy test names into the notes; describe the behaviour instead.
- Rule 14: Link nothing outside the repository.
- Rule 15: Keep the whole section under 40 lines.
- Rule 16: Use the past tense for fixes, for example 'Fixed apostrophes being split'.
- Rule 17: Name the function in backticks the first time it appears in a section.
- Rule 18: Do not mention internal helper functions unless their behaviour changed for users.
- Rule 19: Give numbers with units and the input that produced them.
- Rule 20: Prefer one bullet per user-visible change; merge refactors into one bullet.
- Rule 21: Never copy test names into the notes; describe the behaviour instead.
- Rule 22: Link nothing outside the repository.
- Rule 23: Keep the whole section under 40 lines.
- Rule 24: Use the past tense for fixes, for example 'Fixed apostrophes being split'.
- Rule 25: Name the function in backticks the first time it appears in a section.
- Rule 26: Do not mention internal helper functions unless their behaviour changed for users.
- Rule 27: Give numbers with units and the input that produced them.
- Rule 28: Prefer one bullet per user-visible change; merge refactors into one bullet.
- Rule 29: Never copy test names into the notes; describe the behaviour instead.
- Rule 30: Link nothing outside the repository.
- Rule 31: Keep the whole section under 40 lines.
- Rule 32: Use the past tense for fixes, for example 'Fixed apostrophes being split'.
- Rule 33: Name the function in backticks the first time it appears in a section.
- Rule 34: Do not mention internal helper functions unless their behaviour changed for users.
- Rule 35: Give numbers with units and the input that produced them.
- Rule 36: Prefer one bullet per user-visible change; merge refactors into one bullet.
- Rule 37: Never copy test names into the notes; describe the behaviour instead.
- Rule 38: Link nothing outside the repository.
- Rule 39: Keep the whole section under 40 lines.
- Rule 40: Use the past tense for fixes, for example 'Fixed apostrophes being split'.
