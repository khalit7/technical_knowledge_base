# Visualisation ideas for "Rust: enums, traits, errors and iterators"

What the text needs to be understood: (1) why UTF-8 byte offsets refuse some slices; (2) what an enum buys over a class with optional fields; (3) where an error goes when `?` meets it; (4) what a generic compiles to against a trait object; (5) evidence that iterators are zero-cost; (6) where each kind of test lives; (7) practice turning Python habits into Rust. Scores are 1 to 5 (teaching value, uses real data, not already on another page).

## Built (all inline in the Reading tab; nothing plays by itself)
| Idea | Kind | Score | Where | Data |
|---|---|---|---|---|
| Hero: four mistakes, Rust finds them before running, Python while running | static diagram (SVG drawn to width) | 4, 4, 5 | top | the recorded errors E0004, E0277 and `l_errors` |
| Slice end slider over the 20 bytes of `"café 日本語 🦀"`, grouped by character; allowed ends green, a cut character red, the panic text below | one slider, prediction prompt first | 5, 5, 5 | section 1 | `out/l_strings.txt` (the panic at 4 is the recorded one; others computed by the same rule) |
| 32 combinations against 4 variants (Python class with optional fields against the `Conn` enum) | before/after toggle | 5, 3, 5 | section 2 | `code/lang/states.rs`; the Python class is illustrative |
| The `?` stepper: lines 22 to 43 of `errors.rs` under three configurations, a caption per step, the recorded printed line at the end | stepper (Back, Next) | 5, 5, 5 | section 3 | `code/lang/errors.rs`, `out/l_errors.txt` |
| Generic against trait object: two copies called directly against a fat pointer, a vtable and one copy | static annotated boxes (HTML) | 4, 4, 5 | section 4 | `out/l_traits.txt` (8 and 16 bytes), `out/l_mono.txt` |
| Measured iterator bars, log scale | bars | 4, 5, 4 | section 5 | `out/t_iterbench*.txt` |
| Crate tree with the three kinds of test tagged by what they can see | static annotated tree | 4, 4, 5 | section 7 | `code/tokstat/` |
| Nine Python-to-Rust prediction prompts (from the language page's drill tab): the Python, three candidates, pick one, then the recorded results open in a closed block | prediction prompt | 5, 5, 5 | sections 1, 3, 4, 5, 6 | `code/drill/`, `out/dr_*` |

## Moved or dropped
- The drill tab became inline prompts beside the section each item teaches (string length in 1; `try`/`except` and a default argument in 3; sorting floats in 4; a comprehension, updating in place and sorting by key in 5; counting words and dict order in 6). Items d02 (two names for one list), d03 (floor division) and d12 (`2 ** 64`) teach moves and numbers and stay with Rust: the essentials.
- The ownership animation, the borrow timeline and the Borrow-checker lab stay with Rust: the essentials.

## Rejected
- A pull-based iterator stepper (one element flowing through `filter`, `map`, `sum`): Python generators are lazy in the same way, so it would re-teach familiar ground; the recorded "computing 1" prompt shows the laziness, and the bars show what is new (the cost).
- A `HashMap` bucket diagram: the three recorded runs with different orders teach the point (random seeding) more directly.
- A monomorphisation diagram drawn as an SVG flow: the boxes plus the real symbol table from `nm` say it honestly.
