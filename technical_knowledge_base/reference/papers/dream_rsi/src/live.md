Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3e25c17b0d0d813ba021d805ba80ef54 as of 2026-09-21T14:50:13.928Z:
<page url="https://app.notion.com/p/3e25c17b0d0d813ba021d805ba80ef54">
<ancestor-path>
<parent-data-source url="collection://d440058d-ec1c-4b72-b141-046d5d969389" name="papers"/>
<ancestor-2-database url="https://app.notion.com/p/97163af7655541438b224f753fef6f6f" title="papers"/>
<ancestor-3-page url="https://app.notion.com/p/3c65c17b0d0d81549dbedb27e8f2a26f" title="Papers"/>
<ancestor-4-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-5-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"Paper":"Dream-RSI: Recursive Self-Improvement through Evolving Worlds","Takeaway":"Treat an agent's accumulated discovery history as a replay simulator over the search space already explored, so exploration policies can be improved off-policy by \"dreaming\" against past evaluations instead of paying for new ones; competitive or better solution quality at substantially lower discovery cost across algorithm engineering, mathematical optimisation and GPU kernel engineering.","Topics":["rl","agentic-harnesses","llm-training-and-post-training"],"Year":"2026","url":"https://app.notion.com/p/3e25c17b0d0d813ba021d805ba80ef54"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 4 min read · +40m resources
Tong Zheng, Xidong Wu, Zheng Zhang, Zhankui He, Chaoyi Zhang, Benjamin Coleman, Ruoqiao Wei, Di Bai, Haolin Liu, Rui Liu, Xue Wang, Yue Zhuan, Wang-Cheng Kang, Renkai Xiang, Heng Huang, Xinwu Cheng, Yunsong Guo. arXiv 2609.14858, 14 September 2026. 12 pages, [cs.CL](http://cs.CL). The most-upvoted paper of the week on Hugging Face.
## The problem
Agentic discovery loops (propose a candidate, evaluate it, learn from the result) are bounded by evaluation cost. Compiling and benchmarking a GPU kernel, or running an optimisation to convergence, is expensive, and every improvement to the exploration policy normally costs a fresh round of those evaluations.
## The mechanism
Dream-RSI observes that the loop has already paid for a large number of evaluations, and that the record of them is a model of the region of search space already visited. It builds a replay simulator from the accumulated discovery history and improves the exploration policy against that simulator: cheap off-policy feedback over the realised search space, with no new online evaluations. A lightweight orchestration layer sits over the agent and handles the propose, dream, refine cycle. The authors' framing is that "accumulated discovery history can serve as a replay simulator over the realized search space".
## Results
Demonstrated in three domains: algorithm engineering, mathematical optimisation and GPU kernel engineering. Solution quality is competitive with or better than the online baselines at substantially lower discovery cost. The paper reports the pattern rather than a single headline number, which is a limitation when comparing it against the harness papers around it.
## The honest limit
A replay simulator is only valid inside the region the history covers, so the method sharpens exploitation of a mapped space rather than expanding exploration into an unmapped one. That is the opposite failure mode from the one Agora hit, where the population converged prematurely and a human had to restore diversity. Both point at the same underlying risk in self-improving loops: the cheap signal is always the one that describes where you have already been.
## Connections
Third of the week's three auto-research papers, with <mention-page url="https://app.notion.com/p/3e25c17b0d0d81399738c3e65f4bf900"/> and <mention-page url="https://app.notion.com/p/3e25c17b0d0d81a0bb77f16cbc898bb5"/>. GPU kernel engineering as one of the three demonstration domains puts it directly next to <mention-page url="https://app.notion.com/p/3c65c17b0d0d81c39f34d5e070d783c1"/> and next to Phi-Bench's finding that kernel and hardware work is where frontier models score worst.
</content>
</page>
