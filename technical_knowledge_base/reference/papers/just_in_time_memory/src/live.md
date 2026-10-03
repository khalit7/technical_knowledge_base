Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3e95c17b0d0d818f89b3f066f816727b as of 2026-09-28T07:19:21.261Z:
<page url="https://app.notion.com/p/3e95c17b0d0d818f89b3f066f816727b">
<ancestor-path>
<parent-data-source url="collection://d440058d-ec1c-4b72-b141-046d5d969389" name="papers"/>
<ancestor-2-database url="https://app.notion.com/p/97163af7655541438b224f753fef6f6f" title="papers"/>
<ancestor-3-page url="https://app.notion.com/p/3c65c17b0d0d81549dbedb27e8f2a26f" title="Papers"/>
<ancestor-4-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-5-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"Paper":"Just-in-Time Memory: Learning to Curate Task-Adaptive Memory for LLM Agents","Takeaway":"Curating an agent's memory at read time, once the task is known, beats distilling trajectories at write time by 16.2 and 16.3 points on ALFWorld and WebShop, and an untrained curator already wins, so the gain is the timing rather than the model.","Topics":["agentic-harnesses","rag-and-retrieval","llm-training-and-post-training"],"Year":"2026","url":"https://app.notion.com/p/3e95c17b0d0d818f89b3f066f816727b"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 6 min read · +45m resources
Yefan Zhou, Yang Li, Zeyu Leo Liu, Semih Yavuz and Shafiq Joty, 23 September 2026. [arXiv 2609.27334](https://arxiv.org/abs/2609.27334) (45 min)
## Problem
Agentic memory systems curate at **write time**, distilling a finished task trajectory into a fixed artifact such as a reflection or a skill. Whatever the distillation discarded is unavailable to every later task, and the curation decision is made without knowing what it will be used for.
## Method
Retain the **raw trajectories** and defer curation to **read time**, with a memory curator synthesising a compact task-specific payload for the task in hand. Because the payload is produced in the context of a task that has an outcome, the curator is trainable **directly from task success** rather than from the delayed and badly attributed signal a write-time distiller has to learn from.
## Results
Against the strongest baseline: ALFWorld **+16.2** percentage points, WebShop **+16.3**, tau²-bench **+3.9**.
The finding that decides how to read them is that an **untrained** curator already outperforms write-time methods, so task-adaptive read-time curation is itself the major source of gain rather than the learned curator.
## Connections
- <mention-page url="https://app.notion.com/p/3e25c17b0d0d81ce85e0c6d82f6beb4c"/> decides when to remind an agent of something it already holds, and <mention-page url="https://app.notion.com/p/3e25c17b0d0d81a0bb77f16cbc898bb5"/> compacts what it carries forward. Both operate on an artifact whose content was fixed earlier, and this says the artifact should not be fixed earlier.
## Design consequence
Keep trajectories raw, pay the storage, and spend the compute at read time, which is the opposite of what a compaction-first harness does.
Integrated on <mention-page url="https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb"/> and <mention-page url="https://app.notion.com/p/3c65c17b0d0d81b89145c37dfe8a3b0b"/>.
</content>
</page>
