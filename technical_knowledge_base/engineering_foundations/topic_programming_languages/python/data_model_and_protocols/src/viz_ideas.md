# Visuals: built and rejected

Built
- Hero (static HTML diagram): five pieces of syntax (`v + 1`, `a == b`, `for`, `obj.attr`, `with`) and the lookup chain each runs on the type, first method highlighted, fallbacks after. Static because it is structure; each row names the section that proves it.
- Data model explorer, moved inline into section 1 from the language page's Data model tab: it explains one mechanism (dispatch order), so it sits beside the rules. A stepper (19 recorded scenarios in pairs), never autoplays; picking a scenario resets to step 1.
- Shallow against deep copy stepper (section 2) and eager against lazy pipeline stepper (section 3), kept from the language page's Reading: before/after on the same input, real `id()` labels and the real printed trace. A mode switch now resets instead of playing.
- MRO diamond beside `Service.__mro__` (section 5, new, static SVG): where Logging's `super()` lands when `self` is a Service. Structure, so static.
- Bytes per record bars (section 5, new, static, from `outputs/c3_sizes.txt`): the slots saving and the dict-per-record cost at a glance; `check_numbers.py` checks widths and values.
- Prediction reveals: 19 of the language page's "Predict the output" drills placed beside the section that explains each, plus the recorded `[[predict:]]` snippets.

Rejected
- Keeping the Data model tab as a tab: it explains section 1's rules, so it moved inline.
- An animated attribute lookup: the four outcomes are already steppable in the explorer's "Attribute lookup" group; a second visual would repeat it.
- A bytecode view of a method call: one line of `dis` output says it (closed block), and bytecode belongs to the internals sibling.
- The language page's drill tab with a score: no quizzes on this knowledge base (teaching contract); the drills are plain reveals.
