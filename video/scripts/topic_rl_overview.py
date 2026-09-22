"""
Topic overview: reinforcement learning, as of 22 September 2026.

The load-bearing idea is that the classical theory and the thing currently
being done to language models are one subject, not two, and that the join is
smaller than the vocabulary around it suggests. Token generation is a Markov
decision process with a deterministic transition, so the environment model,
which is the expensive unknown in every classical setting, becomes free, and
the reward becomes the expensive part instead. That is the whole video.

So the inventory here is methods, in one line from Bellman to verifiers, and
the organising question is what actually changes when the environment is a
conversation and the reward is a verifier. The pages below this one own the
mechanics of GRPO and RLVR, so this video names them and shows the shape of
the lineage rather than deriving the algorithms.

Every method, claim and name comes from the canonical page "Topic: rl", read
from Notion on 22 September 2026. Nothing was invented for shape.

The outline that survived the revision step:

    ident      name the subject, say what it is in one plain sentence, and say
               why it earns the time
    map        three columns, everything named, nothing explained. Parked, and
               every later beat focuses the part being discussed
    question   what changes when the environment is a conversation?
    classical  the MDP and the Bellman recursion, because every algorithm in
               the other two columns approximates one of those equations
    mc_td      the first real comparison: Monte Carlo against TD
    dqn        on-policy against off-policy, and why DQN's replay buffer is
               legal at all
    ladder     the policy-gradient ladder, REINFORCE up to PPO, as one stack
               where each rung fixes the previous rung's problem
    llm_turn   the join: a classical MDP against token generation
    lineage    RLHF -> GRPO -> RLVR, as three deletions
    taxonomy   the grid: where DQN, PPO and GRPO land on the three axes
    caveat     GRPO's known biases and the corrections to them
    close      the take: the environment got easy, the reward got hard

What the step-4 critique caught, and what changed:

  - Draft one spent a beat deriving GRPO's objective. That belongs to the page
    below this one, and the sibling training overview was already treating
    alignment as a priced stage. Replaced with the lineage beat, which says
    what each step deletes and stops there. The video now names the mechanics
    and points at where they live.
  - Reward hacking was a beat here and a beat in the training overview. It is
    the training page's own section, with its own deep dive underneath it, and
    it is only a related-topic link from this page. Cut from this episode
    entirely rather than said twice in two different voices.
  - The Mercor 397B recipe is carried in full on the training page and only
    cross-listed here, so its numbers stay in that episode. Here it appears
    once, in the take, without figures, because what it says about the
    environment mattering more than the algorithm is this video's conclusion
    and not a case study.
  - TRPO and PPO were a beat of their own and REINFORCE was another. They are
    one ladder, each rung fixing the rung above it, so they became one stack
    panel that is built as the argument is made.
  - SARSA and Q-learning were originally a footnote. Promoted, because the
    off-policy licence is what makes DQN's replay buffer legal, and that is a
    causal link rather than a taxonomy fact.

Speakers:
  A  narrator, owns the spine and the visuals
  B  the listener, asks what the viewer is thinking, never chats

Numbers and names are spelled the way they should be said, because text to
speech reads "TD(lambda)" and "Dr. GRPO" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: rl"
SUBTITLE = "one line from Bellman to verifiers, and what changes on the way"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame: the field in three columns, chronological left to right,
    # because the through-line IS the argument of this episode.
    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "the classical core", "tone": "verified", "items": [
            "MDPs and Bellman",
            "dynamic programming",
            "Monte Carlo and TD",
            "SARSA and Q-learning"]},
        {"head": "deep RL", "tone": "machinery", "items": [
            "DQN",
            "REINFORCE",
            "A2C and A3C",
            "TRPO and PPO",
            "SAC",
            "AlphaZero and MuZero"]},
        {"head": "RL for LLMs", "tone": "subject", "items": [
            "RLHF",
            "GRPO",
            "RLVR"]},
    ]},

    "question": {"kind": "claim",
                 "text": "What changes when the environment is a conversation\n"
                         "and the reward is a verifier?",
                 "note": "we walk the map left to right, and watch which pieces survive"},

    "classical": {"kind": "points", "focus": "MDPs and Bellman",
                  "head": "a Markov decision process", "items": [
        "states, actions, a transition distribution",
        "a reward function, and a discount factor",
        "Markov: the future depends on the current state alone",
        "Bellman: reward now, plus the discounted value of next",
        "an infinite horizon becomes a fixed point",
    ]},

    "mc_td": {"kind": "compare", "focus": "Monte Carlo and TD", "sides": [
        {"head": "Monte Carlo", "tone": "context", "items": [
            "average the returns you actually got",
            "unbiased",
            "high variance: a whole episode's noise",
            "must wait for the episode to end"]},
        {"head": "TD learning", "tone": "subject", "items": [
            "bootstrap off your own next estimate",
            "biased",
            "lower variance",
            "works online, on tasks that never end"]},
    ]},

    "dqn": {"kind": "points", "focus": "DQN", "tone": "machinery",
            "head": "why DQN is allowed to replay old experience", "items": [
        "SARSA bootstraps off the action taken: on-policy",
        "Q-learning bootstraps off the best action: off-policy",
        "so a replay buffer is legitimate, and breaks the correlation",
        "plus a frozen target, so the target stops moving",
    ]},

    # The best panel in the episode: the order down the stack is the argument,
    # because each rung exists to fix the rung above it.
    "ladder": {"kind": "stack", "focus": "REINFORCE", "tone": "machinery",
               "layers": [
        ("REINFORCE", "the sampled return: unbiased, very high variance"),
        ("+ a baseline", "still unbiased, much less variance"),
        ("actor-critic", "learn the baseline. A3C async, A2C batched"),
        ("TRPO", "a KL constraint: the largest step that is still safe"),
        ("PPO", "clip the ratio instead: first-order, and reuse the batch"),
    ]},

    "llm_turn": {"kind": "compare", "focus": "RL for LLMs", "sides": [
        {"head": "a classical MDP", "tone": "context", "items": [
            "a transition distribution you do not know",
            "the actions the environment allows",
            "a reward function over states and actions"]},
        {"head": "token generation", "tone": "subject", "items": [
            "the transition is: append the token",
            "the action space is the whole vocabulary",
            "one reward, at the very end"]},
    ]},

    "lineage": {"kind": "flow", "focus": "GRPO", "tone": "subject",
                "steps": ["RLHF", "GRPO", "RLVR"]},

    "taxonomy": {"kind": "table",
                 "head": ["method", "stores", "environment", "experience"],
                 "rows": [
        ["DQN", "value only", "model-free", "off-policy"],
        ["PPO", "policy + critic", "model-free", "nearly on-policy"],
        ["GRPO", "policy only", "model-free", "nearly on-policy"],
    ]},

    "caveat": {"kind": "points", "tone": "cost",
               "head": "the version in the paper is not the version in use",
               "items": [
        "GRPO has known biases",
        "Dr. GRPO, DAPO, GSPO, off-policy corrections",
        "2025 and 2026 have been a run of patches to it",
    ]},

    "close": {"kind": "claim",
              "text": "The environment got easy.\nThe reward got hard.",
              "note": "Bellman still holds. What moved is where the difficulty sits."},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is ---------------------------------------------------------
SCRIPT["ident"] = [
    (A, "This is the map of reinforcement learning. The branch of machine "
        "learning where an agent learns behaviour by interacting with an "
        "environment and maximising reward."),
    (A, "It earns an episode because most people arrive from one end or the "
        "other. The classical theory, or what is done to language models now. "
        "This is the whole line, current as of the twenty second of September, "
        "twenty twenty six."),
]

# --- the inventory, before any explanation --------------------------------
SCRIPT["map"] = [
    (A, "The whole board first. Three columns, nothing explained yet."),
    (A, "The classical core. Markov decision processes and the Bellman equations. "
        "Dynamic programming. Monte Carlo and temporal difference learning. "
        "Sarsa and Q learning."),
    (A, "Then deep reinforcement learning, where networks replace tables. "
        "D Q N. REINFORCE. A two C and A three C. T R P O and P P O. "
        "S A C. And the model based line, AlphaZero and MuZero."),
    (A, "And the third column, which is why most people are here now. "
        "R L H F. G R P O. R L V R."),
    (B, "The left column is where everyone is told to start."),
    (A, "And the right one is where everybody wants to get to."),
]

# --- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (A, "So here is the question this map is arranged to answer. "
        "What actually changes when the environment is a conversation "
        "and the reward is a verifier?"),
    (A, "We go left to right, and at each step I will say which piece of the "
        "classical picture survives and which stops applying. "
        "Most of it survives. That is the surprise."),
]

# --- the classical core ---------------------------------------------------
SCRIPT["classical"] = [
    (A, "Start with the formal object all of this optimises over. "
        "A Markov decision process. States, actions, a transition distribution, "
        "a reward function, and a discount factor."),
    (A, "The Markov property is load bearing. The future depends on the current "
        "state alone, and that is what makes a one step recursion valid."),
    (A, "The Bellman equations are that recursion. The value of a state is the "
        "immediate reward plus the discounted value of what comes next. "
        "An infinite horizon becomes a fixed point, and everything in the other "
        "two columns approximates one of those equations."),
]

# --- Monte Carlo against TD -----------------------------------------------
SCRIPT["mc_td"] = [
    (A, "Dynamic programming solves them exactly, but needs the full transition "
        "model and a small state space. So it is the ideal everything else "
        "approximates by sampling."),
    (A, "Two ways to sample, and the two sides on screen are the whole of "
        "classical learning."),
    (A, "Monte Carlo averages the returns it actually got. Unbiased. "
        "But a whole episode's randomness lands in every estimate, so variance "
        "is high, and you wait for the end."),
    (A, "Temporal difference learning updates from its own one step ahead estimate "
        "instead. Lower variance, at the cost of bias, and it works online on "
        "tasks that never terminate. T D lambda is the dial."),
]

# --- on-policy, off-policy, and DQN ---------------------------------------
SCRIPT["dqn"] = [
    (A, "One more distinction, and it is the reason the second column works at "
        "all. Whose experience are you learning from?"),
    (A, "Sarsa bootstraps off the action it actually takes next, so it learns the "
        "value of the exploratory policy it is running. On policy. "
        "Q learning bootstraps off the best next action, so it learns the greedy "
        "policy while behaving exploratorily. Off policy."),
    (A, "Now replace the table with a network. D Q N buys stability with the two "
        "tricks on screen, and the first is only legal because Q learning is off "
        "policy. A replay buffer, breaking the correlation between consecutive "
        "transitions. And a frozen target, so it stops moving while you chase it."),
]

# --- the policy-gradient ladder -------------------------------------------
SCRIPT["ladder"] = [
    (A, "The other branch optimises the policy directly, and it is a ladder. "
        "Each rung fixes the rung above it."),
    (A, "REINFORCE is the top. Raise the log probability of an action in "
        "proportion to how well it turned out. Unbiased, and very high variance."),
    (A, "Subtract a state dependent baseline. Variance drops, the gradient stays "
        "unbiased, and the natural baseline is the value of the state, which "
        "turns the return into an advantage. Learn it with a critic and you have "
        "actor critic. A three C asynchronous, A two C batched."),
    (A, "The bottom two rungs are about step size. T R P O made the largest safe "
        "step precise, with a K L constraint, at second order cost. "
        "P P O gets the same effect first order, by clipping the importance ratio."),
    (B, "And that is the one that ended up in the language model loop."),
    (A, "That one. Cheap, and safe to reuse a batch of rollouts on."),
]

# --- the join -------------------------------------------------------------
SCRIPT["llm_turn"] = [
    (A, "Third column. The move that joins the two fields is smaller than the "
        "vocabulary around it suggests. Token generation is a Markov decision "
        "process. The state is the text so far, the action is the next token, "
        "and the transition is: append the token."),
    (A, "Look what that does to the pieces on screen. The transition "
        "distribution, which you never know in a classical setting, and which "
        "AlphaZero and MuZero exist to cope with, becomes trivial. "
        "You know the next state exactly."),
    (A, "The action space becomes the vocabulary. And the reward arrives once, "
        "at the very end. So credit assignment over thousands of tokens is the "
        "hard part now, and the only piece that got harder."),
]

# --- the lineage ----------------------------------------------------------
SCRIPT["lineage"] = [
    (A, "Those three names are one lineage, and each step deletes a piece of "
        "the machinery you just watched me build."),
    (A, "R L H F is the full version. A reward model trained on human preferences, "
        "then P P O against it, with a per token K L penalty back to a frozen "
        "reference."),
    (A, "G R P O deletes the critic. It samples a group of answers to the same "
        "prompt and uses the group's mean reward as the baseline. "
        "The same advantage, by sampling rather than by learning."),
    (A, "R L V R deletes the reward model too, and puts a programmatic verifier "
        "in its place. Did the tests pass. Is the proof valid."),
    (B, "So human preference is out of the loop."),
    (A, "In that branch, yes, which is why it works wherever an answer can be "
        "checked. The mechanics live on the page underneath this one."),
]

# --- the grid -------------------------------------------------------------
SCRIPT["taxonomy"] = [
    (A, "And all of it lands on one grid: what the agent stores, whether it "
        "models the environment, and whose experience it learns from."),
    (A, "D Q N stores values, model free, off policy. P P O stores a policy and a "
        "critic, and is nearly on policy, because importance ratios correct a "
        "little staleness."),
    (A, "Now the last row. G R P O deleted the critic, so it stores the policy "
        "alone. That is the box REINFORCE started in, reached from the other "
        "direction, with the baseline bought by sampling."),
]

# --- the caveat -----------------------------------------------------------
SCRIPT["caveat"] = [
    (A, "One caveat. G R P O has known biases, and twenty twenty five and twenty "
        "twenty six have been a run of corrections to them. Doctor G R P O. "
        "D A P O. G S P O. Off policy corrections."),
    (A, "Implement it from the original paper and you are implementing a version "
        "the field has already patched."),
]

# --- the take -------------------------------------------------------------
SCRIPT["close"] = [
    (A, "So what changed when the environment became a conversation?"),
    (A, "Less than the new vocabulary suggests. The Bellman recursion still holds. "
        "The advantage is still an advantage. P P O is still doing the clipping "
        "it did on robots."),
    (A, "What moved is where the difficulty sits. The environment model became "
        "free, and the reward became the expensive part. Either a learned model "
        "of human preference, or a verifier somebody had to build."),
    (A, "Which is why the frontier scale recipe this page links to spends most of "
        "its length on token accounting, asynchronous roll outs, environment "
        "robustness and harness design, not on the algorithm."),
]


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    turns = sum(len(t) for t in SCRIPT.values())
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {turns} turns ({b_turns} for B), {words} words, "
          f"about {words / 148:.1f} minutes at 148 words per minute")
    for key, spoken in SCRIPT.items():
        w = sum(len(line.split()) for _, line in spoken)
        print(f"  {key:12s} {len(spoken)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
