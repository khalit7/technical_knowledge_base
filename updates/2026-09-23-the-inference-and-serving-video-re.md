# 2026-09-23: the inference-and-serving video re-cut

A re-cut rather than a new episode. The topic overview for [Topic: inference-and-serving](../topics/inference-and-serving/summary.md) is replaced, for timing only. Its axis, map, beats, take and spoken words are as published.

**[update] The video on **[Topic: inference-and-serving](../topics/inference-and-serving/summary.md)** is re-cut, and the old one is taken down.** The published cut named six reveals before they were drawn, the worst 7.9 seconds, and two more that the lead check could not time at all: word timestamps put the Cohere bar 5.6 seconds after its name and Cerebras 3.6.

#### Production notes

**Two headings were dropped.** On prefill the map's lighting meant the heading could never land before "compute bound" was said; on overhead, a two-bar chart that cannot gain rows, dropping the heading was the only lever. The cost there is that the Cohere bar now appears before it is named.

**Rows were added for sentences that had nothing to land on.** SGLang's radix attention on prefill, two on decode so paged attention and continuous batching land within about a second of their names, and a closing row on the last beat.

**One judgement against the tool's suggestion, checked by ear.** The overhead reserve stays at 5.0 rather than the suggested 2.8, because the suggestion could not see the untimed Cerebras bar and would have opened a real 4.3 second lead.

**What the checks say now.** No timed lead over 3 seconds, the worst 2.6; worst still frame 5.67. 7:02, 1080p, 4.45 MiB.

**The video was not watched.** Nothing here can play a file. The proxies were a frame of each changed beat, every transcript read against its line, and the pace table. Committed as 7b63df3.
