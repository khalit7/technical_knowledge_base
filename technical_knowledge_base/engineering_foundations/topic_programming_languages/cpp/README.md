# C++: the essentials

Notion: https://app.notion.com/p/3cd5c17b0d0d81ceadcee44fe9c023a0 (child of Topic: programming-languages)
Site: https://khalit7.github.io/technical_knowledge_base/engineering_foundations/topic_programming_languages/cpp/

Interactive page: `index.html`, built from `src/` (`python3 src/ca/gen.py && sh src/build.sh`; `src/README.md` says how). Reading tab (about 17 min, plus 9 in closed details) and Further reading.
- What every reader of the C++ pages needs first: who decides when an object dies (the hero: one `std::vector<float>` against Python's list, from real runs), the six ideas that follow and where each is taught, the six measured findings, how a program is built (with the Build pipeline stepper inline), undefined behaviour (with the UB gallery inline, ten cases at -O0, -O2 and under a sanitizer), libraries, which standard to ask for (the October 2026 status in a dated closed block), the mistakes that cut across the language and a hygiene checklist, and the four child pages.
- Children (folders inside this one): `ownership_moves_and_lifetimes/`, `classes_templates_and_the_standard_library/`, `the_machine_underneath/`, `reading_llama_cpp/`.
- Rebuilt on 2026-10-26 from the three-part page "C++: the language, the machine underneath, and reading llama.cpp"; its parts became the four children. Replaces the old written pages "C++: zero to expert" (this Notion page, retitled) and "C++: modern practice and standards status" (marked TO DELETE); their claims are checked in `src/ca/coverage.json` and the children's copies. No video.
