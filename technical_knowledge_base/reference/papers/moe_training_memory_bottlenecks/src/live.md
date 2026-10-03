Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3e95c17b0d0d8148a1f3d412918234fc as of 2026-09-28T07:19:21.355Z:
<page url="https://app.notion.com/p/3e95c17b0d0d8148a1f3d412918234fc">
<ancestor-path>
<parent-data-source url="collection://d440058d-ec1c-4b72-b141-046d5d969389" name="papers"/>
<ancestor-2-database url="https://app.notion.com/p/97163af7655541438b224f753fef6f6f" title="papers"/>
<ancestor-3-page url="https://app.notion.com/p/3c65c17b0d0d81549dbedb27e8f2a26f" title="Papers"/>
<ancestor-4-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-5-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"Paper":"Bounding the memory bottlenecks of large mixture-of-experts training","Takeaway":"Bounds the four main memory bottlenecks of large-MoE training inside a fixed GPU memory budget by scheduling rather than by approximating the computation, across expert dispatch, vocabulary projection, activation checkpointing and optimiser state.","Topics":["llm-training-and-post-training","ml-infra-and-orchestration"],"Year":"2026","url":"https://app.notion.com/p/3e95c17b0d0d8148a1f3d412918234fc"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 3 min read · +40m resources
[arXiv 2609.14306](https://arxiv.org/abs/2609.14306) (40 min)
## The claim
The four main memory bottlenecks of training a large mixture-of-experts model can be **bounded inside a fixed GPU memory budget without approximating the computation**. The four are **expert dispatch**, **vocabulary projection**, **activation checkpointing** and **optimiser state**. The contribution is **scheduling** rather than approximation, which is what distinguishes it from the usual quantise-or-offload answers: the arithmetic the model performs is unchanged, only when each tensor has to exist is.
## Why it earns a row
Those four terms are exactly what decides whether a given MoE run fits on hardware you own rather than on rented capacity, which makes this the first thing to reach for when sizing a sparse run against a fixed pair of consumer cards rather than against a cluster. It sits beside <mention-page url="https://app.notion.com/p/3c65c17b0d0d81879a7ed90bca007699"/> and <mention-page url="https://app.notion.com/p/3c65c17b0d0d8133ae92fbe90a1f308e"/>, which partition the same state rather than schedule it.
## Provenance, and what is not here
This summary is written from the newsletter abstract that surfaced the paper (TLDR AI, 23 September 2026) and **not from a reading of the paper**. No numbers, baselines, model scales or ablations are recorded because none were available at that level of detail, and nothing above should be quoted as a measured result. Read the arXiv entry before relying on it; the row exists so the paper is not lost, not because it has been assessed.
Integrated on <mention-page url="https://app.notion.com/p/3c65c17b0d0d81b6876ee72b7056793b"/>.
</content>
</page>
