"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (the Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised). Numbers drawn by script are checked through
the data they come from (tables.json, recompute.json and the traces are embedded in the page).
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R, S, T, N = 'The paper tab', 'Replay the traces tab', "Tables tab", 'Then and now tab'
C = [
 # header
 ('Reading time line "10 min read, +~2h 25m resources"', 'dropped: replaced by the build-computed reading time and resources total (more resources now)', ['min to read', 'of resources']),
 ('Authors: Yao, Zhao, Yu, Du, Shafran, Narasimhan, Cao (Princeton NLP, Google Brain)', R + ', headline card', ['Shunyu Yao', 'Jeffrey Zhao', 'Dian Yu', 'Nan Du', 'Izhak Shafran', 'Karthik Narasimhan', 'Yuan Cao', 'Princeton University', 'Google Research, Brain team']),
 ('Date: October 2022 (arXiv 2210.03629; ICLR 2023)', R + ', headline card', ['October 2022 (arXiv v1, 6 October 2022)', 'ICLR 2023', 'arXiv 2210.03629']),
 ('Link arXiv (~45 min)', 'card and Further reading', ['https://arxiv.org/abs/2210.03629', '(45 min)']),
 ('Link project page + code (~20 min)', 'Further reading: project page (10 min) and the code repository (20 min) as separate entries', ['https://react-lm.github.io/', 'https://github.com/ysymyth/ReAct', '(20 min)']),
 # resources
 ('Google Research blog (~10 min): authors\' short-form summary with key figures', 'Further reading', ['https://research.google/blog/react-synergizing-reasoning-and-acting-in-language-models/', "the authors' own short-form summary with the key figures"]),
 ('Prompting Guide (~15 min): prompt format walkthrough, worked HotpotQA examples, LangChain reproduction', 'Further reading', ['https://www.promptingguide.ai/techniques/react', 'worked HotpotQA examples and a LangChain reproduction', '(15 min)']),
 ('Simon Willison Python ReAct pattern (~10 min): loop in ~40 lines; parse-act-append loop around a prompt', 'Further reading', ['https://til.simonwillison.net/llms/python-react-pattern', 'about 40 lines', 'parse, act, append loop around a prompt']),
 ('Lilian Weng LLM Powered Autonomous Agents (~45 min): ReAct within the 2023 agent design space with Reflexion', 'Further reading', ['https://lilianweng.github.io/posts/2023-06-23-agent/', 'alongside Reflexion and friends']),
 # problem
 ('CoT can reason step by step but is a static black box, reasons over internal representations, cannot look anything up', R + ', Problem', ['a static black box', 'cannot look anything up']),
 ('CoT hallucinates facts and propagates early errors', R + ', Problem; replay CoT mode', ['hallucinates facts and propagates early errors']),
 ('Action-generation work WebGPT, SayCan, Inner Monologue: no reasoning, or reasoning limited to restating observations; WebGPT needed imitation/RL training', R + ', Problem', ['WebGPT', 'SayCan', 'Inner Monologue', 'only restates facts about the current state', 'imitation and reinforcement learning']),
 ('Nobody had shown free-form reasoning and actions interleaved in one loop, each improving the other, with only few-shot prompting', R + ', Problem "The question"', ['interleaved in one loop, each improving the other, with nothing but a few-shot prompt']),
 # method
 ('Augment action space A to A U L; a thought does not touch the environment, returns no observation, only appends to context', R + ', Idea (equation); replay captions', ['A ∪ L', 'returns no observation', 'returns no observation:', 'appends it']),
 ('Trajectory: interleaved thought -> action -> observation; model decides when to think and when to act', R + ', Idea', ['The model decides for itself when to think and when to act']),
 ('Frozen PaLM-540B prompted with handful of human-written exemplar trajectories; no training, no ad-hoc format engineering', R + ', Idea and setup', ['one frozen model, PaLM-540B, prompted', 'No ad-hoc format choice, thought design, or example selection is used']),
 ('Knowledge tasks: dense thoughts, alternating thought/action every step', R + ', Idea (dense or sparse)', ['"dense" thought']),
 ('Wikipedia API: search[entity] first 5 sentences or top-5 similar titles; lookup[string] Ctrl-F next sentence; finish[answer]', R + ', setup', ['first 5 sentences', 'top-5 similar titles', 'like Ctrl+F', 'finish[answer]']),
 ('Action space deliberately minimal', R + ', setup "A deliberately weak tool"', ['A deliberately weak tool', 'significantly weaker than state-of-the-art lexical or neural retrievers']),
 ('Thoughts decompose, extract facts, commonsense/arithmetic, reformulate searches, synthesise the answer', R + ', setup Prompts', ['decompose the question', 'reformulate searches and synthesise the answer']),
 ('6 exemplars HotpotQA, 3 FEVER; question-only, no gold paragraphs', R + ', setup', ['6 HotpotQA and 3 FEVER training questions', '"question-only"', 'no supporting paragraphs']),
 ('Decision tasks (ALFWorld, WebShop): sparse thoughts where useful (goal decomposition, subgoal tracking, commonsense locations, what to buy); trajectories 50+ steps', R + ', Idea and Decision-making; replay', ['places thoughts sparsely', 'can run past 50 actions', 'track subgoals']),
 ('Ablation baselines by deleting parts: Standard, CoT, CoT-SC 21 samples, Act', R + ', setup Baselines by deletion', ['Baselines by deletion', 'samples 21 CoT trajectories at temperature 0.7', 'Act:']),
 ('All prompts from same trajectories so comparisons isolate what interleaved thinking adds', R + ', setup', ['so a comparison isolates exactly what was deleted']),
 ('ReAct + CoT-SC back-off: ReAct -> CoT-SC after 7/5 steps; CoT-SC -> ReAct when majority weak', R + ', setup Combining', ['within 7 steps (HotpotQA) or 5 (FEVER)', 'fewer than n /2 times']),
 ('Fine-tuning preview: 3,000 correct ReAct trajectories bootstrapped from PaLM-540B (STaR-style) to fine-tune PaLM-8B/62B', R + ', setup Fine-tuning', ['3,000 trajectories with correct answers', 'STaR', 'PaLM-8B and PaLM-62B']),
 # results
 ('HotpotQA EM: ReAct 27.4, Act 25.7, CoT 29.4, CoT-SC 33.4; ReAct trails CoT', R + ', Results (predict question); Tables tab', ['29.4 exact match against 27.4', '27.4 against 25.7']),
 ('ReAct -> CoT-SC 35.1 best prompting on HotpotQA', R + ', Results', ['ReAct → CoT-SC at 35.1']),
 ('FEVER: ReAct 60.9 beats CoT 56.3; CoT-SC -> ReAct 64.6', R + ', Results', ['ReAct leads 60.9 to 56.3', 'CoT-SC → ReAct at 64.6']),
 ('Failure analysis on 200 hand-labelled HotpotQA trajectories', R + ', Results', ['200 in all, and labelled them by hand']),
 ('Hallucination causes 56% of CoT failures; 14% of CoT successes false positives vs 6% ReAct', R + ', Results; Tables tab Table 2', ['Hallucination causes 56% of CoT\'s failures', '14% of CoT\'s "successes" are false positives', 'against 6% for ReAct']),
 ('ReAct failures dominated by reasoning loops (47%) and uninformative search (23%)', R + ', Results (corrected: 47% is all reasoning errors, loops included)', ['mostly reasoning errors', '(47%)', 'cannot jump out of the loop', '23% of ReAct\'s failures']),
 ('Grounding buys factuality at the cost of reasoning flexibility', R + ', Results', ['an expected trade-off between factuality and flexibility']),
 ('Finetuning flips the ranking: prompted ReAct worst of four on PaLM-8B; finetuned ReAct best', R + ', Fine-tuning (predict question, Figure 3 rebuilt)', ['Fine-tuning flips the ranking', 'becomes the best of the four']),
 ('Finetuned PaLM-62B beats all 540B prompting baselines', R + ', Fine-tuning (corrected: beats the four Figure 3 methods, not CoT-SC or the combinations)', ['beats all four prompted PaLM-540B methods in the figure', 'does not beat 540B CoT-SC (33.4)']),
 ('Acting is a generalisable skill worth training; memorising facts (Standard/CoT finetuning) is not', R + ', Fine-tuning', ['a more generalizable skill', 'memorise (possibly hallucinated) facts']),
 ('ALFWorld: best-of-6 ReAct 71% vs best Act 45% vs BUTLER 37% (IL on 10^5 expert trajectories per task)', R + ', Decision-making; headline card; Tables tab', ['the best ReAct trial reaches 71% against 45% for the best Act trial and 37% for BUTLER', 'imitates 10 5 expert trajectories per task type']),
 ('Worst ReAct trial (48%) beats the best of both baselines', R + ', Decision-making predict question', ['the worst ReAct trial scored 48%']),
 ('ReAct-IM (thoughts restricted to restating observations) 53%; free-form reasoning matters', R + ', Decision-making', ['ReAct wins 71% to 53%', 'ReAct-IM']),
 ('WebShop 500 test instructions: one-shot ReAct 40.0% vs Act 30.1%, IL 29.1%, IL+RL 28.7%; human experts 59.6%', R + ', Decision-making; headline card; Tables tab', ['ReAct reaches 40.0%', '30.1% against 29.1% and 28.7%', 'Human experts reach 59.6%', '500 test instructions']),
 ('+10% absolute over trained prior best from a single in-context example', R + ', Decision-making', ['"an absolute 10% improvement over the previous best success rate"', 'ReAct gets one exemplar']),
 ('Abstract: +34% absolute ALFWorld, +10% WebShop with one or two in-context examples', R + ', Decision-making', ['"34% and 10%"', '71 − 37']),
 ('All prompting far below supervised SoTA (HotpotQA 67.5, FEVER 89.5); case for finetuning', R + ', Results', ['67.5 on HotpotQA and 89.5 on FEVER', 'the case for fine-tuning']),
 # why it matters
 ('Ancestor of every modern agent loop: thought -> tool call -> observation appended, until finish', R + ', Why it matters', ['It is the template of the modern agent loop', 'Thought, tool call, observation, appended to the context and repeated until a finish action']),
 ('LangChain original AgentExecutor parsed Thought:/Action:/Action Input:', R + ', Why it matters; Then and now', ['LangChain\'s first agents', '"Thought: / Action: / Action Input: / Observation:"']),
 ('AutoGPT, Claude Code, OpenHands, Deep Research systems, Claude/OpenAI agent SDKs', R + ', Why it matters (AutoGPT, OpenHands, Claude Code, OpenAI Agents SDK, each sourced; Deep Research not named, the general claim kept)', ['AutoGPT', 'OpenHands', 'Claude Code', 'OpenAI Agents SDK']),
 ('Named the two directions: reason-to-act and act-to-reason', R + ', Idea and Why it matters', ['Reason to act:', 'Act to reason:', 'reason to act and act to reason']),
 ('2022 recipe brittle: parse failures, repetitive loops, token overhead', R + ', Why it matters; replay tab counters', ['The original was brittle', 'got stuck in the loops the paper documents', 'token overhead']),
 ('Structured function calling (OpenAI June 2023) eliminated the parsing layer', R + ', Why it matters; Then and now step 3', ['Structured function calling', '13 June 2023', 'removed the parsing layer']),
 ('Native tool-use training and multi-turn agentic post-training (Toolformer early sketch) baked loop into policy, no exemplars', R + ', Why it matters', ['Native tool-use training', 'Toolformer', 'no exemplar trajectories are needed']),
 ('Reasoning models with interleaved/extended thinking (o1/o3, DeepSeek-R1, Claude extended thinking with tool use) = dense-thought mode learned end to end', R + ', Why it matters; Then and now step 5 (o3, DeepSeek-R1, Claude 4, each sourced; o1 not named)', ['Reasoning models', 'o3', 'extended thinking with tool use', 'learned end to end']),
 ('Paper anticipated this: finetuning section, conclusion calls for multi-task training and RL', R + ', Why it matters', ['The paper anticipated this arc', 'multi-task training and reinforcement learning']),
 ('Reframed retrieval: model decides what to retrieve next; agentic/iterative retrieval vs fixed RAG', R + ', Why it matters', ['It reframed retrieval', 'iterative, agentic retrieval']),
 ('Evaluation style stuck: hand-labelled failure taxonomies and factuality-vs-flexibility trade-off', R + ', Why it matters', ['Its evaluation style stuck', 'standard vocabulary for debugging agent trajectories']),
 # connections
 ('Connection GPT-3 (2020-05): few-shot ICL paradigm pushed to interactive tasks', R + ' Connections; Further reading', ['https://app.notion.com/p/3c65c17b0d0d8193ac92c7648cfaca12', 'the few-shot in-context learning that ReAct pushes to interactive tasks']),
 ('Connection RAG (2020-05): fixed retrieve-then-generate; ReAct the iterative alternative agentic RAG descends from', R + ' Connections', ['https://app.notion.com/p/3c65c17b0d0d816c889decc342a7ad39', 'agentic RAG descends from']),
 ('Connection InstructGPT (2022-03): RLHF machinery that later trained tool use natively', R + ' Connections', ['https://app.notion.com/p/3c65c17b0d0d8180b958d8299996a063', 'trained tool use natively']),
 ('Connection DeepSeek-R1 (2025-01): RL-trained reasoning tokens; interleaved thinking + tool calls trained descendant', R + ' Connections', ['https://app.notion.com/p/3c65c17b0d0d813faca4f7a51eaa0c65', 'trained descendant of ReAct\'s thought channel']),
 ('Topics: agentic-frameworks, agentic-harnesses, rag-and-retrieval', R + ' Connections; Further reading', ['https://app.notion.com/p/3c65c17b0d0d81ab8432c54d65b7f8c7', 'https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb', 'https://app.notion.com/p/3c65c17b0d0d81b89145c37dfe8a3b0b']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
