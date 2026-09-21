# Dream-RSI: Recursive Self-Improvement through Evolving Worlds

⏱ 4 min read · +40m resources

Tong Zheng, Xidong Wu, Zheng Zhang, Zhankui He, Chaoyi Zhang, Benjamin Coleman, Ruoqiao Wei, Di Bai, Haolin Liu, Rui Liu, Xue Wang, Yue Zhuan, Wang-Cheng Kang, Renkai Xiang, Heng Huang, Xinwu Cheng, Yunsong Guo. arXiv 2609.14858, 14 September 2026. 12 pages, [cs.CL](http://cs.cl/). The most-upvoted paper of the week on Hugging Face.

### The problem

Agentic discovery loops (propose a candidate, evaluate it, learn from the result) are bounded by evaluation cost. Compiling and benchmarking a GPU kernel, or running an optimisation to convergence, is expensive, and every improvement to the exploration policy normally costs a fresh round of those evaluations.

### The mechanism

Dream-RSI observes that the loop has already paid for a large number of evaluations, and that the record of them is a model of the region of search space already visited. It builds a replay simulator from the accumulated discovery history and improves the exploration policy against that simulator: cheap off-policy feedback over the realised search space, with no new online evaluations. A lightweight orchestration layer sits over the agent and handles the propose, dream, refine cycle. The authors' framing is that "accumulated discovery history can serve as a replay simulator over the realized search space".

### Results

Demonstrated in three domains: algorithm engineering, mathematical optimisation and GPU kernel engineering. Solution quality is competitive with or better than the online baselines at substantially lower discovery cost. The paper reports the pattern rather than a single headline number, which is a limitation when comparing it against the harness papers around it.

### The honest limit

A replay simulator is only valid inside the region the history covers, so the method sharpens exploitation of a mapped space rather than expanding exploration into an unmapped one. That is the opposite failure mode from the one Agora hit, where the population converged prematurely and a human had to restore diversity. Both point at the same underlying risk in self-improving loops: the cheap signal is always the one that describes where you have already been.

### Connections

Third of the week's three auto-research papers, with [Agora: Git as Shared Memory for Collective AutoResearch](../2026-09_agora-git-as-shared-memory/summary.md) and [SoL-Pi: Recursively Scaling Auto-Research Loops for Efficient Agent Harness](../2026-09_sol-pi-recursively-scaling-auto/summary.md). GPU kernel engineering as one of the three demonstration domains puts it directly next to [Topic: cuda-and-gpu-programming](../../topics/cuda-and-gpu-programming/summary.md) and next to Phi-Bench's finding that kernel and hardware work is where frontier models score worst.
