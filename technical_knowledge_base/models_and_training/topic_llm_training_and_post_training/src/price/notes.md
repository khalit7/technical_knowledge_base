# Price list (t-price): sources and notes

Built 2026-10-03. Every row in `mk_price.py` names its sources; this file records what each source says, what was checked, and what could not be.

Files: `mk_price.py` (the data, writes `../data/price.json` and `../parts/33_js_price0_data.js`), `check_price.py` (recomputes every derived number; 0 failures), `check_price.mjs` (clicks every control at 390 dark and 920 light), `viz_ideas.md`. Parts: `33_tab_price.html`, `33_js_price1_main.js` (chart, cards, table), `33_js_price2_anim.js` (zoom and growth animation).

## Rules followed

- Three units, never converted: dollars, GPU-hours, FLOPs. GPU-hours appear only where the source gives GPUs and hours; the product is labelled derived.
- Kind of each number: published by the team, reported (press or an executive), third-party estimate (Epoch AI, Karpathy), derived (this page's arithmetic).
- Every figure says what it includes: final run, earlier stages, experiments, paid data creation, staff, hardware purchase (y, n, unstated), and how dollars were made (assumed rate, actual bill, amortised, cloud price, unstated).
- Capital (hardware purchases: SemiAnalysis's DeepSeek capex, Epoch's GPT-4 acquisition cost) is a different kind of figure and is kept off the chart; it appears only as a separate bar in the growth animation.

## Sources, as read on 2026-10-03

- **Postgres query planner** (rohanbansal.com/qorl, 16 Sep 2026): "I paid ~$800 to rent a 2x H100 SXM node from Lambda for ~95 hours, and ~$400 in OpenAI API fees to generate the Astra trajectory demonstrations. Total cost: $1,200." Local RTX 3090s ("FLOPper", ~$9 a day of electricity) not counted. SFT: 120 trajectories (100 train, 20 val), then 320 more (300, 20): 400 for training. LoRA 21.2M parameters. Base: Empero's Qwen 3.8 4B distillation. Repo news check (2026-09-21 issue) agrees.
- **MiMo-V2.6** (mimo.mi.com release post, 22 Sep 2026): "in less than 6 days, MiMo-V2.6-Flash and MiMo-V2.6-Pro completed 30 steps each with a cumulative total of approximately 750,000 trajectories, at training costs of around 850,000 and 2.62 million US dollars respectively". No GPU type, count, GPU-hours, rate or breakdown. The model card and the alphaXiv abstract give no cost. ComputingForGeeks (25 Sep) repeats it. The live dashboard (mimo.xiaomi.com/rl) rendered nothing when fetched.
- **Thomson Reuters**: LawNext (24 Aug 2026): "invested some $40 million into developing Thomson over the past two years, covering both talent and compute"; "Hron revealed that the final training run for the version launching today cost just $450,000." Investing.com (24 Aug): "$40 million to train the model, covering talent and compute costs". The Decoder: "about $40 million on staff and computing power over more than two years", and the content and experts' hours are not in it. The Batch (4 Sep): "$40 million in total training costs over three months" (the outlier). arXiv 2608.27147 abstract: no number. Base model Qwen3.5-397B-A17B (The Batch). One secondary blog says "about three weeks" for the final run: unconfirmed, not used.
- **DeepSeek-V3**: Table 1 via the repo's paper page (`reference/papers/deepseek_v3_technical_report`, recompute reproduces). **DeepSeek-R1**: Table 7 via the repo's paper page (`reference/papers/deepseek_r1`). SemiAnalysis capex via the repo's DeepSeek page.
- **Llama 3.1**: model card in the repo (`reference/papers/llama_3_herd/src/inputs/llama3_1_model_card.md`): 39.3M cumulative H100-80GB GPU-hours; 1.46M, 7.0M, 30.84M.
- **OLMo 2**: Table 6 FLOPs (1.8, 4.6, 13.0 x 10^23) and Table 19 energy (131, 257 MWh), from the repo's paper page; the repo already found the text's 391 MWh does not reproduce.
- **GPT-3** 3.14e23 (Table D.1; repo recompute), **Chinchilla** 5.76e23 (Table 3).
- **Alpaca**: "costed less than $500 using the OpenAI API"; "3 hours on 8 80GB A100s, which costs less than $100".
- **Vicuna**: "around $300" for 13B ($140 for 7B), 8 A100s, one day, SkyPilot managed spot.
- **s1**: paper: "26 minutes on 16 NVIDIA H100 GPUs", no dollars. TechCrunch (5 Feb 2025): "under $50 in cloud compute credits, according to a new research paper"; Muennighoff "could rent the necessary compute today for about $20".
- **Sky-T1**: "8 H100 with DeepSpeed Zero-3 offload (~ $450 according to Lambda Cloud pricing)", 19 hours, 17K QwQ-generated examples.
- **llm.c**: #481 "~90 minutes" on 8x A100 80GB, "~$14/hr", "$20"; #677 title "one 8XH100 node, 24 hours, $672".
- **nanochat** README: "$48 (~2 hours of 8XH100 GPU node)", "~$3/GPU/hr", "closer to ~$15" on spot, GPT-2 2019 "approximately $43,000"; leaderboard record 6: 1.65 hours, 14 Mar 2026.
- **modded-nanogpt** README: record 1, 45 minutes (28 May 2024); record 92, 0.665 minutes (30 Aug 2026); "Under 40 seconds on 8xH100".
- **Magic** (8 Sep 2026; raw HTML saved and parsed): footnote 6ND table (e22 1.12e22, e23 1.58e23, e24 1.63e24; DeepSeek V4 Pro 48,852,265,054 x 33T = 9.67e24); "~$0.5M on GB200", "scaling 10x (~$4M)", ">$100M under DeepSeek V4 Pro's recipe" (a projection, not shown); Figures 1 and 2: 28 effective-compute multipliers transcribed from the labels (7 domains x 4 rivals), 12x to 127x.
- **Epoch AI database** (notable_ai_models.csv downloaded 2026-10-03): amortised and cloud costs in 2023 dollars for GPT-3, GPT-4, Gemini 1.0 Ultra, Llama 3.1 405B, GPT-4.5, Grok 4; FLOPs and confidence labels. DeepSeek-V3's $5.39M is the paper's figure converted to 2023 dollars.
- **Epoch paper** (arXiv 2405.21015 v2, parsed): GPT-4 $40M and Gemini Ultra $30M amortised; GPT-4 hardware $800M to acquire; whole-development amortised hardware "from $4M to $90M" (GPT-3 to GPT-4); staff 29 to 49% of development cost; BLOOM's final run 37.24% of project energy; OPT-175B 793.5 hours at $2,500 an hour = $1.98M.
- **AI Index 2024**: GPT-4 $78M and Gemini Ultra $191M at cloud prices (with Epoch); the database now reads $81.4M and $206M.
- **Periodic Neon** (15 Sep 2026): "Our final training run used 1,300 H200 GPUs"; inference cost uses "$2.5/hour H200 price"; no training cost or duration.
- **Mercor with SkyRL** (1 Sep 2026): no dollars, GPU-hours, duration or step count; node ratios only.

## Unconfirmed

- Whether MiMo's $2.62M covers sandboxes and rollout inference, and how it was costed.
- What Llama 3.1's "total GPU time" includes beyond pretraining.
- Thomson's final-run duration and hardware; The Batch's "three months".
- Periodic Neon's budget (the old page's "three orders of magnitude up").
