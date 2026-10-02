"""Write parts/20_traces.js: the episodes the trace replay steps through, all from the paper.

  python3 mk_traces.py   (build.sh runs it)

Sources and how each was taken:
  - Figure 1 (Apple Remote question; ALFWorld pepper shaker), Figure 4 (the Mystere hotel question with an
    outdated label) and Figure 5 (the ALFWorld keychain task, before and after a human edits two thoughts)
    are images in the paper (SVG text drawn as glyph outlines), so their text is transcribed below by hand
    from the rendered figures, with the paper's own red and green highlights kept as markup. The "..."
    ellipses are the paper's: observations are truncated as printed.
  - Table 10 (WebShop, Act against ReAct) and Appendix D.1 (FEVER example 1951) are text in the arXiv HTML,
    so they are cut out of inputs/paper_v3.txt by this script, not retyped.
Markup inside text: [[g:...]] green (correct, grounded), [[r:...]] red (wrong or hallucinated),
[[s:...]] struck out by the human, [[u:...]] added by the human.
Roles: q task, t thought, a action, o observation, f final answer of a no-tool method, e elided steps.
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
TXT = open(os.path.join(HERE, 'inputs', 'paper_v3.txt'), encoding='utf-8').read()
RC = json.load(open(os.path.join(HERE, 'inputs', 'recompute.json')))
PW = RC['prompt_words']

def S(r, t, n='', c=''):
    return {'r': r, 't': t, 'n': n, 'c': c}

# ---------------- Figure 1 (1): HotpotQA, the Apple Remote question (transcribed) ----------------
Q1 = 'Aside from the Apple Remote, what other device can control the program Apple Remote was originally designed to interact with?'
apple = {
 'id': 'apple', 'name': 'HotpotQA: the Apple Remote question', 'src': 'Figure 1 (1)', 'at': 'S1.F1', 'env': 'Wikipedia API',
 'note': 'Transcribed from Figure 1; the paper prints the in-context exemplars separately (Appendix C.1), and observations are cut with "..." as printed.',
 'truth': 'The figure marks keyboard function keys as correct.',
 'modes': {
  'std': {'label': 'Standard', 'pw': PW['HotpotQA Standard (6 exemplars)'], 'ok': False, 'steps': [
    S('q', Q1, 'Question', 'The question goes in after six solved examples (question and answer only). There is no tool and no reasoning: the model answers in one go.'),
    S('f', '[[r:iPod]]', 'Answer', 'Wrong. With nothing to look up and no room to reason, the model guesses an Apple device.')]},
  'cot': {'label': 'CoT (reason only)', 'pw': PW['HotpotQA CoT'], 'ok': False, 'steps': [
    S('q', Q1, 'Question', 'Chain of thought: the exemplars show worked reasoning, still with no access to anything outside the model.'),
    S('t', "Let's think step by step. [[r:Apple Remote was originally designed to interact with Apple TV. Apple TV can be controlled by iPhone, iPad, and iPod Touch.]] So the answer is iPhone, iPad, and iPod Touch.", 'Thought',
      'The reasoning is well formed but its first fact is hallucinated (the remote was designed for Front Row, a program, not Apple TV), and every later step inherits it: error propagation.'),
    S('f', '[[r:iPhone, iPad, iPod Touch]]', 'Answer', 'Wrong, confidently. CoT has no way to check a fact, so a fluent chain on a false premise looks like a good answer.')]},
  'act': {'label': 'Act (act only)', 'pw': PW['HotpotQA Act'], 'ok': False, 'steps': [
    S('q', Q1, 'Question', 'Act only: the exemplars are the ReAct trajectories with every thought deleted. The model can search, but cannot think between steps.'),
    S('a', 'Search[Apple Remote]', 'Act 1', 'A sensible first search.'),
    S('o', 'The Apple Remote is a remote control ...', 'Obs 1', 'The environment returns the first sentences of the page.'),
    S('a', 'Search[Front Row]', 'Act 2', 'It does follow the trail to Front Row ...'),
    S('o', 'Could not find [Front Row]. Similar: ...', 'Obs 2', 'The exact title does not exist; the API suggests similar ones.'),
    S('a', 'Search[[[g:Front Row (software)]]]', 'Act 3', '... and even recovers from the failed search, finding the right page.'),
    S('o', 'Front Row is a discontinued media center software ...', 'Obs 3', 'The page that holds the answer is now in the context.'),
    S('a', 'Finish[[[r:yes]]]', 'Act 4', 'Wrong. It had the evidence but no step in which to put it together, so the final action is not even an answer of the right type. The paper\'s point: the mapping from context to the right action is too implicit without reasoning (Section 2).')]},
  'react': {'label': 'ReAct', 'pw': PW['HotpotQA ReAct'], 'ok': True, 'steps': [
    S('q', Q1, 'Question', 'ReAct: the same exemplars with the thoughts kept. Each step is Thought, Action, Observation, and the model writes the first two.'),
    S('t', 'I need to search Apple Remote and find the program it was originally designed to interact with.', 'Thought 1', 'A thought decomposes the question. It goes into the context and nothing is called: a thought is an action from the language space L that returns no observation.'),
    S('a', 'Search[Apple Remote]', 'Act 1', 'The action is parsed out of the text and sent to the Wikipedia API.'),
    S('o', 'The Apple Remote is a remote control introduced in October 2005 by Apple ... originally designed to control the [[g:Front Row media center]] program ...', 'Obs 1', 'Act to reason: the observation brings in a fact the model did not have.'),
    S('t', 'Apple Remote was originally designed to control the Front Row media center program. I need to search [[g:Front Row]] next and find what other device can control it.', 'Thought 2', 'The thought extracts the fact from the observation and plans the next search: reason to act.'),
    S('a', 'Search[Front Row]', 'Act 2', ''),
    S('o', "Could not find [Front Row]. Similar: ['Front Row Seat to Earth', 'Front Row Motorsports',' [[g:Front Row (software)]] ', ...]", 'Obs 2', 'The same dead end Act hit.'),
    S('t', 'Front Row is not found. I need to search [[g:Front Row (software)]] .', 'Thought 3', 'An exception handled in words: the thought reformulates the search.'),
    S('a', 'Search[[[g:Front Row (software)]] ]', 'Act 3', ''),
    S('o', 'Front Row is a discontinued media center software ...', 'Obs 3', ''),
    S('t', '[[g:Front Row (software) is controlled by an Apple Remote or the keyboard function keys.]] So the answer is keyboard function keys.', 'Thought 4', 'The step Act was missing: synthesise the answer from what was read.'),
    S('a', 'Finish[[[g:keyboard function keys]]]', 'Act 4', 'Correct, and every fact in the chain can be traced to an observation.')]},
 }}

# ---------------- Figure 4: HotpotQA, the Mystere hotel question (transcribed) ----------------
Q4 = 'How many rooms are in the hotel that is home to the Cirque du Soleil show Mystere?'
myst = {
 'id': 'myst', 'name': 'HotpotQA: an outdated label (Mystere)', 'src': 'Figure 4', 'at': 'A1.F4', 'env': 'Wikipedia API',
 'note': 'Transcribed from Figure 4 (Appendix A.2). The dataset label is 2,664; the hotel grew after HotpotQA was built, so exact match scores ReAct\'s up-to-date answer as wrong.',
 'truth': 'HotpotQA label: 2,664 (outdated). The figure marks 3,104 as the up-to-date answer.',
 'modes': {
  'std': {'label': 'Standard', 'pw': PW['HotpotQA Standard (6 exemplars)'], 'ok': False, 'steps': [
    S('q', Q4, 'Question', 'The label in the dataset is 2,664, which the paper marks as outdated.'),
    S('f', '[[r:3,000]]', 'Answer', 'A round guess.')]},
  'cot': {'label': 'CoT (reason only)', 'pw': PW['HotpotQA CoT'], 'ok': False, 'steps': [
    S('q', Q4, 'Question', ''),
    S('t', "Let's think step by step. The hotel that is home to the Cirque du Soleil show Mystere is Treasure Island. [[r:Treasure Island has 2,885 rooms, so the answer is 2,885.]]", 'Thought', 'The hotel is right; the room count is invented.'),
    S('f', '[[r:2,885]]', 'Answer', 'Wrong against both the old label and the current figure.')]},
  'act': {'label': 'Act (act only)', 'pw': PW['HotpotQA Act'], 'ok': False, 'steps': [
    S('q', Q4, 'Question', ''),
    S('a', 'Search[Cirque du Soleil ]', 'Act 1', ''),
    S('o', 'Cirque du Soleil is a Canadian entertainment company...', 'Obs 1', ''),
    S('a', 'Lookup[Mystere]', 'Act 2', ''),
    S('o', 'No more results', 'Obs 2', ''),
    S('a', 'Search[Mystere (Cirque du Soleil show) ]', 'Act 3', ''),
    S('o', 'Could not find...', 'Obs 3', ''),
    S('a', 'Search[[[g:Mystere (Cirque du Soleil)]]]', 'Act 4', 'It reaches the right page ...'),
    S('o', 'Mystère (my-steer) is one of six...', 'Obs 4', ''),
    S('a', '[[r:Lookup[Treasure Island Hotel and Casino]]]', 'Act 5', '... then looks for the hotel inside the show\'s page instead of searching for the hotel, and runs out of steps.'),
    S('e', '......(end without answer)', '', 'No answer at all.')]},
  'react': {'label': 'ReAct', 'pw': PW['HotpotQA ReAct'], 'ok': True, 'steps': [
    S('q', Q4, 'Question', ''),
    S('t', 'I need to search Cirque du Soleil show Mystere, find the hotel it is in, then find the number of rooms in the hotel.', 'Thought 1', 'A three-hop plan.'),
    S('a', 'Search[Cirque du Soleil show Mystere ]', 'Act 1', ''),
    S('o', "Could not find Cirque du Soleil show Mystere. Similar: ['Cirque du Soleil' ...", 'Obs 1', ''),
    S('t', '[[g:To find the hotel, I can search Mystere (Cirque du Soleil)]].', 'Thought 2', 'Search reformulated in words.'),
    S('a', 'Search[Mystere (Cirque du Soleil) ]', 'Act 2', ''),
    S('o', 'Mystère (my-steer) is ... Held in a custom theatre at the Treasure Island Hotel and Casino ...', 'Obs 2', ''),
    S('t', 'Mystere is held in a custom theatre at the Treasure Island Hotel and Casino. So I need to search Treasure Island Hotel and Casino next and find the number of rooms in the hotel.', 'Thought 3', 'The step Act got wrong: search the hotel, not look it up in the show\'s page.'),
    S('a', 'Search[[[g:Treasure Island Hotel and Casino]] ]', 'Act 3', ''),
    S('o', 'Treasure Island Hotel and Casino ... with 2,884 rooms and 220 suites ...', 'Obs 3', 'Live Wikipedia, so today\'s number.'),
    S('t', '[[g:Treasure Island Hotel and Casino has 2,884 rooms and 220 suites. So the answer is 3,104.]]', 'Thought 4', 'Arithmetic in a thought: 2,884 + 220 = 3,104.'),
    S('a', 'Finish[3,104]', 'Act 4', 'Up to date, and scored wrong by exact match against the 2,664 label. Errors like this sit in Table 2\'s label-ambiguity row (29% of ReAct\'s failures).')]},
 }}

# ---------------- Figure 1 (2): ALFWorld, pepper shaker (transcribed) ----------------
T2 = 'You are in the middle of a room. Looking quickly around you, you see a cabinet 6, a cabinet 1, a coffee machine 1, a countertop 3, a stove burner 1, and a toaster 1. Your task is to: Put some pepper shaker on a drawer.'
pepper = {
 'id': 'pepper', 'name': 'ALFWorld: put a pepper shaker in a drawer', 'src': 'Figure 1 (2)', 'at': 'S1.F1', 'env': 'ALFWorld text game',
 'note': 'Transcribed from Figure 1. In ALFWorld a thought is itself an action, think[...], and the environment answers "OK." (the released code); the figure leaves those replies out, and so does this replay. Steps 3 to 5 of the ReAct run are summarised in the figure, as here.',
 'truth': 'Success means the environment confirms the object is in place.',
 'modes': {
  'act': {'label': 'Act (act only)', 'ok': False, 'steps': [
    S('q', T2, 'Task', 'Act only, with two exemplar games of the same task type in the prompt, thoughts deleted.'),
    S('a', 'Go to drawer 1', 'Act 1', 'It heads for the goal location before it has the object.'),
    S('o', 'The drawer 1 is closed.', 'Obs 1', ''),
    S('a', 'Open drawer 1', 'Act 2', ''),
    S('o', 'You open the drawer 1. The drawer 1 is open. In it, you see a dishsponge 2, and a spoon 1.', 'Obs 2', ''),
    S('a', 'Go to sinkbasin 1', 'Act 3', 'A sink basin is not even in the room description.'),
    S('o', 'On the sinkbasin 1, you see a dishsponge 3, a spatula 1, and a spoon 2.', 'Obs 3', ''),
    S('a', 'Take peppershaker 1 from sinkbasin 1', 'Act 4', 'It tries to take an object it never saw: the context says there is no pepper shaker here (Section 2).'),
    S('o', '[[r:Nothing happens.]]', 'Obs 4', ''),
    S('a', '[[r:Take peppershaker 1 from sinkbasin 1]]', 'Act 5', 'And repeats it, losing track of the state.'),
    S('o', '[[r:Nothing happens.]]', 'Obs 5', 'Failure.')]},
  'react': {'label': 'ReAct', 'ok': True, 'steps': [
    S('q', T2, 'Task', 'ReAct: the same two exemplars with sparse thoughts kept. The model decides when to think.'),
    S('t', 'Think[First I need to find a pepper shaker...more likely to appear in cabinets (1-6), countertops (1-3), ... ]', 'Act 1', 'Commonsense in a thought: where pepper shakers usually are. This is what the ReAct-IM ablation removes.'),
    S('a', 'Go to cabinet 1', 'Act 2', ''),
    S('o', 'On the cabinet 1, you see a vase 2.', 'Obs 2', ''),
    S('e', '(Here the agent go to cabinet 1, then cabinet 2, 3, then countertop 1 and 2)', 'Acts 3 to 5', 'Systematic search, summarised in the figure.'),
    S('a', 'Go to countertop 3', 'Act 6', ''),
    S('o', 'On the countertop 3, you see a apple 1, a bread 1, ...... a pepper shaker 1, and a vase 3.', 'Obs 6', ''),
    S('a', 'Take pepper shaker 1 from countertop 3', 'Act 7', ''),
    S('o', 'You pick up the pepper shaker 1 from the countertop 3.', 'Obs 7', ''),
    S('t', 'Think[Now I find a pepper shaker 1. Next, I need to put it in/on drawer 1. ]', 'Act 8', 'A progress-tracking thought: subgoal done, next subgoal named.'),
    S('a', 'Go to drawer 1', 'Act 9', ''),
    S('o', 'Drawer 1 is closed.', 'Obs 9', ''),
    S('a', 'Open drawer 1', 'Act 10', ''),
    S('o', 'You open Drawer 1 ...', 'Obs 10', ''),
    S('a', 'Put pepper shaker 1 in/on drawer 1', 'Act 11', ''),
    S('o', '[[g:You put pepper shaker 1 in/on the drawer 1.]]', 'Obs 11', 'Success, with two thoughts in eleven actions: sparse thinking.')]},
 }}

# ---------------- Figure 5: ALFWorld, keychains, a human edits two thoughts (transcribed) ----------------
T5 = 'You are in the middle of a room. Looking quickly around you, you see a armchair 1, a cabinet 4, ... a cabinet 1, a drawer 5, ..., a drawer 1, a dresser 1, a garbagecan 1, a safe 1, a shelf 12, ..., a shelf 1, a sidetable 1, and a sofa 1. Your task is to: put two keychain in safe.'
key = {
 'id': 'keys', 'name': 'ALFWorld: a human edits two thoughts', 'src': 'Figure 5', 'at': 'A1.F5', 'env': 'ALFWorld text game',
 'note': 'Transcribed from Figure 5 (Appendix A.3). Both runs start from the same first 16 steps; the figure elides steps with "......", as here.',
 'truth': 'Success means both keychains end up in the safe.',
 'modes': {
  'react': {'label': 'ReAct as generated', 'ok': False, 'steps': [
    S('q', T5, 'Task', ''),
    S('e', '......', 'Acts 1 to 15', ''),
    S('o', 'You open the drawer 4. The drawer 4 is open. In it, you see a keychain 3, and a watch 2.', 'Obs 16', ''),
    S('t', '[[r:Think [Now I find the first keychain (3). Next, I need to take it. I can find the second keychain (2) later in drawer 4. ]]]', 'Act 17', 'A hallucinating thought: there is no keychain 2 in drawer 4, and the model has written a false belief into its own context.'),
    S('a', 'take keychain 3 from drawer 4', 'Act 18', ''),
    S('o', 'You pick up the keychain 3 from the drawer 4.', 'Obs 18', ''),
    S('e', '......', '', ''),
    S('a', 'put keychain 3 in/on safe 1', 'Act 22', ''),
    S('o', 'You put the keychain 3 in/on the safe 1.', 'Obs 22', ''),
    S('t', '[[r:Think [Now I put the first keychain in safe. Next, I need to find the second keychain. I can directly go to drawer 4. ]]]', 'Act 23', 'The false belief from Act 17 now steers the plan.'),
    S('a', 'go to drawer 4', 'Act 24', ''),
    S('o', 'The drawer 4 is open. In it, you see a watch 2.', 'Obs 24', 'The observation contradicts the belief ...'),
    S('t', '[[r:Think [Now I find the second keychain (2). Next, I need to take it.]]]', 'Act 25', '... and the model ignores it.'),
    S('a', 'take keychain 2 from drawer 4', 'Act 26', ''),
    S('o', '[[r:Nothing happens.]]', 'Obs 26', 'Failure.')]},
  'edit': {'label': 'After a human edits two thoughts', 'ok': True, 'steps': [
    S('q', T5, 'Task', 'Same task, same model. A person deletes one sentence of Act 17 and adds a hint to Act 23; everything else is generated.'),
    S('e', '......', 'Acts 1 to 15', ''),
    S('o', 'You open the drawer 4. The drawer 4 is open. In it, you see a keychain 3, and a watch 2.', 'Obs 16', ''),
    S('t', 'Think [Now I find the first keychain (3). Next, I need to take it. [[s:I can find the second keychain (2) later in drawer 4.]] ]', 'Act 17', 'Edit 1: the hallucinated sentence is struck out.'),
    S('a', 'take keychain 3 from drawer 4', 'Act 18', ''),
    S('o', 'You pick up the keychain 3 from the drawer 4.', 'Obs 18', ''),
    S('e', '......', '', ''),
    S('a', 'put keychain 3 in/on safe 1', 'Act 22', ''),
    S('o', 'You put the keychain 3 in/on the safe 1.', 'Obs 22', ''),
    S('t', 'Think [Now I put the first keychain in safe. Next, I need to find the second keychain[[u:, which is more likely to appear in dresser (1), garbagecan (1), safe (1), sidetable (1), sofa (1), shelf (1-12)]].]', 'Act 23', 'Edit 2: a commonsense hint is added.'),
    S('a', 'go to dresser 1', 'Act 24', 'The model follows the edited plan.'),
    S('o', 'On the dresser 1, you see a box 1, a creditcard 1, a keychain 2, a keychain 1, a laptop 1...', 'Obs 24', ''),
    S('t', 'Think [Now I find the second keychain (2). Next, I need to take it.]', 'Act 25', ''),
    S('a', 'take keychain 2 from dresser 1', 'Act 26', ''),
    S('o', '[[g:You pick up the keychain 2 from the dresser 1.]]', 'Obs 26', ''),
    S('t', 'Think [Now I take the second keychain (2). Next, I need to put it in/on safe 1.]', 'Act 27', ''),
    S('a', 'go to safe 1', 'Act 28', ''),
    S('o', 'The safe 1 is open. In it, you see a keychain 3, a statue 2, and a watch 3.', 'Obs 28', ''),
    S('a', 'put keychain 2 in/on safe 1', 'Act 29', ''),
    S('o', '[[g:You put the keychain 2 in/on the safe 1.]]', 'Obs 29', 'Success. Editing two thoughts replaced typing tens of actions; with Act there is no thought to edit (Appendix A.3).')]},
 }}

# ---------------- Table 10: WebShop (cut from the paper text) ----------------
a = TXT.index('Table 10: Example trajectories for Webshop'); b = TXT.index('Score: 1.0', a)
blk = TXT[a:b + len('Score: 1.0')]
instr = re.search(r'Instruction: (.*?)\t', blk).group(1).strip()
body = blk[blk.index('ReAct\t') + len('ReAct\t'):]
i2 = body.index('Action: search[', body.index('Action: search[') + 1)
def web_steps(chunk):
    chunk = chunk.split('Score:')[0]
    parts = re.split(r'\n\s*(?=Action:|Observation:)', '\n' + chunk.strip())
    out = []
    for p in parts:
        p = p.strip()
        if not p: continue
        if p.startswith('Action:'):
            t = re.sub(r'\s*\n\s*', ' ', p[len('Action:'):].strip())
            out.append(S('t' if t.startswith('think[') else 'a', t, 'Action'))
        else:
            t = p[len('Observation:'):].strip()
            t = re.sub(r'\n\s*\n', '\n', t)
            out.append(S('o', t, 'Observation'))
    return out
w_act, w_react = web_steps(body[:i2]), web_steps(body[i2:])
w_act[1]['c'] = 'The search results: three products, none matching every attribute.'
w_act[2]['c'] = 'Act clicks the first result: strawberry banana, pack of 100, $85, over the budget.'
w_act[-1]['c'] = 'It buys it. Score 0.125: few of the wanted attributes are covered.'
for s in w_react:
    if s['r'] == 't' and 'not apple cinnamon' in s['t']: s['c'] = 'A thought checks every result against the instruction before clicking: this is the "bridge between noisy observations and actions" of Section 4.'
    if s['r'] == 't' and 'seems good to buy' in s['t']: s['c'] = 'A thought picks the options that match: apple cinnamon, pack of 16.'
w_react[-1]['c'] = 'Score 1.0: every attribute matched.'
web = {'id': 'web', 'name': 'WebShop: freeze-dried banana chips', 'src': 'Table 10', 'at': 'A4.T10', 'env': 'WebShop',
       'note': 'Cut from Table 10 of the paper text by mk_traces.py. In WebShop the thought is an action, think[...], answered "OK."; the table omits the observation after Buy Now.',
       'truth': 'Score: share of the wanted attributes the bought product covers (Act 0.125, ReAct 1.0).',
       'modes': {'act': {'label': 'Act (act only)', 'ok': False, 'steps': [S('q', 'Instruction: ' + instr, 'Instruction', 'One exemplar in the prompt (Table 6), thoughts deleted.')] + w_act},
                 'react': {'label': 'ReAct', 'ok': True, 'steps': [S('q', 'Instruction: ' + instr, 'Instruction', 'The same exemplar with its two thoughts kept.')] + w_react}}}
web['modes']['act']['steps'][-1]['t'] += ''

# ---------------- Appendix D.1: FEVER example 1951 (cut from the paper text) ----------------
a = TXT.index('Example 1951 (gt: REFUTES)'); b = TXT.index('Example 3208', a)
blk = TXT[a:b]
def fever(name):
    i = blk.index('\n' + name + '\n'); j = min([blk.index('\n' + n + '\n', i + 1) for n in ('ReAct', 'Act', 'CoT') if ('\n' + n + '\n') in blk[i + 1:]] or [len(blk)])
    L = [l.strip() for l in blk[i:j].split('\n') if l.strip()][1:]
    out, k = [], 0
    while k < len(L):
        h = L[k].rstrip(':').lstrip(': ').strip(); v = L[k + 1].lstrip(': ').strip() if k + 1 < len(L) else ''
        role = {'Claim': 'q', 'Thought': 't', 'Action': 'a', 'Observation': 'o', 'Answer': 'f'}[re.sub(r'\s*\d+$', '', h)]
        out.append(S(role, v, h)); k += 2
    return out
fv_react, fv_act, fv_cot = fever('ReAct'), fever('Act'), fever('CoT')
fv_react[-2]['c'] = 'ReAct finds nothing that says Soyuz was American, and says so: NOT ENOUGH INFO. Wrong against the label (REFUTES), but not invented.'
fv_cot[-1]['c'] = 'CoT reasons its way from true facts (Russia, NASA, the space station) to a false verdict: SUPPORTS.'
fv_act[-2]['c'] = 'Act also answers NOT ENOUGH INFO after one search.'
soyuz = {'id': 'soyuz', 'name': 'FEVER: was Soyuz part of the American space program?', 'src': 'Appendix D.1', 'at': 'A4.SS1', 'env': 'Wikipedia API',
         'note': 'Cut from Appendix D.1 by mk_traces.py; the paper omits the search results ("Search results are omitted to space").',
         'truth': 'Gold label: REFUTES. No method gets it right; they fail differently.',
         'modes': {'cot': {'label': 'CoT (reason only)', 'pw': PW['FEVER CoT'], 'ok': False, 'steps': fv_cot},
                   'act': {'label': 'Act (act only)', 'pw': PW['FEVER Act'], 'ok': False, 'steps': fv_act},
                   'react': {'label': 'ReAct', 'pw': PW['FEVER ReAct'], 'ok': False, 'steps': fv_react}}}


# ---------------- Appendix E.1: one example per success and failure mode (cut from the paper text) ----------------
a = TXT.index('E.1 Success and Failure Modes Analysis'); blk = TXT[a:]
heads = ['Success: True positive', 'Success: False positive', 'Failure: Reasoning error', 'Failure: Search error', 'Failure: Hallucination', 'Failure: Label ambiguity']
E1 = {}
for k, h in enumerate(heads):
    i = blk.index('\n' + h + '\n'); j = blk.index('\n' + heads[k + 1] + '\n') if k + 1 < len(heads) else len(blk)
    L = [l.strip() for l in blk[i + len(h) + 2:j].split('\n') if l.strip()]
    ex, cur = {}, None
    m = 0
    while m < len(L):
        l = L[m]
        if l in ('ReAct', 'CoT'): cur = l; ex[cur] = []; m += 1; continue
        if l.endswith(':') and m + 1 < len(L) and L[m + 1] not in ('ReAct', 'CoT'):
            ex[cur].append(l + ' ' + L[m + 1]); m += 2
        else:
            ex[cur].append(l); m += 1
    E1[h] = ex

EP = [apple, myst, pepper, key, web, soyuz]
for e in EP:
    for m in e['modes'].values():
        for s in m['steps']:
            assert '\u2014' not in s['t']
open(os.path.join(HERE, 'parts', '20_traces.js'), 'w', encoding='utf-8').write(
    '// Generated by mk_traces.py: the episodes of the trace replay (see that script for sources).\nwindow.TRACES=' + json.dumps(EP, ensure_ascii=False, separators=(',', ':')) + ';\nwindow.E1=' + json.dumps(E1, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('mk_traces:', ', '.join('%s %s' % (e['id'], '/'.join('%s:%d' % (k, len(m['steps'])) for k, m in e['modes'].items())) for e in EP))
