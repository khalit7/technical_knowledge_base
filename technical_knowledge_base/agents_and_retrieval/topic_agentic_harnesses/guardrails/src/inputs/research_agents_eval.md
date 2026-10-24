# Research notes: agent rails, detector evaluation, guardrail evaluation methodology

All fetched 2026-10-04 unless noted. "unconfirmed" = not confirmed from a primary source in this session. Note: the web search budget was exhausted in this session, so everything below comes from direct fetches of known primary URLs (arXiv abs/html, vendor pages, GitHub, Hugging Face).

## 1. Tool-call and action rails for agents

### Simon Willison, "The lethal trifecta for AI agents" (16 June 2025)
URL: https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/ (fetched 2026-10-04)
- The three ingredients, verbatim: "Access to your private data"; "Exposure to untrusted content"; "The ability to externally communicate".
- Problem statement: LLMs "are unable to reliably distinguish the importance of instructions based on where they came from".
- On guardrail products: "95% is very much a failing grade" (in web application security).
- Design principle he endorses (quoting the design-patterns paper): "once an LLM agent has ingested untrusted input, it must be constrained so that it is impossible for that input to trigger any consequential actions."
- Advice to end users: avoid combining all three legs; vendor guardrails cannot be relied on.

### CaMeL: "Defeating Prompt Injections by Design" (Google DeepMind + ETH), arXiv 2503.18813
URL: https://arxiv.org/abs/2503.18813 and https://arxiv.org/html/2503.18813 (fetched 2026-10-04)
- Authors: Debenedetti, Shumailov, Fan, Hayes, Carlini, Fabian, Kern, Shi, Terzis, Tramèr. v1 24 Mar 2025, v2 24 Jun 2025.
- Mechanism (abstract): "CaMeL explicitly extracts the control and data flows from the (trusted) query; therefore, the untrusted data retrieved by the LLM can never impact the program flow." Capabilities (metadata tags on values) plus security policies checked at each tool call prevent exfiltration "over unauthorized data flows".
- Headline (abstract): "solving 77% of tasks with provable security (compared to 84% with an undefended system) in AgentDojo." So utility cost about 7 points in the headline configuration.
- HTML body (as extracted by fetch tool, model per table unclear, attributed to Claude 3.5 Sonnet): Workspace 31/40, Banking 12/16, Slack 14/20, Travel 5/20, total 62/96 (64.6%). Travel is the weak suite ("underdocumented APIs"). Treat per-suite figures as "check table before quoting".
- Security: with Gemini 2.5 Pro, successful attacks "300 to 0"; against Claude 3.5 Sonnet over 949 attacks: CaMeL 0 successful, tool filter 8; spotlighting and prompt sandwiching much higher. (HTML, fetched 2026-10-04.)
- Cost: "CaMeL requires 2.82x more input and 2.73x more output tokens" than native tool calling, median task.
- "Provable" means: under its threat model, untrusted data cannot change control flow and policies block disallowed data flows; it does not stop the quarantined LLM from producing wrong values inside an allowed flow (data-only manipulation remains).

### Design patterns paper, arXiv 2506.08837
URL: https://arxiv.org/abs/2506.08837, https://arxiv.org/html/2506.08837 (fetched 2026-10-04)
- "Design Patterns for Securing LLM Agents against Prompt Injections", Beurer-Kellner, Buesser, Creţu, Debenedetti, Dobos, Fabian, Fischer, Froelicher, Grosse, Naeff, Ozoani, Paverd, Tramèr, Volhejn. Submitted 10 June 2025, revised 27 June 2025.
- Six patterns: (1) Action-Selector (LLM picks from fixed actions, never reads tool output); (2) Plan-Then-Execute (fixed plan before touching untrusted data; outputs cannot change which tools run); (3) LLM Map-Reduce (isolated sub-agents process each untrusted item; only constrained results aggregated); (4) Dual LLM (privileged LLM with tools, quarantined LLM without tools handles untrusted text, symbolic variables between them); (5) Code-Then-Execute (agent writes a program that calls tools and unprivileged LLMs; CaMeL is this); (6) Context-Minimization (drop the user prompt / unneeded context after it is used).
- Core principle, verbatim (p. 5): "Once an LLM agent has ingested untrusted input, it must be constrained so that it is impossible for that input to trigger any consequential actions."
- The paper presents 10 case studies (count from memory, unconfirmed this session).

### AgentDojo, arXiv 2406.13352 (Debenedetti et al., NeurIPS 2024 Datasets and Benchmarks)
URL: https://arxiv.org/html/2406.13352 (fetched 2026-10-04)
- 97 user tasks, 27 injection tasks, 629 security test cases, 4 suites (Workspace, Slack, Travel, Banking).
- Defence table, GPT-4o (Table 5, appendix C), important attack:

| Defence | Benign utility | Utility under attack | Targeted ASR |
|---|---|---|---|
| No defence | 69.0% (±3.6) | 50.01% (±3.9) | 57.69% (±3.9) |
| Data delimiting (spotlighting-style) | 72.66% (±3.5) | 55.64% (±3.9) | 41.65% (±3.9) |
| Prompt injection detector (ProtectAI DeBERTa) | 41.49% (±3.9) | 21.14% (±3.2) | 7.95% (±2.1) |
| Prompt sandwiching | 85.53% (±2.8) | 67.25% (±3.7) | 27.82% (±3.5) |
| Tool filter | 73.13% (±3.5) | 56.28% (±3.9) | 6.84% (±2.0) |

