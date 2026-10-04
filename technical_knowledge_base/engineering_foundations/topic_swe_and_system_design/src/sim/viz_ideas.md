# Scale simulator (t-sim): visual ideas, built and rejected

Central question: as users grow, which component saturates first, what fixes it, and what does the fix cost?

## Built
| Idea | Why it earns its place | Score notes |
|---|---|---|
| Log users slider, 1 to 10 million, with live utilisation bars (to 150%, dashed line at capacity) | The bottleneck is a crossover: which rho reaches 1 first as one parameter moves | parameter the reader controls; computable; measures the central question |
| System diagram (SVG): boxes coloured by rho, queue squares from Little's law (L_q = lambda W_q, log scale, "grows" when rho >= 1), dots for requests in flight; elbow edges; pauses off screen, starts paused under reduced motion | Shows where the pile-up is, in the shape of the architecture the Reading draws | animation of a flow; links to Reading steps |
| Suggested fix + Before / After toggle on the same load (diagram, bars and stats switch) + comparison table + Apply + Undo | Khalid's before/after pattern: the same input, old design against new; pressing Apply repeatedly walks the Reading's steps and shows the bottleneck moving | before/after animation point |
| "What breaks next" line: broken now / running hot / next to reach 80% at about N users (bisection on users) | Plain-language answer to the central question | |
| Six presets mapping to the Reading spine (1, 1k, 100k, 1M, 10M users, GPU-heavy launch); each loads the previous step's design at the new load | One running example; the fix chain from each preset is the step's building block (LB for availability; index; queue, cache, scale-up, servers; workers, servers, shards; GPU replicas) | |
| Stats: TTFT and full-reply p50/p99 (Monte Carlo over exact M/M/c sojourn distributions), cost per month and per user, GPU replica tokens/s and KV memory | Latency and cost are the two prices of every fix | |
| GPU replica model: step time a + b n, a from bandwidth, b fitted to TensorRT-LLM's 2,209 tok/s/GPU (Llama 3.3 70B FP8, H100 TP2, 1000/1000); KV memory caps the batch | Makes "capacity is quantised in GPUs" and "memory, not compute, limits batch" measurable; fitted b lands within 3% of compute-per-token at 40% FP8 MFU | reproduces a published figure (by construction); computable from config + datasheet |
| Maths box with Erlang C, Little's law, Kendall notation, and a table of formula against discrete-event simulation | The reader sees why rho near 1 explodes and that the formula is checked | corrects "a server at 90% has 10% spare" intuition |
| Sources table generated from defaults.json, every default labelled published / derived / fitted / illustrative | Traceability rule | |

## Rejected
- Per-request Gantt timeline of one message: duplicates the Reading's "follow one request" animation.
- Autoscaling over a 24-hour traffic curve: adds time dynamics that M/M/c steady state cannot back honestly; mentioned in words (the queue drains off-peak).
- Free-form editable workload numbers (messages/day, peak factor): kept fixed and labelled illustrative to keep the controls teachable; the users slider already scales them linearly.
- Separate tab per tier: one page shows the bottleneck moving between tiers, which is the point.
- Retry storms / failure injection: belongs to the Reading's step 4 and Case files; a steady-state queue model would mislead about metastable failures.

## What the methodology lacked
No rule for models whose inputs are mostly assumptions: here each assumption is labelled illustrative in a generated table, and the maths is checked against a simulation rather than against a published figure (only the GPU throughput reproduces one).
