Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3e95c17b0d0d81bd927be047bb0d7b0b as of 2026-09-28T07:19:21.198Z:
<page url="https://app.notion.com/p/3e95c17b0d0d81bd927be047bb0d7b0b">
<ancestor-path>
<parent-data-source url="collection://d440058d-ec1c-4b72-b141-046d5d969389" name="papers"/>
<ancestor-2-database url="https://app.notion.com/p/97163af7655541438b224f753fef6f6f" title="papers"/>
<ancestor-3-page url="https://app.notion.com/p/3c65c17b0d0d81549dbedb27e8f2a26f" title="Papers"/>
<ancestor-4-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-5-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"Paper":"DeepSeek Elastic Compute (DSec): A Sandbox Infrastructure for Effective Agentic Training at Scale","Takeaway":"The sandbox layer under agentic reinforcement learning, published with production numbers for the first time: four isolation levels behind one SDK, about 3 million sandboxes a day and 5,000 created per second on roughly 160 nodes, co-designed so stateful rollouts survive preemptible GPU training.","Topics":["llm-training-and-post-training","ml-infra-and-orchestration","rl","agentic-harnesses"],"Year":"2026","url":"https://app.notion.com/p/3e95c17b0d0d81bd927be047bb0d7b0b"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 6 min read · +45m resources
Wenfeng Liang with more than 99 co-authors from DeepSeek, 19 September 2026. [arXiv 2609.22978](https://arxiv.org/abs/2609.22978) (45 min)
## Architecture
- One SDK exposing **FnCall, container, microVM and full-VM** backends, so a rollout pays only for the isolation its task needs rather than for the strongest available.
- Sandbox images loaded **on demand from the Fire-Flyer File System (3FS)** instead of being staged per node.
- Memory sharing, reclamation and CPU scheduling tuned for high-density execution under overcommit.
- **Co-design with the reinforcement-learning framework** that decouples stateful rollouts from preemptible GPU training. This is the architectural point: a rollout that must survive a preempted trainer is a different system from one that can be restarted with it.
## Reported production scale
Approximately **160 nodes per production unit**, roughly **3 million sandboxes per day**, more than **380,000 concurrent** sandboxes, and more than **5,000 sandbox creations per second**, with latency maintained under high-density overcommit.
The paper also presents mitigating agent misbehaviour, reward hacking included, as a property of the **sandbox** rather than of the reward function: an environment that cannot be escaped removes a whole class of shortcut before the reward has to be robust to it.
## Why it matters
Every agentic reinforcement-learning recipe in this knowledge base assumes an environment supply that executes untrusted code at rollout rates a GPU cluster can consume, and none of them prices it. This is the first published account of that layer at frontier scale. Two things to take from it. The ratio of 5,000 creations per second to 160 nodes is what makes agentic RL affordable at all, and it is an infrastructure result rather than an algorithmic one, so a lab without it is not running the same experiments whatever recipe it copies. And the four-backend design is the transferable idea for anyone building smaller: **isolation is a per-task cost, not a platform decision**.
## Connections
- <mention-page url="https://app.notion.com/p/3d45c17b0d0d814abc07fde424e09a31"/> manufactures environments from recorded trajectories; this runs them.
Integrated on <mention-page url="https://app.notion.com/p/3c65c17b0d0d81b6876ee72b7056793b"/>.
## Provenance note
Dated 19 September, two days before the research window opened. It surfaced within the window through TechNode and Bloomberg coverage on 23 September and a 313-point Hacker News thread on 26 September, and had not been recorded here before.
</content>
</page>
