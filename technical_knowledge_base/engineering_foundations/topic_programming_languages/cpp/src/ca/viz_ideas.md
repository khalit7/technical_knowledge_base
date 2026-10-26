# Visualisation ideas for "C++: the essentials"

What the reader (Python, C++ basics) needs to see rather than read: that a C++ object has one owner and one moment of
death; that a build has stages and which stage an error comes from; that UB makes the same source behave differently by
optimisation level.

| Idea | Kind (teaching contract) | Placement | Status |
|---|---|---|---|
| Hero: one `std::vector<float>` (24-byte owner on the stack, 12-byte heap buffer, freed at the brace) beside Python's list (88 bytes, refcount, three 24-byte floats), numbers from a real run | Static annotated diagram (structure) | Top of the Reading | built 2026-10-26 |
| Build pipeline: sources, translation units (bars to scale: 7 lines become 55,693), object files with their nm tables, link; scenarios: correct, missing object, ODR violation, incremental rebuild | Stepper (a process), never plays by itself | Inline in section 1 (was a tab) | built 2026-10-05, moved inline 2026-10-26 |
| UB gallery: ten cases, each -O0 against -O2 plus the sanitizer, warning or hardened-library run (closed) | Before/after on the same input | Inline in section 2 (was a tab); a URL anchor per case | built 2026-10-05, moved inline 2026-10-26 |
| Object-lifetime replay, vector growth with and without noexcept, template instantiation view | | The ownership and classes children | moved with their sections |
| Predict the output drills and gates | | The drills went to the child that teaches each; the gates were dropped (no quizzes) | removed here |
| Animated vtable dispatch; error-message length chart | | | rejected (2026-10-05): the measured cost and one sentence carry them |