- Reading: the detector cuts ASR to about 8% but halves benign utility (69.0 to 41.5) because of false positives on benign tool outputs; the tool filter does as well on ASR at no utility cost here, but fails whenever the injected goal needs only tools the task already uses.
- Note: the "detector" in AgentDojo is the ProtectAI deberta-v3-base-prompt-injection classifier (from memory of the paper's text; unconfirmed in this fetch).

### InjecAgent, arXiv 2403.02691 (Zhan, Liang, Ying, Kang; ACL Findings 2024)
URL: https://arxiv.org/abs/2403.02691 (fetched 2026-10-04)
- 1,054 test cases, 17 user tools, 62 attacker tools; two harm types (direct harm, data exfiltration); 30 agent configurations.
- "ReAct-prompted GPT-4 vulnerable to attacks 24% of the time"; with a reinforcing "hacking prompt" the ASR on ReAct GPT-4 "nearly doubles" (abstract wording; about 47% in the paper body, unconfirmed this session).

### Spotlighting (Microsoft), arXiv 2403.14720
URL: https://arxiv.org/abs/2403.14720 (fetched 2026-10-04)
- Hines, Lopez, Hall, Zarfati, Zunger, Kiciman; 20 Mar 2024.
- Abstract: spotlighting "reduces the attack success rate from greater than 50% to below 2%" in their experiments (GPT-family models), "with minimal detrimental impact" on task performance. Three variants: delimiting, datamarking (interleave a special token through the untrusted text), encoding (e.g. base64).
- Contrast: in AgentDojo's harder agent setting, the delimiting defence only moves GPT-4o ASR from 57.7% to 41.7% (row above).

### OpenAI instruction hierarchy, arXiv 2404.13208
URL: https://arxiv.org/abs/2404.13208, https://arxiv.org/html/2404.13208 (fetched 2026-10-04)
- Wallace, Xiao, Leike, Weng, Heidecke, Beutel; 19 Apr 2024. Applied to GPT-3.5 Turbo.
- Abstract: training to prioritise system > user > tool output "drastically increases robustness, even for attack types not seen during training, while imposing minimal degradations on standard capabilities".
- Body: system prompt extraction robustness up "63%"; jailbreak robustness up "over 30%" on held-out attacks; generalisation "up to 34%". Regressions (more over-refusal) on "System Message Probing Questions" and "Jailbreakchat with Allowed Prompts". Exact per-eval percentages not extracted (unconfirmed).

### Task Shield, arXiv 2412.16682 (Jia, Wu, Qin, Squicciarini; 21 Dec 2024)
URL: https://arxiv.org/abs/2412.16682 (fetched 2026-10-04)
- Test-time check that every instruction and tool call serves the user's goal. AgentDojo, GPT-4o: ASR "2.07%" with utility "69.79%".

### MELON, arXiv 2502.05174 (Zhu, Yang, Wang, Guo, Wang; ICML 2025)
URL: https://arxiv.org/abs/2502.05174, https://arxiv.org/html/2502.05174 (fetched 2026-10-04)
- Masked re-execution: rerun the agent with the user task masked; if it proposes the same tool calls, they were driven by the tool output (injection).
- AgentDojo, GPT-4o (their own runs, numbers differ from AgentDojo's own table because of a different attack and model snapshot):

| Defence | Benign utility | Utility under attack | ASR |
|---|---|---|---|
| No defence | 80.41% | 69.08% | 16.06% |
| Delimiting | 82.47% | 69.75% | 13.39% |
| Repeat prompt (sandwich) | 83.51% | 77.86% | 9.18% |
| Tool filter | 65.98% | 65.54% | 2.34% |
| DeBERTa detector | 38.14% | 21.34% | 2.58% |
| LLM detector | 81.44% | 0.00% | 0.00% (as extracted; looks odd, check the table) |
| MELON | 76.29% | 68.72% | 0.32% |

- MELON false positive rate "9.28%".
- Contradiction to note: no-defence GPT-4o ASR is 57.69% in AgentDojo's table vs 16.06% in MELON's; different attack ("important_instructions" vs others) and model versions. Always quote the source of the baseline.

## 2. Prompt injection detectors, evaluated

### Lakera PINT benchmark (Prompt Injection Test)
URL: https://github.com/lakeraai/pint-benchmark (README fetched 2026-10-04)
- Dataset: 4,314 inputs (3,016 English, 1,298 non-English, 24 languages). Mix: prompt injections 5.2%, jailbreaks 0.9%, "hard negatives" (benign inputs that look like injections) 20.9%, chat 36.5%, public document excerpts 36.5%. So about 94% of PINT is benign: it scores false positives heavily.
- The dataset itself is private (to avoid training on the test); only a small example file is public. PINT score = balanced accuracy style metric across the categories (the README calls it the PINT score; exact formula not re-checked, unconfirmed).
- Results table, verbatim:

| Detector | PINT score | Test date |
|---|---|---|
| Lakera Guard | 95.2200% | 2025-05-02 |
| AWS Bedrock Guardrails | 89.2404% | 2025-05-02 |
| Azure AI Prompt Shield | 89.1241% | 2025-05-02 |
| protectai/deberta-v3-base-prompt-injection-v2 | 79.1366% | 2025-05-02 |
| Llama Prompt Guard 2 (86M) | 78.7578% | 2025-05-05 |
| Google Model Armor | 70.0664% | 2025-08-27 |
| Aporia Guardrails | 66.4373% | 2025-05-02 |
| Llama Prompt Guard (v1) | 61.8168% | 2025-05-02 |

- Caveat to state on the page: the benchmark is run and owned by Lakera, whose product tops it.

### "Detectors are easily evaded": arXiv 2504.11168
URL: https://arxiv.org/html/2504.11168 (v3, fetched 2026-10-04)
- Title in v3: "Bypassing LLM Guardrails: An Empirical Analysis of Evasion Attacks against Prompt Injection and Jailbreak Detection Systems". (The v1 title, April 2025, was "Bypassing Prompt Injection and Jailbreak Detection in LLM Guardrails"; v3 dated 14 July 2025.) Hackett, Birch, Trawicki, Suri, Garraghan (Lancaster University / Mindgard).
- Systems: Azure Prompt Shield, ProtectAI v1 and v2, Meta Prompt Guard, NVIDIA NeMo Guard Jailbreak Detect, Vijil Prompt Injection.
- Character injection (12 techniques: zero-width chars, homoglyphs, diacritics, emoji smuggling, Unicode tags, etc.) average ASR per system:

| System | Prompt injection ASR | Jailbreak ASR |
|---|---|---|
| Azure Prompt Shield | 71.98% | 60.15% |
| ProtectAI v1 | 77.32% | 51.39% |
| ProtectAI v2 | 20.26% | n/a (v2 does not target jailbreaks) |
| Meta Prompt Guard | 70.44% | 73.08% |
| NeMo Guard Jailbreak Detect | n/a | 72.54% |
| Vijil Prompt Injection | 87.95% | 91.67% |

- Best techniques: "Emoji Smuggling, which achieved a 100% ASR for both prompt injections and jailbreaks"; "Unicode Tags followed closely, with ASRs of 90.15% and 81.79%".
- Adversarial ML word-level evasion: TextFooler best, "average ASRs of 46.27% and 48.46% for prompt injections and jailbreaks respectively."
- Key point for the page: character tricks that the target LLM still reads (Unicode tags are invisible but tokenised) slip past classifiers; detectors are a speed bump, not a boundary.

### protectai/deberta-v3-base-prompt-injection-v2 model card
URL: https://huggingface.co/protectai/deberta-v3-base-prompt-injection-v2 (raw README fetched 2026-10-04)
- Status: card now carries "THIS PROJECT HAS BEEN ARCHIVED" (LLM Guard no longer maintained).
- Base: microsoft/deberta-v3-base; English only; labels benign (0) / injection (1); Apache 2.0.
- Datasets listed in metadata: natolambert/xstest-v2-copy, VMware/open-instruct, alespalla/chatbot_instruction_prompts, HuggingFaceH4/grok-conversation-harmless, Harelix/Prompt-Injection-Mixed-Techniques-2024, OpenSafetyLab/Salad-Data, jackhhao/jailbreak-classification. Licence summary says 22 sources in all (CC-BY-3.0: 1; MIT: 8; CC0: 1; no licence: 6; Apache 2.0: 5; CC-BY-4.0: 1, the xstest "full_compliance" split); the other 15 are not named.
- Plus "prompt injections were crafted using insights gathered from academic research papers, articles, security competitions" and community feedback.
- Evaluation: on its own held-out split accuracy 99.93%, recall 99.94%, precision 99.92%, F1 99.93%. "Post-Training Evaluation: Tested on 20,000 prompts from untrained datasets: Accuracy 95.25%, Precision 91.59%, Recall 99.74%, F1 95.49%." v1 on the same post-training set: accuracy 94.8%, precision 90.9%, recall 99.6%, F1 95%.
- Limitations, verbatim: "does not detect jailbreak attacks or handle non-English prompts"; "we do not recommend using this scanner for system prompts, as it produces false-positives."
- deepset/prompt-injections: NOT mentioned anywhere in the v2 card (neither in the dataset list nor the text). Since 15 of the 22 sources are unnamed, we cannot state it was excluded: the honest wording is "not listed as a training source; contamination cannot be ruled out". The v1 card's dataset list (Lakera/gandalf_ignore_instructions, rubend18/ChatGPT-Jailbreak-Prompts, imoxto/prompt_injection_cleaned_dataset-v2, hackaprompt/hackaprompt-dataset, fka/awesome-chatgpt-prompts, teven/prompted_examples, Dahoas/synthetic-hh-rlhf-prompts, Dahoas/hh_prompt_format, MohamedRashad/ChatGPT-prompts, HuggingFaceH4/instruction-dataset, no_robots, ultrachat_200k) also does not list deepset/prompt-injections. URL: https://huggingface.co/protectai/deberta-v3-base-prompt-injection (fetched 2026-10-04).
- deepset/prompt-injections itself: 546 train + 116 test examples, fields text and label (int); card metadata licence apache-2.0 (with a stray cc-by-4.0 inside dataset_info). URL: https://huggingface.co/datasets/deepset/prompt-injections (fetched 2026-10-04). It contains German as well as English examples (from memory; unconfirmed this session), which matters since ProtectAI v2 is English only.
- Contrast for the page: 95% F1 on the vendor's held-out set vs 79.1% PINT score vs a 41.5% AgentDojo benign utility when used as a tool-output filter (section 1) vs 20.26% character-injection evasion (above). Same model, four very different numbers depending on the distribution.

## 3. Claim checks

### (a) Adversa AI, "cryptographic context injection" against Grok
URL: https://adversa.ai/blog/cryptographic-context-injection-grok-data-theft/ (full HTML downloaded and grepped 2026-10-04)
- Title on page: "Zero-click Grok data theft: Cryptographic Context Injection attack leaks chat histories". Author Rony Utevsky. Dated August 20, 2026.
- AES payload: CONFIRMED. "hides malicious instructions inside AES-encrypted text so guardrails can't read them, then tricks the AI into decrypting and trusting them as its own." Specifically AES-256-GCM under a PBKDF2-derived key, decrypted by the agent in its own Python code-execution sandbox; "Input filters classify text, they do not run it." The key material travels with the ciphertext; the point is that no classifier runs PBKDF2 at inspection time and the model cannot decode it "in-weights", so the plaintext appears as trusted runtime output.
- Target: "xAI Grok web chat, agentic browsing framework" (no version). Attack: user asks Grok to summarise an ordinary-looking web page; page carries encrypted JSON plus an instruction to decrypt with the Python runtime; decrypted instructions make the agent build a fake "decryption key" that is a template interpolating private context, then open a URL with it as a query parameter "to fetch additional context". Zero-click: "no user confirmation and no visible warning".
- Data exfiltrated: CONFIRMED as "the user's name, coarse location, subscription tier, and the full set of the user's prompts in the conversation". (Health text in the demo video is only example content.)
- Second demo: Gemini 3 Flash (Web), Deep Thinking mode, gemini.google.com, direct injection used as a safety-policy bypass (not data theft). Not reported to Google ("jailbreaks are out of scope for its vulnerability disclosure program"); Gemini success rate "has fallen sharply since June".
- Success rate about 40% over 20 attempts: NOT FOUND. The page gives no success-rate number or attempt count for Grok; it says only "success rates vary by target and shift over time" and "As of August 19, we could still reproduce the attack against Grok." Treat "about 40% over 20 attempts" as unconfirmed (no primary support on this page).
- 11 weeks without a patch: NOT STATED as such, but consistent with the dates. Reported to xAI and its HackerOne programme June 3, 2026; follow-ups August 4 and 10; "no specifics and no mitigation timeline"; still reproducible August 19; published August 20. June 3 to August 20 is 78 days, about 11 weeks. Wording to use: "still unfixed about 11 weeks after the report, per Adversa".
- Adversa's recommended fix is in the harness, not the filter: "Gate tool calls whose arguments derive from fetched or decrypted content, tag provenance, and alert on the chain rather than any single payload." This is an action rail, matching section 1. Note: Adversa sells an agent-security platform and says it stopped the replayed chain; vendor source.

### (b) The "CRC Monitor" paper (Schirmer, Jazbec et al., 2026)
Found via the arXiv author listing for Metod Jazbec (http://export.arxiv.org/api/query?search_query=au:Jazbec, fetched 2026-10-04).
- arXiv 2607.02510, "Online Safety Monitoring for LLMs", Mona Schirmer, Metod Jazbec, Alexander Timans, Christian Naesseth, Maja Waldron, Eric Nalisnick. Submitted 2 July 2026. URLs: https://arxiv.org/abs/2607.02510, https://arxiv.org/html/2607.02510 (fetched 2026-10-04).
- The title is NOT "CRC Monitor"; CRC is one of the two monitor variants inside it. The phrase "single-score conformal risk control" does not appear in the abstract (unconfirmed elsewhere). A companion earlier paper by the same first two authors: arXiv 2507.08721 "Monitoring Risks in Test-Time Adaptation" (Schirmer, Jazbec, Naesseth, Nalisnick, July 2025).
- Abstract claim: "a simple real-time monitor that turns a verifier signal from an external model into an alarm decision by thresholding, with the threshold calibrated via risk control"; it is competitive with more sophisticated sequential hypothesis testing (e-value, "e-valuator") monitors on math reasoning and red-teaming data.
- Method: at each generated step t a verifier gives score s_t; alarm Phi_t = 1 if any s_k < lambda for k <= t. The threshold lambda is calibrated on held-out good generations so the false-alarm risk P(exists t: s_t < lambda | y = 1) is controlled. Two variants: CRC (control in expectation, E_cal[R(lambda_hat)] <= epsilon) and UCB (high-probability control, P(R(lambda_hat) <= epsilon) >= 1 - delta).
- Setups: MATH with Qwen2.5-Math-PRM-7B as verifier, generators Claude Haiku 4.5 (90% accuracy) and Mistral-7B (26% accuracy); harmlessness with FineHarm (Qwen2.5-1.5B fine-tuned for token-level harm detection) and a red-teaming set scored by Llama Guard.
- Results (as extracted): CRC/UCB flag incorrect math answers at "about half the sequence", with lower detection delay than e-valuator baselines, false alarm "controlled across monitors". Power in harmlessness depends "strongly" on whether the safeguard verifier was trained for online (prefix) detection. PRM signal vs token log-probabilities: near epsilon = 0.3 the PRM exceeds "0.9 power while log-prob counterparts sit around 0.5". Exact table numbers not extracted (unconfirmed beyond these).
- Use on the page: a guard score only becomes a rail once a threshold is chosen; risk control gives a principled way to pick it with a finite-sample guarantee on false alarms over a calibration set (assuming exchangeability between calibration and deployment).

## 4. Guardrail evaluation methodology

### The two error rates, and why the threshold is the product
- A guard outputs a score; the rail is "block if score > t". Every t gives one (false positive rate on benign traffic, false negative rate on attacks) pair. Published single numbers (F1, "PINT score", accuracy) hide which point was chosen and on what base rate. Examples from the sources in this file:
  - ProtectAI v2: 99.74% recall but 91.59% precision on its own held-out 20k set (section 2); in AgentDojo the same detector halves GPT-4o benign utility, 69.0% to 41.5% (section 1), because tool outputs that merely look like instructions trip it.
  - STACK calibrates every classifier to a fixed 15% refusal rate on benign queries before comparing attack rates ("Thresholds adjusted to ensure 15% refusal rate (RR) on benign queries from Llama3Jailbreaks"), which is the fair way to compare guards: fix the false positive budget, then measure the miss rate. https://arxiv.org/html/2506.24068 (fetched 2026-10-04)
  - Constitutional Classifiers report the cost side on real traffic: "a 0.38% increase in refusal rates on production Claude.ai traffic" and "23.7% inference overhead". https://arxiv.org/html/2501.18837 (fetched 2026-10-04)

### Conformal risk control (Angelopoulos, Bates, Fisch, Lei, Schuster), arXiv 2208.02814
URL: https://arxiv.org/abs/2208.02814 (fetched 2026-10-04); v1 4 Aug 2022, v4 13 Jun 2025; code https://github.com/aangelopoulos/conformal-risk
- Extends split conformal prediction from coverage to the expected value of any monotone loss: choose lambda_hat on n exchangeable calibration points so that E[L(lambda_hat)] <= alpha. Tight up to O(1/n). Examples: false negative rate, graph distance, token-level F1.
- Practical recipe (standard form, from the paper): with losses bounded by B, choose the smallest lambda such that (n/(n+1)) * R_hat_n(lambda) + B/(n+1) <= alpha, where R_hat_n is the empirical calibration risk. (Formula from memory of the paper; check before quoting.)
- For guardrails: the loss can be "a harmful item got through" (control the leak rate) or "a benign item got blocked" (control the false alarm rate, as in Schirmer et al. 2607.02510, section 3b). The guarantee is marginal and only holds if deployment data are exchangeable with calibration data; an adaptive attacker breaks exchangeability by construction.

### Over-refusal sets
- OR-Bench (Cui et al.), arXiv 2405.20947, https://arxiv.org/html/2405.20947 (fetched 2026-10-04): OR-Bench-80K (80,000 "seemingly toxic" but safe prompts, 10 categories), OR-Bench-Hard-1K (about 1,000 hard ones), OR-Bench-Toxic (600 truly toxic). 32 models from 8 families. "Spearman rank-order correlation between safe and toxic prompt rejection rates is 0.89": models that refuse more toxic prompts also refuse more safe ones. It does NOT evaluate standalone guard models (Llama Guard, OpenAI moderation, ShieldGemma) as over-refusers; it used an ensemble of GPT-4, Llama-3-70B and Gemini-1.5-Pro as its own moderator to label prompts, and avoided the OpenAI moderation API for "high thresholds that misclassify explicit content". So "OR-Bench numbers on guard models": none in the primary paper.
- XSTest (Röttger, Kirk, Vidgen, Attanasio, Bianchi, Hovy; NAACL 2024), arXiv 2308.01263, https://arxiv.org/abs/2308.01263 (fetched 2026-10-04): 250 safe prompts across 10 prompt types (homonyms like "kill a Python process", safe contexts, privacy of fictional people, etc.) plus 200 unsafe contrast prompts.
- XSTest as a guard false-positive set: WildGuard (arXiv 2406.18495, https://arxiv.org/html/2406.18495, fetched 2026-10-04) builds XSTest-Resp (model responses to XSTest prompts) and reports response-harmfulness F1: WildGuard 94.7, GPT-4 91.3, Llama Guard 2 90.8, MD-Judge 90.4, Llama Guard 82.0, OpenAI Moderation API 46.6. Refusal detection F1 on XSTest-Resp: GPT-4 98.1, WildGuard 92.8, LibrAI LongFormer 74.3, keyword detector 71.0. Averages across public benchmarks: prompt harm F1 WildGuard 86.1 vs GPT-4 84.6; response harm 82.4 vs 82.0. The XSTest prompt-harm subset (safe prompts as negatives) is also part of WildGuard's prompt harmfulness average (per-model numbers not extracted; unconfirmed).

### End-to-end leak rate of stacked defences
Definition to use on the page: the fraction of attack attempts for which harmful output (or a harmful action) actually reaches the user or the world after every layer has had its chance, measured on the full pipeline, not per component. If layers failed independently it would be the product of the per-layer miss rates; attacks optimised against the whole stack make the layers fail together, so the product is a lower bound, not an estimate.
- STACK (McKenzie, Hollinsworth, Tseng, Davies, Casper, Tucker, Kirk, Gleave; FAR.AI and UK AISI), arXiv 2506.24068, v1 30 Jun 2025, v3 5 Feb 2026. https://arxiv.org/abs/2506.24068, https://arxiv.org/html/2506.24068 (fetched 2026-10-04)
  - Pipeline: input classifier, then generator (Qwen3-14B), then output classifier. A few-shot-prompted Gemma 2 classifier "outperforms state-of-the-art open-weight safeguard model ShieldGemma".
  - Off-the-shelf attack (PAP) against the pipeline on ClearHarm: 0% ASR (and about 20% on undefended Qwen3-14B on StrongREJECT).
  - Staged attack that defeats each layer separately and then composes: "STACK achieves 71% ASR on ClearHarm in a black-box attack"; transfer without target access "33% ASR". Cost "507 H100 GPU-hours" (black box) and "15 H100 GPU-hours" (transfer).
  - This is the cleanest published case of "stacked layers look like 0% leak to generic attacks, 71% to an attacker who targets the stack".
- Constitutional Classifiers (Sharma et al., Anthropic), arXiv 2501.18837, 31 Jan 2025. https://arxiv.org/abs/2501.18837, https://arxiv.org/html/2501.18837 (fetched 2026-10-04)
  - Input classifier + streaming output classifier around Claude. Automated held-out jailbreaks: 86% success on the unguarded model vs under 5% with both classifiers (the paper's figure is commonly quoted as 4.4%; unconfirmed in this fetch).
  - Human red teaming: about 183 active participants (405 invited), "over 3,000 estimated hours"; "no red-teaming report achieved comprehensive success" on all ten target questions at the 50% detail bar; bounty payouts USD 95,000 total, up to USD 15K per report.
  - Costs: +0.38% refusals on production traffic, +23.7% inference compute.
- NVIDIA NeMo Guardrails layered evaluation (blog, 3 Mar 2025): "Measuring the Effectiveness and Performance of AI Guardrails in Generative AI Applications", https://developer.nvidia.com/blog/measuring-the-effectiveness-and-performance-of-ai-guardrails-in-generative-ai-applications/ (fetched 2026-10-04). App model Llama 3.1 70B Instruct; 215 curated interactions (about 10% multi-turn); rails added one at a time:

| Configuration | Avg latency (s) | Policy compliance (%) | Throughput (tokens/s/interaction) |
|---|---|---|---|
| No guardrails | 0.91 | 75.01 | 112.9 |
| + Content safety (Llama 3.1 NemoGuard 8B ContentSafety) | 1.29 | 83.0 | 101.2 |
| + Jailbreak detect (NemoGuard JailbreakDetect) | 1.36 | 89.1 | 99.0 |
| + Topic control (Llama 3.1 NemoGuard 8B TopicControl) | 1.44 | 98.9 | 98.7 |

  - Caveats: vendor blog, 215 items, non-adaptive test set; the column is labelled as policy violations detected / compliance (wording differs between the table and the text). Reported as "about 0.5 s added by the first layer, then small increments". No false-positive number on benign traffic is given in what was extracted (unconfirmed whether the post reports one).

### MLCommons AILuminate v1.0
URL: https://arxiv.org/html/2503.05731 (v2 dated 18 Apr 2025, fetched 2026-10-04); https://mlcommons.org/ailuminate/ (fetched 2026-10-04)
- 12 hazard categories (violent crimes, nonviolent crimes, sex-related crimes, child sexual exploitation, indiscriminate weapons, suicide and self-harm, intellectual property, privacy, defamation, hate, sexual content, specialized advice). 12,000 practice + 12,000 official prompts, 1,000 per hazard per set.
- Five grades Poor to Excellent; Excellent needs "less than 0.1% violating responses". Other grades are relative to a reference model: "a composite of the two accessible SUTs that score best on the benchmark", accessible meaning under 15B parameters with relatively open weights.
- Evaluator: "an ensemble of LLMs that jointly assess the benchmark responses", mixing fine-tuned guard models and prompt-engineered evaluators; identities kept secret: "MLCommons keeps that information confidential to prevent the ensemble from being used as a guard model."
- Evaluator error: "The evaluator system is designed to minimize the false-safe rate"; consequence: "it has a high false-unsafe rate. The evaluator, therefore, likely predicts more unsafe responses compared with the ground truth"; "the greatest error source today is evaluator error". No numeric accuracy, kappa or false-safe rate found in the paper text (unconfirmed / not published there).
- Date: the brief says "v1.0 Feb 2025". The arXiv paper is March 2025 (v2 April 2025). From memory, v1.0 (English) launched 4 Dec 2024 and v1.1 (adding French) in Feb 2025; neither date confirmed on the pages fetched. Flag as unconfirmed.

### JailbreakBench (Chao et al.), arXiv 2404.01318
URL: https://arxiv.org/html/2404.01318 (fetched 2026-10-04)
- JBB-Behaviors: 100 behaviours, 10 categories aligned with OpenAI usage policies; "18% are sourced from AdvBench, 27% from TDC/HarmBench, whereas the remaining 55% are original" (plus 100 benign behaviours, from memory).
- Judge study: 300 examples (200 jailbreak attempts + 100 benign), ground truth = majority of three expert annotators (inter-annotator agreement about 95%):

| Judge | Agreement | FPR | FNR |
|---|---|---|---|
| Rule-based (refusal strings) | 56.0% | 64.2% | 9.1% |
| GPT-4 | 90.3% | 10.0% | 9.1% |
| HarmBench classifier | 78.3% | 26.8% | 12.7% |
| Llama Guard | 72.0% | 9.0% | 60.9% |
| Llama Guard 2 | 87.7% | 13.2% | 10.9% |
| Llama-3-70B (chosen) | 90.7% | 11.6% | 5.5% |

- CONTRADICTION with the brief: the current JailbreakBench judge is Llama-3-70B, not Llama Guard. The original v1 of the paper used Llama Guard as the judge; the switch is explained: GPT-4 "comes with the drawback of close-sourced models, i.e., expensive to query and subject to change". Llama Guard 1 as a judge misses 60.9% of real jailbreaks: a guard model's numbers as a judge are a direct guardrail false-negative estimate.

## 5. PII rails

### Microsoft Presidio
URLs: https://microsoft.github.io/presidio/supported_entities/ now redirects (301) to https://presidio.dataprivacystack.org/supported_entities/ (fetched 2026-10-04). The docs now sit under a "Data Privacy Stack" organisation; originally Microsoft. (Ownership change seen only from the redirect and docs wording; details unconfirmed.)
- Architecture: Analyzer (detect) + Anonymizer (replace, redact, mask, hash, encrypt). Analyzer runs a registry of recognisers: regex pattern recognisers with optional checksum validation (e.g. Luhn for credit cards) and context words that raise the score when nearby ("pattern match, context and checksum"), plus an NLP engine (spaCy by default; transformers or Stanza optional) for PERSON, LOCATION, NRP, DATE_TIME etc.
- Entities: 40+ types. Global (13): e.g. CREDIT_CARD, CRYPTO, DATE_TIME, EMAIL_ADDRESS, IBAN_CODE, IP_ADDRESS, NRP, LOCATION, PERSON, PHONE_NUMBER, MEDICAL_LICENSE, URL (exact 13 list from memory; the page lists them). Country-specific: USA (SSN, driver licence, passport, bank number, ITIN, NPI, MBI), UK (NHS number, NINO, passport, postcode, driving licence, vehicle registration), and Spain, Italy, Poland, Singapore, Australia, India, Finland, Korea, Nigeria, Philippines, Canada, Sweden, South Africa, Thailand, Turkey, Germany. Plus about 8 medical/clinical entity types via an NER model.
- Presidio publishes no headline precision/recall for its default recognisers on the fetched page; evaluation tooling is in the separate presidio-research repo (numbers not fetched; unconfirmed).

### GLiNER PII models
- knowledgator/gliner-pii-large-v1.0 (Wordcab + Knowledgator), Apache 2.0, English, zero-shot span extraction with "60+ predefined PII categories" plus arbitrary labels at runtime; threshold argument trades recall for precision (card suggests 0.3 as a start, 0.2 for recall, 0.6 for precision). URL: https://huggingface.co/knowledgator/gliner-pii-large-v1.0 (raw README fetched 2026-10-04).
  - Card benchmark, on "synthetic-multi-pii-ner-v1":

| Model | Precision | Recall | F1 |
|---|---|---|---|
| knowledgator/gliner-pii-edge-v1.0 | 78.96% | 72.34% | 75.50% |
| knowledgator/gliner-pii-small-v1.0 | 78.99% | 74.80% | 76.84% |
| knowledgator/gliner-pii-base-v1.0 | 79.28% | 82.78% | 80.99% |
| knowledgator/gliner-pii-large-v1.0 | 87.42% | 79.4% | 83.25% |
| urchade/gliner_multi_pii-v1 | 79.19% | 74.67% | 76.86% |
| E3-JSI/gliner-multi-pii-domains-v1 | 78.35% | 74.46% | 76.36% |
| gravitee-io/gliner-pii-detection | 81.27% | 56.76% | 66.84% |

  - Internal contradiction in the card: the prose says the base model "achieves the highest F1 score (80.99%)", but the table gives large 83.25%. Also: synthetic test set, vendor-run, threshold not stated.
- urchade/gliner_multi_pii-v1: fine-tune of urchade/gliner_multi-v2.1 on urchade/synthetic-pii-ner-mistral-v1 (Apache 2.0 dataset); Apache 2.0; languages en, fr, de, es, pt, it; card lists about 50 entity labels (person, organization, phone number, address, passport number, email, credit card number, social security number, iban, cpf, cnpj, ...). No precision/recall on its own card. GLiNER paper: https://arxiv.org/abs/2311.08526. URL: https://huggingface.co/urchade/gliner_multi_pii-v1 (fetched 2026-10-04).

### Labelled PII datasets (licence check, via Hugging Face API and cards, fetched 2026-10-04)

| Dataset | Licence | Size | Fields | Notes |
|---|---|---|---|---|
| nvidia/Nemotron-PII https://huggingface.co/datasets/nvidia/Nemotron-PII | CC BY 4.0, "ready for commercial use" | 100,000 English records (50k train / 50k test) | uid, domain, document_type, document_description, document_format (structured/unstructured), locale (us/intl), text, spans [{start, end, label}], text_tagged | Synthetic, persona-grounded (US Census), 50+ industries, 55+ PII/PHI labels; created 2025-10-28; authors Steier, Manoel, Haushalter, Van Segbroeck |
| gretelai/gretel-pii-masking-en-v1 https://huggingface.co/datasets/gretelai/gretel-pii-masking-en-v1 | Apache 2.0 | 50k train / 5k validation / 5k test | uid, domain, document_type, document_description, text, entities | Synthetic (Gretel Navigator, mistral-nemo-2407); built for fine-tuning GLiNER |
| gretelai/synthetic_pii_finance_multilingual | Apache 2.0 | 50,346 train / 5,594 test | generated_text, pii_spans, document_type, language, ... | Finance documents, multilingual |
| urchade/synthetic-pii-ner-mistral-v1 | Apache 2.0 | size not checked | not checked | Training set of gliner_multi_pii-v1 |
| ai4privacy/pii-masking-300k https://huggingface.co/datasets/ai4privacy/pii-masking-300k | "other" (custom LICENSE.md): "Academic use is encouraged ... Commercial entities should contact us at licensing@ai4privacy.com" | about 225k rows (178k train, 47.7k validation per viewer) | source_text, target_text, privacy_mask, span_labels, mbert_text_tokens, mbert_bio_labels, id, language, set | OpenPII-220k (27 PII classes) + FinPII-80k (about 20 more finance classes); 6 languages. Not an open licence: avoid for the demo |
| ai4privacy/open-pii-masking-500k-ai4privacy | "other" | 100K to 1M | not checked | Same licence caveat |

- Recommendation for a small demo: nvidia/Nemotron-PII (CC BY 4.0, span offsets, structured vs unstructured, per-record locale) or gretelai/gretel-pii-masking-en-v1 (Apache 2.0). Both synthetic: scores on them overstate real-world recall, which is worth saying on the page.

## 6. OWASP lists

### OWASP Top 10 for LLM Applications 2025
URL: https://genai.owasp.org/llm-top-10/ (fetched 2026-10-04)
- LLM01:2025 Prompt Injection
- LLM02:2025 Sensitive Information Disclosure
- LLM03:2025 Supply Chain
- LLM04:2025 Data and Model Poisoning
- LLM05:2025 Improper Output Handling
- LLM06:2025 Excessive Agency
- LLM07:2025 System Prompt Leakage
- LLM08:2025 Vector and Embedding Weaknesses
- LLM09:2025 Misinformation
- LLM10:2025 Unbounded Consumption

### OWASP Top 10 for Agentic Applications for 2026
URL: https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/ (release date shown: December 9, 2025); PDF https://genai.owasp.org/download/52117/ (cover: "Version 2026", "December 2025"). Both fetched 2026-10-04. It EXISTS (OWASP GenAI Security Project, Agentic Security Initiative); note the official name says "for 2026" though released Dec 2025.
- ASI01: Agent Goal Hijack
- ASI02: Tool Misuse and Exploitation
- ASI03: Identity and Privilege Abuse
- ASI04: Agentic Supply Chain Vulnerabilities
- ASI05: Unexpected Code Execution (RCE)
- ASI06: Memory & Context Poisoning
- ASI07: Insecure Inter-Agent Communication
- ASI08: Cascading Failures
- ASI09: Human-Agent Trust Exploitation
- ASI10: Rogue Agents
- Relations stated in the PDF: ASI01 extends LLM01 to goal selection and planning ("Unlike LLM01:2025, which focuses on altering a ..."); "ASI02 builds on the mitigations of LLM06:2025 (Excessive Agency) by extending them to multi-step" agent workflows. ASI02 mitigation, verbatim: "Least Agency and Least Privilege for Tools. Define per-tool least-privilege profiles (scopes, maximum rate, and egress allowlists) ... e.g., read-only queries for databases, no send/delete rights for email summarizers". This is the OWASP wording of an action rail, and the egress allowlist is exactly what would have blocked the Adversa Grok chain (section 3a).

## Contradictions and cautions found (summary)
1. JailbreakBench's judge is Llama-3-70B, not Llama Guard (Llama Guard was the v1 judge; as a judge it had 60.9% FNR).
2. Adversa Grok: AES (AES-256-GCM + PBKDF2) and the exfiltrated data are confirmed; "about 40% success over 20 attempts" is NOT on the page; "11 weeks without a patch" is only derivable (June 3 report to August 19/20, no fix).
3. "CRC Monitor" is not a paper title: the paper is arXiv 2607.02510 "Online Safety Monitoring for LLMs" (Schirmer, Jazbec, Timans, Naesseth, Waldron, Nalisnick, 2 July 2026); CRC is one of two monitor variants (CRC, UCB). "Single-score" phrasing not found.
4. AILuminate v1.0 date: brief says Feb 2025; the paper is March/April 2025 and v1.0 launched Dec 2024 from memory (unconfirmed); Feb 2025 is likely v1.1 (French). Evaluator models and accuracy numbers are deliberately not published.
5. OR-Bench does not report guard models; no OR-Bench numbers on Llama Guard etc. exist in the primary paper.
6. AgentDojo no-defence GPT-4o ASR is 57.69% in AgentDojo's own table but 16.06% in MELON's runs; same benchmark, different attack and model snapshots.
7. 2504.11168 title changed between versions (v1 "Bypassing Prompt Injection and Jailbreak Detection in LLM Guardrails"; v3 "Bypassing LLM Guardrails: An Empirical Analysis of Evasion Attacks against Prompt Injection and Jailbreak Detection Systems").
8. ProtectAI v2 card: deepset/prompt-injections not listed, but 15 of 22 training sources are unnamed, so non-contamination cannot be asserted. The card also says the project is archived.
9. Knowledgator GLiNER-PII card: prose says base has highest F1 (80.99%); table says large (83.25%).
10. CaMeL: abstract 77% vs 84% undefended; a per-suite table in the HTML totals 62/96 (64.6%) for one model configuration; quote the abstract figure and name the model if using per-suite numbers.
