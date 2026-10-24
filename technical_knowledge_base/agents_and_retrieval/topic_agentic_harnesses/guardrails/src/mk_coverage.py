"""Write coverage.json: every fact of the old written page (src/live.md, fetched 2026-10-04, page last edited 2026-09-22),
where the HTML carries it (section id), a string that must be found in ../index.html, and any correction.
usage (from src/): python3 mk_coverage.py"""
import json, os, re, html
H = os.path.dirname(os.path.abspath(__file__))
page = html.unescape(re.sub(r'<[^>]+>', ' ', open(H + '/../index.html').read()))
page = re.sub(r'\s+', ' ', page)
C = [
 # furniture and resources
 ('"12 min read, +2h 25m resources"', 'header', 'Reading about', 'replaced by the new reading time and per-link times'),
 ('Best resource: NeMo Guardrails (about 40 min), five rail types and Colang', 't-more', 'NeMo Guardrails (NVIDIA)', ''),
 ('Best resource: Llama Guard model cards (about 15 min), MLCommons taxonomy', 't-more', 'Llama Guard and Prompt Guard model cards', ''),
 ('Best resource: Turing Post guardian models overview (about 20 min)', 't-more', 'Turing Post: guardian models overview', ''),
 ('Best resource: Granite Guardian repo (about 20 min), "strongest open models on prompt-injection and hallucination detection"', 't-more, rd-models', 'Granite Guardian (IBM)', 'corrected: IBM publishes no prompt-injection benchmark result (rd-models correction box)'),
 ('Best resource: OWASP Top 10 for LLM Applications (about 40 min)', 't-more, rd-post', 'OWASP Top 10 for LLM Applications 2025', 'now the 2025 list; the Dec 2025 agentic list added'),
 # three-stage pattern
 ('Seeded from Khalid\'s GDM project notes, generalised', 'footer', 'previous written version of this page', 'provenance noted in the footer'),
 ('Guardrails are runtime evals: classifiers and policies in the request path, trading latency and refusal rate against risk', 'rd-one', 'A guardrail is an evaluation that runs at request time', ''),
 ('One checkpoint cannot balance the trade-off for all risk classes; severity determines where you pay', 'rd-one, rd-why', 'severity determines where you pay the cost', ''),
 ('Pre-call: screen input before the model; jailbreak/injection, toxic prompts, out-of-scope, PII', 'rd-one, rd-pre', 'Before the call: input rails', ''),
 ('Blocking pre-call is cheapest: no generation cost, no model exposure', 'rd-pre', 'Blocking here is the cheapest outcome there is', ''),
 ('Fast small classifiers (86M to 2B) fit pre-call', 'rd-one, rd-pre', 'Encoder classifiers of 22M to 184M parameters', 'range updated: Prompt Guard 2 22M is the smallest; 0.6B to 2B guard models also used'),
 ('During-call: second threshold for borderline inputs (e.g. misinformation topics)', 'rd-during', 'During the call: dialog, tool and action rails', 'borderline second threshold now shown as strict/loose and cascades'),
 ('During-call: which tools an agent may call; topical rails; streamed-output monitoring that aborts generation', 'rd-during', 'Streaming rails: stopping an answer partway', ''),
 ('In agentic systems during-call is critical: tool-call approval, parameter validation, injection checks on tool-returned content', 'rd-during', 'In an agent it is the stage that matters most', ''),
 ('Post-call: hallucination/groundedness, policy violations in output, bias, PII/secret leakage', 'rd-post', 'After the call: output rails', ''),
 ('Post-call is most expensive (second model pass) and the only stage that catches generation-side failures', 'rd-post', 'the only stage that can catch failures that exist only in the generation', ''),
 ('Outcomes: block, regenerate, redact, annotate', 'rd-post', 'regenerate', ''),
 ('Each stage has its own precision/recall target, latency budget and eval set', 'rd-check, rd-eval', 'Give each stage a latency budget', ''),
 ('Pre-call optimises precision; post-call optimises recall on harms that matter', 'rd-why, rd-eval', 'Report per-category recall', 'stated as the two-error trade-off at each stage'),
 ('Attack corpora and benign false-positive sets in CI (Production eval engineering)', 'rd-eval, rd-check', 'Build both evaluation sets on day one', ''),
 ('Red-teaming tools: promptfoo scanner, garak, PyRIT', 'rd-eval', 'garak', ''),
 # architecture
 ('Where classification cannot reach, architecture has to; lethal trifecta', 'rd-arch', 'lethal trifecta', ''),
 ('Muse Spark 1.3: credentials outside the sandbox, token swapped as the request leaves the VM', 'rd-arch', 'The agent never sees real tokens', ''),
 ('Approvals as OS dialogs, not conversation messages', 'rd-arch', 'not via their conversation with Muse', ''),
 ('Browser sub-agent reads the accessibility tree, cannot execute JavaScript', 'rd-arch', 'accessibility tree snapshot', ''),
 ('Meta pays up to $300,000 for a valid report and $130,000 for a prompt injection; publishes no classifier accuracy', 'rd-arch', '$300,000', ''),
 ('A capability the agent does not have is the only rail with no false-negative rate', 'rd-arch', 'the only rail with no false-negative rate', ''),
 ('Agent-side architecture in Topic: agentic-harnesses', 'rd-arch, t-more', 'Topic: agentic-harnesses', ''),
 # frameworks
 ('NeMo Guardrails: five rail types (input, dialog, retrieval, execution, output), YAML plus Colang', 'rd-fw', 'Input, dialog, retrieval, execution (tools), output', ''),
 ('NeMo: self-hosted, integrates external guard models as actions, LangChain integration', 'rd-fw', 'Integrates external guards as actions', 'LangChain integration not re-checked for 2026; dropped as unremarkable'),
 ('NeMo trade-off: Colang is another language; dialog rails overkill for simple filtering', 'rd-fw', 'dialog rails are overkill', ''),
 ('Guardrails AI: Python-native validators hub, structured output, lighter than NeMo', 'rd-fw', 'Python-native and lighter than NeMo', 'hub shut down 25 Aug 2026; company acquired by Harvey'),
 ('LLM Guard (Protect AI): batteries-included scanners', 'rd-fw', 'Batteries-included scanners', 'last release May 2025; owner acquired'),
 ('Cloud-managed: Bedrock Guardrails, Azure AI Content Safety, Vertex safety filters; cloud baseline plus self-hosted rails', 'rd-fw', 'cloud baseline plus self-hosted rails', 'Vertex filters replaced by Google Model Armor in the table'),
 # guard models table
 ('Llama Guard 3/4: 1B/8B, Guard 4 12B multimodal, MLCommons-aligned, default baseline', 'rd-models', 'The default baseline', 'sizes corrected (11B-Vision added)'),
 ('Llama Prompt Guard 2: 86M/22M, injection/jailbreak only, every request', 'rd-models, rd-pre', 'Jailbreak and injection only; small enough for every request', ''),
 ('Granite Guardian: 5B/8B, leads on injection and hallucination, RAG risk labels', 'rd-models', 'Harm plus RAG risks', 'corrected in box'),
 ('Qwen3Guard: 0.6B/4B/8B, 119 languages, streaming variant', 'rd-models', '119 languages', ''),
 ('ShieldGemma: 2B (and 27B), latency play, policy-conditioned prompting', 'rd-models', 'One policy per call', 'corrected: 9B exists; ShieldGemma 2 is an image model'),
 ('WildGuard 7B: highest precision on benign sets', 'rd-models', 'as a live filter it added 0.5 points', 'corrected in box: no source ranks it first'),
 ('NeMo/Aegis about 8B, tuned for NeMo', 'rd-models', 'tuned for the NeMo stack', 'Nemotron 3 and 3.5 Content Safety are 4B'),
 ('Ensemble, not single-model: fast first-pass gate plus larger classifier, third for a specific risk', 'rd-models', 'Ensembles, not single models', ''),
 ('No open model reliably strong across all categories; benchmark on own taxonomy; track false-refusal rate', 'rd-models', 'No open model is reliably strong across all categories', ''),
 # evaluation
 ('Per-category precision/recall on labelled attack and benign corpora', 'rd-eval', 'per-category recall on a labelled attack set', ''),
 ('Public benchmarks: AILuminate, HarmBench, JailbreakBench; injection suites for RAG/tools', 'rd-eval', 'AILuminate', ''),
 ('Drift monitoring: attack distributions shift fastest', 'rd-eval', 'attack distributions drift faster than any other input', ''),
 ('Staged-system metric: end-to-end leak rate, attackers need one path', 'rd-eval', 'end-to-end leak rate', ''),
 ('Groundedness classifier is a judge, needs human-agreement number (LLM-as-judge)', 'rd-post, rd-eval', 'needs a human-agreement number', ''),
 ('Threshold: conformal risk control, CRC Monitor (Schirmer, Jazbec et al. 2026), single score, distribution-free bound', 'rd-eval', 'Online Safety Monitoring for LLMs', 'corrected in box: title, what is controlled, "single-score" not in the paper'),
 ('Bound holds while live traffic resembles calibration; recalibration frequency is the real parameter', 'rd-eval', 'recalibration frequency becomes the real operating parameter', ''),
 # failure modes
 ('MOLE: stated refusal did not predict declining; 72% of 39 completed most harmful objectives', 'rd-during', 'Correction: what MOLE measured', 'corrected (shared with the parent page)'),
 ('MOLE: 150 AI-operated accounts, nine stateful services, 30 simulated workdays; scores the monitor', 'rd-during (via MOLE page link)', 'MOLE paper page', 'setting details live on the MOLE paper page; only the corrected results are repeated'),
 ('Post-call rail on response string measures the wrong variable; classify tool calls and state (during-call)', 'rd-during, rd-fail', 'measures the wrong variable', ''),
 ('Best monitors missed close to half of completed harm; budget recall below per-category benchmark', 'rd-during, rd-fail', '24 of 45 completed harms', ''),
 ('Benchmark-guided search improved a mid-tier monitor by 49 to 64%', 'rd-during', '49% to 64%', 'qualified: budget-AUC, resting on 14 positives'),
 ('Guard-model injection: adversarial suffixes, multilingual/obfuscated payloads; ensemble diversity and normalisation', 'rd-fail, rd-pre', 'normalise before you classify', ''),
 ('Adversa cryptographic context injection against Grok: AES payload, decrypted in Python runtime, exfiltrates history, name, location, tier', 'rd-arch', 'AES-256-GCM', ''),
 ('Adversa: roughly 40% success over 20 attempts', 'rd-arch', 'Unconfirmed: "about 40% success over 20 attempts"', 'not in the primary source; kept as unconfirmed'),
 ('Code interpreter is a decoder the input rails cannot see through; out of reach of pre-call', 'rd-arch', 'the interpreter is a decoder the input rail cannot see through', ''),
 ('11 weeks from disclosure without a patch', 'rd-arch', 'about 11 weeks later', 'dated: reported 3 Jun, reproducible 19 Aug'),
 ('Adversa link (about 10 min)', 't-more', 'Adversa AI: cryptographic context injection against Grok', ''),
 ('Over-blocking is the main quality cost; refusal cascades destroy quality silently; benign regression set', 'rd-eval, rd-fail', 'Over-blocking that nobody measures', ''),
 ('Latency stacking: three serial stages add 500 ms+; parallel with prefill, streaming post-call, sampled/async heavy checks with kill switches', 'rd-lat, rd-fail', 'Latency stacking', 'sourced: NVIDIA 0.91 s to 1.44 s'),
 ('Taxonomy mismatch: measure against your policy labels', 'rd-fail', 'Taxonomy and definition mismatch', ''),
 # checklist
 ('Checklist 1: write the policy first', 'rd-check', 'Write the policy first', ''),
 ('Checklist 2: stage placement and latency budget per stage', 'rd-check', 'Place each check where its risk becomes visible', ''),
 ('Checklist 3: two guard models, fast gate first; normalise inputs', 'rd-check', 'fast gate first', ''),
 ('Checklist 4: both eval corpora on day one', 'rd-check', 'Build both evaluation sets on day one', ''),
 ('Checklist 5: guard metrics in regression gates; version bump is a promotion event', 'rd-check', 'is a promotion event', ''),
 ('Checklist 6: log every block with stage and category; weekly review', 'rd-check', 'Log every block and flag', ''),
 ('Checklist 7: fail-open vs fail-closed per stage', 'rd-check, rd-fail', 'fail-open or fail-closed per stage', ''),
 ('Checklist 8: assume a path is found; credentials outside runtime; approvals through unwritable channel; withhold capabilities', 'rd-check', 'Assume one path through the rails will be found', ''),
]
out = []; miss = 0
for fact, where, find, note in C:
    f = find in page
    miss += not f
    out.append(dict(fact=fact, where=where, find=find, found=f, note=note))
json.dump(dict(source='src/live.md (old page, last edited 2026-09-22)', items=out, found=len(C) - miss, total=len(C)), open(H + '/coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage', len(C) - miss, 'of', len(C)); [print('  MISSING', o['find']) for o in out if not o['found']]
