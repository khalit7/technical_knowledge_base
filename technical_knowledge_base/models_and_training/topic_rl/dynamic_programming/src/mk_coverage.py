#!/usr/bin/env python3
"""Write coverage.json: every fact in live.md (the old Dynamic programming page) and every RL-foundations fact the
Topic: rl root moved here (../../src/coverage_rl_foundations.md, rows marked DP), with where index.html carries it
(a phrase that must appear in the page text) or why it was dropped. Run from src/."""
import json, re, html
s = open('../index.html').read()
t = html.unescape(re.sub(r'<[^>]+>', ' ', re.sub(r'<script.*?</script>|<style.*?</style>', ' ', s, flags=re.S)))
t = re.sub(r'\s+', ' ', t)
js = s  # some phrases live in the lab's script strings
L = 'live.md'
F = 'live_rl_foundations.md (root, moved to DP)'
C = [
 # ---- live.md: header and framing
 (L, "Embed of the old interactive HTML and '17 min read, +2h 25m resources'", "Superseded: the page itself is the interactive HTML; header gives the new reading time and resources", "Reading tab about"),
 (L, "DP computes value functions and optimal policies when the full model (P(s'|s,a), R(s,a)) is known", "Reading, One screen", "when the full model of the environment is known"),
 (L, "Nothing is learned from interaction; DP is model-based planning, not learning", "Reading, One screen", "model-based planning"),
 (L, "Bellman's idea: long-horizon problem breaks into one-step pieces", "Reading, One screen", "breaks into one-step pieces"),
 (L, "A backup is the one-line computation applied to every state; each sweep pushes reward information one step back", "Reading, One screen", "pushes reward information one more step back"),
 (L, "DP is the ideal every model-free method approximates (MC, TD, SARSA, Q-learning replace the expectation with one sample)", "Reading, One screen", "ideal every model-free method approximates"),
 (L, "The DP backup is the template for every learning target (TD target, DQN target, PPO value target)", "Reading, One screen", "template for every learning target"),
 (L, "Prediction (policy evaluation) and control (policy iteration, value iteration); model-free counterparts on Model-free page", "Reading, One screen", "Their model-free counterparts, SARSA and Q-learning"),
 # ---- definitions
 (L, "MDP tuple (S, A, P, R, gamma), gamma in [0,1]", "Reading, section 2", "Markov decision process (MDP)"),
 (L, "Markov property makes the one-step recursion valid", "Reading, section 1", "Markov property is what makes DP"),
 (L, "Link to RL foundations page for vocabulary", "Superseded: RL foundations was folded into Topic: rl and its depth into this page (sections 1 to 4)", "MDP foundations they rest on"),
 (L, "Policy pi(a|s); deterministic pi(s)", "Reading, section 2", "a deterministic policy picks one action"),
 (L, "Return G_t", "Reading, section 2", "the total discounted reward from step"),
 (L, "V_pi and Q_pi definitions", "Reading, section 3", "the state value"),
 (L, "One-step lookahead Q = R + gamma sum P V, the step that needs the model", "Reading, section 3", "the step that needs the model"),
 (L, "V* = max_pi V_pi; optimal policy achieves it in every state; every finite MDP has a deterministic optimal policy", "Reading, section 3", "there is always a deterministic one"),
 (L, "Bellman expectation equation for V_pi", "Reading, section 3", "Bellman expectation equations"),
 (L, "Bellman optimality equation for V*", "Reading, section 3", "Bellman optimality equations"),
 (L, "Symbol list (s, a, s', pi, R, P, gamma, bracket = lookahead value)", "Reading, section 3 formula boxes", "the one-step lookahead value of action"),
 (L, "Expectation equation is linear; V_pi = (I - gamma P_pi)^-1 R_pi; cost order n^3", "Reading, sections 3 and 6", "O( n ³) for n states"),
 (L, "Optimality equation nonlinear, no closed form; DP solves both by iteration", "Reading, section 3", "nonlinear"),
 (L, "Backup = one application of the RHS to one state", "Reading, section 5", "one application of the right-hand side"),
 (L, "Sweep = back up every state once", "Reading, section 5", "backs up every state once"),
 (L, "Synchronous keeps two arrays; in-place overwrites; in-place usually faster; order matters (S&B ch 4)", "Reading, section 5", "the order in which states are swept matters"),
 # ---- policy evaluation
 (L, "Iterative policy evaluation update rule V_{k+1}", "Reading, section 6", "Policy evaluation: the prediction problem"),
 (L, "Step 1: start arbitrary (zeros), terminals 0", "Reading, section 6", "Terminal states have value 0 and stay there"),
 (L, "Step 2: one-step lookahead per action weighted by probability", "Reading, section 6", "look one step ahead"),
 (L, "Step 3: policy-weighted average", "Reading, section 6", "policy-weighted average of those lookahead values"),
 (L, "Step 4: repeat until max change below theta", "Reading, section 6", "falls below a small threshold"),
 (L, "Convergence: gamma-contraction, unique fixed point from any start", "Reading, section 6", "converges to the unique"),
 (L, "gamma = 1: needs every state to reach a terminal under pi", "Reading, section 6", "convergence needs every state to reach a terminal state eventually"),
 # ---- policy improvement
 (L, "Greedy improvement pi'(s) = argmax_a Q_pi(s,a)", "Reading, section 7", "acting greedily with respect to it"),
 (L, "Policy improvement theorem and its argument", "Reading, section 7", "The policy improvement theorem"),
 (L, "Greedy policy satisfies the premise automatically", "Reading, section 7", "satisfies the premise automatically"),
 (L, "No change under greedy improvement means the Bellman optimality equation holds: optimal", "Reading, section 7", "which is exactly the Bellman optimality equation"),
 # ---- policy iteration
 (L, "Policy iteration: alternate evaluation and improvement until the policy stops changing; 4 steps", "Reading, section 8", "Alternate the two steps until the policy stops changing"),
 (L, "Termination: finitely many deterministic policies (|A|^|S|), monotone improvement, no repeats", "Reading, section 8", "no policy repeats"),
 (L, "Few outer iterations; policy often optimal before values converge", "Reading, section 8", "often becomes optimal long before its values have converged"),
 (L, "Explicit policy throughout: the policy-flavoured member", "Reading, section 12 table", "Policy-based: an explicit policy is stored"),
 (L, "Modified policy iteration and GPI", "Reading, section 8", "modified policy iteration"),
 (L, "Silver's 4x4 gridworld: k = 3 evaluation sweeps enough", "Reading, section 8", "evaluation sweeps were already enough"),
 (L, "k = 1 is value iteration", "Reading, section 8", "value iteration ( k = 1)"),
 (L, "With truncated evaluation, unchanged policy does not prove optimality; stop when policy unchanged and values stopped", "Reading, section 8", "Stop only when the policy is unchanged"),
 # ---- value iteration
 (L, "Value iteration update with max over actions; 4 steps; policy read off at the end", "Reading, section 9", "Read off the policy once at the end"),
 (L, "VI: no policy followed; each sweep is one evaluation sweep of the greedy policy; PI with evaluation cut to one sweep", "Reading, section 9", "each sweep is one evaluation sweep of the policy that is greedy"),
 (L, "Intermediate value functions need not be any policy's value (Silver)", "Reading, section 9", "the intermediate value functions need not be the value of any policy"),
 # ---- corridor
 (L, "Corridor setup: A, B, C, goal G, reward 10, wall at A, gamma 0.9", "Reading, section 10", "Three states in a row"),
 (L, "VI backups for A, B, C", "Reading, section 10", "V (C) ← max(0.9 V (B), 10 + 0.9 × 0)"),
 (L, "VI table sweeps 0 to 4: (0,0,0), (0,0,10), (0,9,10), (8.1,9,10), converged", "Reading, section 10 table; animation", "No change: converged"),
 (L, "V* = (8.1, 9, 10), greedy right everywhere; after k sweeps only rewards up to k steps away", "Reading, section 10", "has only seen rewards up to"),
 (L, "In-place order C, B, A converges in one sweep", "Reading, section 10; animation", "converges in a single sweep instead"),
 (L, "PI from random: backups with 0.45 and 5", "Reading, section 10", "where 0.45 is 0.5 × 0.9"),
 (L, "Evaluation sweeps (0,0,5), (0,2.25,5), (1.0125,2.25,6.0125), (1.4681,3.1612,6.0125)", "Reading, section 10", "(1.4681, 3.1612, 6.0125)"),
 (L, "V_pi = (4.29, 5.24, 7.36)", "Reading, section 10", "(4.29, 5.24, 7.36)"),
 (L, "Improvement comparisons 3.86 vs 4.72, 3.86 vs 6.62, 4.72 vs 10", "Reading, section 10", "0.9 × 7.36 = 6.62"),
 (L, "PI stops after two outer iterations", "Reading, section 10", "stops after two outer iterations"),
 (L, "After three sweeps greedy already right: 2.025 vs 0.91, 5.41 vs 0.91, 10 vs 2.025", "Reading, section 10", "0.9 × 2.25 = 2.025"),
 # ---- convergence
 (L, "Max norm definition", "Reading, section 11", "the largest difference in any state"),
 (L, "Both backups are gamma-contractions (Silver L3)", "Reading, section 11", "γ-contractions"),
 (L, "Contraction mapping theorem: unique fixed point, linear rate", "Reading, section 11", "contraction mapping theorem"),
 (L, "Error bound gamma^k ||V0 - V*||", "Reading, section 11", "the error after k sweeps obeys"),
 (L, "k >= ln(1/eps)/ln(1/gamma)", "Reading, section 11", "ln(1/ε) / ln(1/γ)"),
 (L, "66 sweeps at 0.9 (0.9^66 = 0.00096), 688 at 0.99", "Reading, sections 11 and one screen; contraction widget", "0.9 66 ≈ 0.00096"),
 (L, "Cost grows with effective horizon 1/(1-gamma)", "Reading, section 11", "effective horizon 1/(1 − γ)"),
 (L, "Small change is not small error: gamma*theta/(1-gamma), 0.099 at gamma 0.99, theta 0.001", "Reading, section 11", "off by up to 0.099"),
 # ---- comparison table
 (L, "PI vs VI table: flavour, model, update rule, intermediate values, per-sweep cost (corrected), typical behaviour, stops when", "Reading, section 12 table", "Typical behaviour"),
 (L, "Neither dominates; PI wins when evaluation cheap, VI when many actions; MPI often practical", "Reading, section 12", "is often the practical choice"),
 # ---- cost
 (L, "O(mn^2) per sweep for V, O(m^2 n^2) for Q (Silver)", "Reading, section 13", "O( m ² n ²)"),
 (L, "Full-width backups: every successor and action, using the model", "Reading, section 13", "full-width backups"),
 (L, "Fine for medium problems: millions of states (Silver)", "Reading, section 13", "millions of states"),
 (L, "Curse of dimensionality: ten variables with ten values = ten billion states; even one backup too expensive", "Reading, section 13; calculator", "ten billion states"),
 (L, "Asynchronous DP: any order, converges if every state keeps being backed up (Silver, S&B)", "Reading, section 14", "Asynchronous DP"),
 (L, "In-place DP (corridor in one sweep)", "Reading, section 14", "In-place DP"),
 (L, "Prioritised sweeping: largest Bellman error first, priority queue, predecessor updates need reverse dynamics", "Reading, section 14", "needs the reverse dynamics"),
 (L, "Real-time DP: back up only visited states", "Reading, section 14", "back up only the states an agent actually visits"),
 (L, "Sample backups remove the model; cost independent of number of states: Model-free page", "Reading, section 15", "Sample backups"),
 (L, "Approximate DP: function approximator, fitted value iteration, leads to DQN", "Reading, section 15", "fitted value iteration"),
 # ---- mistakes
 (L, "Mistake: calling DP learning", "Reading, Mistakes", "Calling DP learning."),
 (L, "Mistake: acting greedily on V without a model; model-free control uses Q", "Reading, Mistakes", "Acting greedily on V without a model."),
 (L, "Mistake: reading VI intermediate values as a policy's value", "Reading, Mistakes", "Reading value iteration's intermediate values"),
 (L, "Mistake: trusting a small last change", "Reading, Mistakes", "Trusting a small last change."),
 (L, "Mistake: PI flipping between equal actions; break ties consistently (S&B)", "Reading, Mistakes and section 8", "flip between equally good actions"),
 (L, "Mistake: assuming full evaluation required", "Reading, Mistakes", "Assuming full evaluation is required"),
 (L, "Mistake: stopping MPI on unchanged policy alone", "Reading, Mistakes", "Stopping modified policy iteration on an unchanged policy alone."),
 (L, "Mistake: gamma = 1 carelessly", "Reading, Mistakes", "Using γ = 1 carelessly."),
 (L, "Mistake: treating DP as obsolete", "Reading, Mistakes", "Treating DP as obsolete."),
 # ---- connections
 (L, "Up the tree: Topic: rl places DP as model-based solution of the Bellman equations", "Reading, section 16", "Up the tree"),
 (L, "GPI is the shape of nearly every RL algorithm incl. PPO for RLHF; critic = evaluation, policy step = improvement", "Reading, section 16", "the critic update is approximate policy evaluation"),
 (L, "AlphaZero is GPI with MCTS as improvement", "Reading, section 16", "AlphaZero is GPI with Monte Carlo tree search"),
 (L, "One-step backup is the template: TD target, Q-learning = sampled VI, DQN target, GAE from TD errors", "Reading, section 16", "GAE (generalised advantage estimation)"),
 (L, "Token generation is an MDP with a trivial known transition; state space size makes DP impossible", "Reading, sections 1 and 16", "Token generation is an MDP with a trivial, known transition"),
 (L, "Links to Deep RL page (DQN, AlphaZero)", "Superseded: Deep RL is being split; links go to its successors Value-based deep RL and Model-based RL and planning", "Value-based deep RL"),
 # ---- resources
 (L, "Silver Lecture 3 (1h 30m), clearest PI vs VI walkthrough with gridworld demo; davidsilver.uk/teaching (now redirects to davidstarsilver.wordpress.com/teaching)", "Further reading, Best resources (redirect target used)", "Planning by Dynamic Programming"),
 (L, "Sutton & Barto chapter 4 (45 min), proof sketches", "Further reading, Best resources", "chapter 4 \"Dynamic Programming\""),
 (L, "Karpathy REINFORCEjs GridWorld DP (~10 min), interactive", "Further reading, Best resources", "REINFORCEjs GridWorld: DP"),
 # ---- foundations rows moved to DP
 (F, "Row 5: R_{t+1} indexing; some texts write r_t, only the subscript shifts", "Reading, section 1", "only the subscript shifts"),
 (F, "Row 8: cumulative reward; refuelling and investment examples", "Reading, section 2", "a financial investment may take months to mature"),
 (F, "Row 10: history H_t formula; ends at O_t, R_t, excludes A_t; grows without bound", "Reading, section 1", "It grows without bound"),
 (F, "Row 11: environment state vs agent state", "Reading, section 1", "The environment state"),
 (F, "Row 12: Markov property formula; Atari frame; DQN frame stack", "Reading, section 1", "Stacking the last four frames"),
 (F, "Row 13: fully observable = MDP; O_t = S^a = S^e", "Reading, section 1", "fully observable"),
 (F, "Row 14: POMDP examples (robot camera, trading, poker); history, belief, RNN states with formula", "Reading, section 1", "a belief"),
 (F, "Row 15: LLM generation fully observable", "Reading, section 1", "fully observable MDP with a trivial, known transition"),
 (F, "Rows 16 to 19: Markov chain with every student probability", "Reading, section 2", "Facebook stays on Facebook with 0.9"),
 (F, "MRP definition and student rewards (-2, -1, +1, +10, 0)", "Reading, section 2", "each class gives −2, Facebook −1, Pub +1, Pass +10"),
 (F, "MDP definition with P^a_ss', R^a_s and the student MDP actions", "Reading, section 2", "Quit (0, back to Class 1)"),
 (F, "Row 20: policy definition; fixing a policy gives an MRP with P^pi, R^pi", "Reading, section 2", "Fixing a policy turns an MDP back into an MRP"),
 (F, "Row 21: return formula, gamma, 1/(1-gamma) horizons", "Reading, section 2", "horizon of about 10 steps"),
 (F, "Row 22: four reasons to discount (cycles, uncertainty, convenience, preference)", "Reading, section 2", "Preference."),
 (F, "Row 23: gamma = 1 when every sequence terminates; LLM RL uses gamma = 1", "Reading, section 2", "LLM RL typically uses γ = 1"),
 (F, "Row 24: sampled returns -2.25 and -3.125; return is a random variable", "Reading, section 2; sampler widget", "−3.125"),
 (F, "Rows 25, 26: V_pi, Q_pi definitions and V = sum pi Q, Q = R + gamma sum P V", "Reading, section 3", "The two are one step apart"),
 (F, "Row 27: Q for model-free control (argmax lookup vs lookahead)", "Reading, section 3", "Q is what you want for model-free control"),
 (F, "Row 28: optimal values; MDP solved once Q* known; deterministic optimal policy exists", "Reading, section 3", "An MDP is solved once"),
 (F, "Row 29: Bellman derivation from G_t = R_{t+1} + gamma G_{t+1}; Markov property allows replacing the tail", "Reading, section 3", "replaces the random tail"),
 (F, "MRP Bellman equation V(s) = R_s + gamma sum P V", "Reading, section 3", "For an MRP with known"),
 (F, "Rows 30, 31: expectation equations for V and Q (with a'), linear, matrix solution, O(n^3); optimality equations for V and Q, nonlinear", "Reading, section 3", "the action taken in the successor"),
 (F, "Row 32: everything downstream approximately solves one of these equations", "Reading, section 3", "is a way of approximately solving one of these equations"),
 (F, "Row 33: student MRP value table at gamma 0, 0.9, 1", "Reading, section 3 table; widget", "−22.5"),
 (F, "Row 34: Facebook -22.5 explanation (10 steps at -1 then Class 1 -12.5); Silver rounds to -13 and -23", "Reading, section 3", "rounds Class 1 and Facebook"),
 (F, "Row 35: Class 3 check 4.32", "Reading, section 3", "4.32"),
 (F, "Row 36: uniform policy V = -1.3, 2.7, 7.4, -2.3 with Class 3 check", "Reading, section 3", "−1.3 (Class 1), 2.7 (Class 2), 7.4 (Class 3)"),
 (F, "Row 37: optimal V* = 6, 8, 10, 6 and the action values", "Reading, section 3", "6 (Class 1), 8 (Class 2), 10 (Class 3)"),
 (F, "Row 38: one step of improvement from uniform Q (0.69/-3.31, 5.38/0, 10/4.77, -1.31/-3.31)", "Reading, section 3", "Study 5.38 against Sleep 0"),
 (F, "Row 39: optimal policy Study, Study, Study, Quit; reading off Q* needs no model, V* would need 0.2/0.4/0.4", "Reading, section 3", "Reading the optimal policy off"),
 (F, "Row 40: Silver prints Q*(Pub) 8.4; arithmetic 9.4", "Reading, section 3 correction box", "8.4"),
 (F, "Row 49: prediction vs control definitions; evaluate then improve", "Reading, section 3", "Prediction and control"),
 (F, "Row 58: mistakes moved here: history excludes the action; greedy on V needs a model; optimality equation not linear", "Reading, Mistakes", "Putting the action being chosen into the history."),
 (F, "Row 58: 'optimality equation is not linear' mistake", "Reading, Mistakes", "Treating the optimality equation as linear."),
 (F, "Reward is not value: Class 2 reward -2, value 1.5 (kept in root too)", "Reading, section 3", "reward is not value"),
 (F, "Task brief: history of the Bellman equations (Hamilton-Jacobi, Bellman 1957, HJB, Howard 1960)", "Reading, section 4 (added from S&B historical remarks)", "Hamilton–Jacobi–Bellman equation"),
]
facts = []
for src, fact, where, phrase in C:
    found = phrase in t or phrase in js
    facts.append(dict(source=src, fact=fact, where=where, phrase=phrase, found=found))
miss = [f for f in facts if not f['found']]
json.dump(dict(sources=['live.md', '../../src/live_rl_foundations.md (via ../../src/coverage_rl_foundations.md)'], facts=facts,
               dropped=[], corrections=[
                   "Per-sweep cost row: kept the old page's corrected wording (evaluation reads one action per state).",
                   "Silver's Q*(Pub) 8.4 corrected to 9.4 (kept from the foundations page).",
                   "Sutton and Barto's 'over a thousand years' per backgammon sweep shown to be about 3.2 million years (derived).",
                   "Figure 4.1's -1.7 at k = 2 is a rounding of -1.75 (four printed values).",
                   "The 'dynamic programming' naming story is flagged as not strictly true (Russell and Norvig).",
                   "Silver link davidsilver.uk/teaching now redirects; the redirect target is used."]),
          open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print(len(facts), 'facts,', len(miss), 'not found')
for f in miss:
    print('MISSING', f['phrase'], '|', f['fact'])
