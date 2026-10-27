Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3e25c17b0d0d81ce85e0c6d82f6beb4c as of 2026-09-21T06:31:51.919Z:
<page url="https://app.notion.com/p/3e25c17b0d0d81ce85e0c6d82f6beb4c">
<ancestor-path>
<parent-data-source url="collection://d440058d-ec1c-4b72-b141-046d5d969389" name="papers"/>
<ancestor-2-database url="https://app.notion.com/p/97163af7655541438b224f753fef6f6f" title="papers"/>
<ancestor-3-page url="https://app.notion.com/p/3c65c17b0d0d81549dbedb27e8f2a26f" title="Papers"/>
<ancestor-4-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-5-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"Paper":"Proactive Memory Agent: selective reminding for long-horizon agents","Takeaway":"A second model runs beside an unmodified action agent, keeps a small structured memory bank of the run, and at each step either injects a reminder into the actor's next call or stays silent. With Claude Opus 4.6 as that memory agent, Claude Sonnet 4.5 goes from 37.6% to 45.9% on Terminal-Bench 2.0 and from 55.0% to 61.8% on τ²-Bench; Opus 4.6 itself gains 2.4 and 2.5 points; a frozen Qwen3.5-122B-A10B actor gains 37.6% to 41.1% on Terminal-Bench with a Qwen3.5-27B memory agent trained by SFT and GRPO. Every number is a single run and no tokens or cost are reported; an always-remind ablation solves as many τ²-Bench tasks as selective reminding (171 against 170 and 172), so the gain is shown for having the watcher rather than for its choosing when to stay silent, and in the five released traces it speaks at 52 of 80 steps, often with fresh debugging advice rather than a remembered fact.","Topics":["agentic-harnesses","benchmarks","rag-and-retrieval"],"Year":"2026","url":"https://app.notion.com/p/3e25c17b0d0d81ce85e0c6d82f6beb4c"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 3 min read · +20m resources
Yifan Wu and colleagues, Meta AI. September 2026. **Provenance note:** this summary is built from The Batch's coverage of 18 September 2026. No arXiv identifier or primary URL was resolvable from the newsletter, whose links are tracking redirects, so the paper itself has not been read directly. Treat the figures as reported rather than verified, and attach the arXiv id when it surfaces.
## The mechanism
An acting agent does the work. A second model runs alongside it as a memory agent, watching the trajectory and deciding, at each step, whether the actor should be reminded of something it already knows and has lost from working context. The reminder is injected; nothing about the actor is retrained. That is the whole design, and the cheapness is the point: this is a harness-layer addition that can be bolted onto a model you do not control.
## Results
On **Terminal-Bench 2.0**:
- Claude Sonnet 4.5: 37.6% to **45.9%**
- Qwen3.5-27B: 37.6% to **41.1%**
On **tau2-Bench**:
- Claude Sonnet 4.5: 55.0% to **61.8%**
- Claude Opus 4.6: 66.2% to **68.7%**
The gains are larger for the weaker actor on Terminal-Bench and smaller for the stronger one on tau2-Bench, which is the pattern you would expect if the intervention is substituting for context management the stronger model partly does for itself.
## The non-obvious finding
Reminding **selectively** beats reminding at every step. A reminder is not free: it consumes context, and an irrelevant one competes with the actual task state for the actor's attention. So the memory agent's job is discrimination, not retrieval, and the result is evidence that the bottleneck in long-horizon agent work is knowing when to surface a fact rather than being able to find it. That distinguishes this from retrieval-augmented generation, where the ranking problem is the whole problem and the timing is fixed.
## Caveats
Second-hand provenance, as above. Two benchmarks, four model pairings, and no cost accounting is reported for running a second model continuously alongside the first, which is exactly the number needed to compare this against the harness-efficiency direction SoL-Pi opens.
## Connections
The constructive counterpart to <mention-page url="https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb"/>'s harness-scaling strategies: a second model supervising the first is the same delegating-coordinator shape, pointed at memory rather than at task decomposition. Read against SoL-Pi from the same window, which finds roughly half an agent's tokens are harness overhead: context compaction and selective reminding are the same lever pulled in opposite directions, one removing what is carried and the other restoring what was dropped, and nobody has yet measured them together.
</content>
</page>
