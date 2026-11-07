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

## 2026-11-07: split layout and renderer v2 stages
Built (3D, each with an `ol.sx` step list on the left; data from `window.PA`)
- Fig. 1 hero, five fallback stacks (replaces the HTML rows): one stack of glass plates per piece of syntax, the first method at the bottom; the camera moves in close on one stack per step and a ball climbs it until a plate answers, driven by five real traces (`add_reflected`, `eq_fallback`, `iter_getitem`, `attr_getattr`, `with_swallow`). Why 3D: the page's core idea is "a fixed order of fallbacks", and a stack climbed bottom-up shows order and the stopping point at once; the flat rows showed the order but not which place answered.
- Fig. 4 pipeline (replaces the 2D eager/lazy stepper): stages on the floor; eager lists pile up as towers (height is memory held: 3, 5, 4 items), lazy generators pass one line at a time, the pull drawn as grey dots flowing backwards and StopIteration flowing forwards at the end. Grouped into 4 and 5 explained stretches of the printed trace (`data-n`). Why 3D: height as memory held and a pipeline with things moving through it.
- Fig. 5 MRO (replaces the static SVG): the class diamond on the floor lifts into one stack (`Service.__mro__`), the `super()` chain climbs it with the printed lines, Logging's own shorter stack, and `class Bad(Base, Logging)` with its TypeError. Why 3D: the point is a graph becoming a line, which the lift shows as motion.
- Fig. 7 attribute lookup (new; the rejection above is reversed because the explorer shows logs, not the order): five plates in lookup order, blocks where each name lives (`K` and `o` from `d2_dispatch.py`, then `Sampling` from `c4_descriptor.py`), a ball climbing each name's column to the plate that answers; reads, a bound method, and writes stopped by data descriptors.

Kept 2D, now in splits: the explorer (Fig. 2, the run's log as a list beside the why of each step; `RD.anim` with a list rewritten per scenario), the copy stepper (Fig. 3, a pointer graph reads best flat; the 3D version on the JavaScript page adds nothing here), the slots bars (Fig. 6, numbers on one axis). New static: Fig. 8, the exception tree (structure; what `except Exception` leaves outside).
Rejected: a names-as-labels stage (aliasing and rebinding are owned by Python: the essentials); an iterator stage of its own (the lazy pipeline already shows `__next__` pulls and StopIteration); visuals for sections 4 and 7 (closures and decorators are carried by their code and outputs; `with` is a stack in Fig. 1 and two explorer scenarios).
