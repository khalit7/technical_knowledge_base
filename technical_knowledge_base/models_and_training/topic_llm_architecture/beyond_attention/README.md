# Beyond attention: SSMs, Mamba, linear attention, RWKV and hybrids

Notion: https://app.notion.com/p/3fd5c17b0d0d8142bc9ecac1fc366966

Child page of Topic: llm-architecture. Built in this repository (2026-10-19): `index.html` is the whole page, made by `sh src/build.sh` from `src/parts/`.

Tabs: Reading (14 sections: recurrence vs attention, linear attention as a recurrence, decay and the delta rule with a five-rule animation, S4 to Mamba to Mamba-2, RWKV, Gated DeltaNet and KDA, hybrids and their ratios, recall, equal-budget runs on the tiny GPT, serving, code at pinned lines, mistakes, interview questions; about 38 minutes plus 5 in details), State vs KV cache (calculator over 15 real configs using the root's window.CC), Recall probes (Pythia-160M vs Mamba-130M, tiny GPT name recall, MQAR, running-sequence token strip), Inside the trained SSM (half-lives, hidden attention maps, decay per token), Further reading. How it was built: `src/README.md`.
