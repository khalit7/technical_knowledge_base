Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3e95c17b0d0d81e8b0e0e99acbeb9713 as of 2026-09-28T07:19:21.305Z:
<page url="https://app.notion.com/p/3e95c17b0d0d81e8b0e0e99acbeb9713">
<ancestor-path>
<parent-data-source url="collection://d440058d-ec1c-4b72-b141-046d5d969389" name="papers"/>
<ancestor-2-database url="https://app.notion.com/p/97163af7655541438b224f753fef6f6f" title="papers"/>
<ancestor-3-page url="https://app.notion.com/p/3c65c17b0d0d81549dbedb27e8f2a26f" title="Papers"/>
<ancestor-4-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-5-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"Paper":"Schrödinger's Code Repository: Have LLMs Learned SWE-bench or Memorized It?","Takeaway":"Instantiating the test repository dynamically under four behaviour-preserving transformations consistently degrades agent performance and raises interaction cost on SWE-bench Verified and SWE-QA, so part of a repository-level coding score is knowing where to look rather than knowing what to do.","Topics":["benchmarks","evaluation-and-llm-judges","swe-and-system-design"],"Year":"2026","url":"https://app.notion.com/p/3e95c17b0d0d81e8b0e0e99acbeb9713"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 5 min read · +35m resources
Silin Chen, Yufei Yang, Xiaodong Gu, Yuling Shi, Chengcheng Wan and Haibing Guan. [arXiv 2609.27891](https://arxiv.org/abs/2609.27891) (35 min). Code and data on GitHub.
## Method
SchrodingerRepo instantiates the test repository **dynamically at evaluation time** rather than evaluating against a static snapshot, applying four transformation levels that preserve executable behaviour:
- problem-statement reconstruction
- namespace remapping
- intra-file layout reordering
- functionality-preserving code rewriting
The task is identical; the familiar cues are gone.
## Result
Across models, removing familiar repository cues **consistently degrades agent performance and substantially increases interaction cost** on SWE-bench Verified and SWE-QA, with difficulty in repository exploration and localisation identified as the dominant cost drivers. The authors read this as partial reliance on memorised repository-side cues rather than on robust reasoning.
## Figure provenance, stated because it matters
The paper aggregator that surfaced this work records the gap as **6 to 14 points**. The abstract states the direction rather than a figure, so the range is carried with that attribution and not as the paper's own number. A second note: the arXiv listing shows 21 August 2026 while the paper surfaced in the 24 September 2026 trending digest, which is why it had not been recorded here before.
## Why it matters
It is the third sensitivity a repository-level score conceals, beside the harness rule and the item-defect rule. It answers by construction what SWE-rebench-style monthly refreshment answers by the calendar, with the advantage that transforming an existing set preserves the time series that refreshing one destroys.
Integrated on <mention-page url="https://app.notion.com/p/3c65c17b0d0d811fb43fece56e40041a"/>.
</content>
</page>
