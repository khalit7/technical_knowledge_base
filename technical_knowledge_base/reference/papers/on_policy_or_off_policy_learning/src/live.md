Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3fe5c17b0d0d8136888ff145ba3a7bbb as of 2026-10-19T16:11:44.818Z:
<page url="https://app.notion.com/p/3fe5c17b0d0d8136888ff145ba3a7bbb">
<ancestor-path>
<parent-data-source url="collection://d440058d-ec1c-4b72-b141-046d5d969389" name="papers"/>
<ancestor-2-database url="https://app.notion.com/p/97163af7655541438b224f753fef6f6f" title="papers"/>
<ancestor-3-page url="https://app.notion.com/p/3c65c17b0d0d81549dbedb27e8f2a26f" title="Papers"/>
<ancestor-4-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-5-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"Paper":"On-Policy or Off-Policy Learning? A Systematic Study of Distillation Dynamics","Takeaway":"In controlled strong-to-weak distillation of 1B students on short answers (about 100 tokens, three seeds), the KL direction and the learning rate matter more than who wrote the rollouts: forward KL reaches 71 to 73% whoever writes them, reverse KL needs the student's own rollouts at the lower learning rate (72% against 35%) and is erratic at the higher one, and forgetting and update sparsity follow the learning rate. The on-policy edge in pass@10 on a harder task did not carry into a later RLVR stage (one RL seed), and long reasoning traces were not tested at scale.","Topics":["llm-training-and-post-training","rl"],"Year":"2026","url":"https://app.notion.com/p/3fe5c17b0d0d8136888ff145ba3a7bbb"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
Being built in the technical_knowledge_base repository.
</content>
</page>

<parent-data-source-schema url="collection://d440058d-ec1c-4b72-b141-046d5d969389">
The SQLite table definition for this page's parent data source. Use these column names and option values to set this page's properties, create sibling pages, or query the data source.
Some columns or options are omitted. Fetch collection://d440058d-ec1c-4b72-b141-046d5d969389 for the full schema.
<sqlite-table>
CREATE TABLE IF NOT EXISTS "collection://d440058d-ec1c-4b72-b141-046d5d969389" (
	url TEXT UNIQUE,
	createdTime TEXT, -- ISO-8601 datetime string, automatically set. This is the canonical time for when the page was created.
	"Takeaway" TEXT,
	"Year" TEXT,
	"Topics" TEXT, -- JSON array with zero or more of ["llm-landscape", "llm-architecture", "llm-training-and-post-training", "rl", "ml-fundamentals", "data-curation-and-datasets", "generative-and-multimodal", "inference-and-serving", "cuda-and-gpu-programming", "pytorch-ecosystem", "jax-and-tpu", "hardware", "ml-infra-and-orchestration", "agentic-harnesses", "agentic-frameworks", "rag-and-retrieval", "protocols", "benchmarks", "evaluation-and-llm-judges", "swe-and-system-design"]
	"Paper" TEXT
)
</sqlite-table>
</parent-data-source-schema>
