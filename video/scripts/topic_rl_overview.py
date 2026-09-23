"""
Topic overview: reinforcement learning, as the page stood on 21 September 2026.

Source: the canonical Notion page "Topic: rl", read from Notion directly
rather than from the repo mirror. Every name, claim and distinction below is
on that page. Nothing is imported from the five deep dives underneath it, and
nothing is invented for shape.

The date. The page prints no date anywhere in its own text, so the title card
carries Notion's `last_edited_time`, 21 September 2026. The cut cleared in
74326b3 said 22 September, which its own page did not carry.

Which kind of overview this is. Nominally a mental model rather than a
comparison: the page is one subject with structure, not a field of competitors
doing the same job differently. But a single story does run through it, and it
is the page's own, so this episode follows it. The page's sentence is that
token generation is a Markov decision process with a deterministic transition,
a vocabulary-sized action space and a single reward at the end, so the
environment model is trivial and credit assignment is the hard part. Read left
to right, that is: the transition distribution was the expensive unknown in
every classical setting, in the language-model setting it becomes free, and
the reward becomes the expensive thing instead. That is the whole video, and
it is why the map is chronological rather than taxonomic.

The cleared cut found the same axis and the same three columns, and both are
kept, because they are the page's own "Map of the space". Four things from
that cut are not kept:

  - Eleven beats and no `reserve` on any of them, so every panel finished
    revealing at the very end of its budget. Eight beats here, every one with
    a fitted reserve.
  - Its `question` was a two-reveal `claim`, which draws its headline first
    and then has nothing to do for the rest of a fifty second line. The
    question is asked inside the beat that answers it, and that beat builds
    the Markov decision process itself as a five reveal `points`.
  - Its `mc_td` and `llm_turn` were both `compare`, which is a two-reveal
    panel and a short beat's panel. The join is a `table` here, at four
    reveals, and Monte Carlo against TD is two rows of a bigger one.
  - Its `lineage` was a three-step `flow` beside the parked map. Two flow
    steps is the ceiling there: three render at about a third of body size
    with no visible arrows, and the layout audit passes it. It is a `points`
    beat now, which also let the GRPO caveat fold in as a row rather than
    take a beat of its own.

The outline that survived the revision step:

    ident       the subject, what it is in one plain sentence, and why it
                earns the time
    map         three columns, left to right in the order the field arrived,
                everything named and nothing explained. Parked
    question    what changes when the environment is a conversation, and the
                formal object you need before you can answer it
    classical   one table, one axis: what each update actually consumes
    ladder      the policy-gradient ladder, each rung fixing the one above it
    llm_turn    the join: a classical MDP against token generation
    lineage     RLHF to GRPO to RLVR, as two deletions, plus the caveat
    close       the take: the environment got free, the reward got expensive

What the critique step changed:

  - Draft one kept the cleared cut's separate `caveat` beat for GRPO's known
    biases. One beat for four paper names is a beat spent on a list, and the
    page carries them as a parenthesis inside one sentence. It is the last row
    of `lineage`, which is also where it belongs logically: the lineage's last
    step is that the published version is not the version in use.
  - Draft one had `classical` and `offpolicy` as two beats, and that was a
    real choice rather than a slip: dynamic programming, Monte Carlo and TD
    answer "what do you learn from", while SARSA and Q-learning answer "whose
    data is it", and a comparison that changes axis halfway is a list wearing
    a chart's clothes. They are one beat here because there is a single axis
    that holds all five rows honestly, and it is the middle column: what the
    update consumes. A known model, whole episodes, its own next guess,
    anybody's data, a buffer of it. SARSA is named in the narration of the
    off-policy row as the contrast that makes it mean something, and is a map
    pill rather than a row.
  - Draft one ran 1,080 words and about 7.6 minutes, past the wall where
    1080p gives out. Every beat was rewritten shorter, and the deep RL column
    lost its per-algorithm explanations: SAC, AlphaZero and MuZero are named
    on the map and not explained. That is deliberate and it is recorded below.
  - B had five turns in draft one and two of them were agreement. Three now,
    each one the question the viewer is forming: what actually changes, is
    that the one that ended up in the language model loop, and where do the
    humans go.

Reveal arithmetic, which is what set the length. `spread` puts reveal k of n
at `(k-1)/(n-1) x (beat_length - reserve)`, so a panel with n reveals wants
n narration segments, reveals 1 to n-1 share the span before the reserve, and
everything said after the last one has to fit inside the reserve. Every beat
below records the segments it was written to, and the opening segment is
written as long as the others rather than as a short orienting line, because
`spread` gives the head an equal slice of time whatever it carries.

A second rule shaped the wording more than the segment lengths did: a panel
item's words must not appear in the narration before that item is drawn, and
the match is a squashed contiguous run. So each row's name is placed late in
its own segment rather than early, because being named after the picture is
the direction `check_leads` passes by design.

Budgeted at 0.42 seconds a word, the top of the measured range rather than the
median, because planning short costs nothing and planning long drops the
episode to 720p. 36 reveals across seven panel beats. Delivered at 7 minutes
10.8 seconds and 4.37 MiB, 1080p on the third and last rung of the encode
ladder, at 142 words a minute overall. That is past the seven minute clock and
inside the 4.7 MiB profile the clock exists to protect, which the method
arbitrates explicitly in favour of the delivered profile.

Two things the segment arithmetic cost, and they are worth knowing because
both look like padding and are not. Balancing a beat's segments is not a
matter of writing five equal fifths: reveal k is drawn at
`(k-1)/(n-1) x (D - reserve)` while segment k starts at roughly `(k-1)/n x D`,
so the later segments have to start further in each time, and the only levers
are more words earlier in the beat or more reveals. This episode used both.
`llm_turn` gained a fourth row, "the hard part", because the page's payoff
sentence, that credit assignment over thousands of tokens is now the hard
part, otherwise had to live in the twelve word tail after the last reveal and
`check_leads` measured the narrator 6.6 seconds ahead of the picture.
`lineage` gained a fifth row for the same reason and a second one: see the
voice note below.

One pace figure is accepted rather than fixed. `llm_turn` reads at 158 words a
minute, which is the first value in the band this method says wants the
punctuation fix. Splitting its turns from five to eight moved it by one word a
minute, which is the measurement noise, and it is seven below the gate and the
shortest panel beat in the episode. Every other beat is between 121 and 152.

Lit state of the map, decided for every beat rather than left to inherit:

  map         builds with all three columns at their own tones.
  question    the classical core.
  classical   the classical core and deep RL, the one beat that genuinely
              lights two columns: four of its five rows are classical and the
              fifth, DQN, is what the fourth row licenses.
  ladder      deep RL alone.
  llm_turn    RL for LLMs.
  lineage     no focus, inheriting RL for LLMs from the beat before it, which
              is exactly the state this beat wants. A redundant focus redraws
              an identical frame at a cost of panel delay.
  close       all three, which is how this vocabulary says no emphasis.

Tones on the map. The classical core is `verified`, deep RL is `machinery`,
and RL for LLMs is `subject`. That is a semantic assignment, not a ranking:
the classical core is the part that is proved, deep RL is literally a list of
stabilisation machinery, and the third column is what the current sentence is
about. No column is `context`, because a focus on a context-toned column is
invisible and all three are pointed at later. No column is `cost`, because
drawing one era in the failure colour would deliver a verdict the page
refuses: its whole argument is that the classical material is what the new
material is made of.

What was cut, so the next person can see the second episode rather than
rediscover it:

  - The taxonomy diagram: three orthogonal axes, what the agent stores, does
    it model the environment, whose experience does it learn from, and where
    DQN, PPO and AlphaZero sit on each. It is the page's own opening figure
    and it is a whole episode, "every RL agent sits at three coordinates".
    This episode uses one of the three, on-policy against off-policy, because
    that one is causal rather than taxonomic: it is what makes a replay buffer
    legal. The other two are named and not drawn.
  - Policy iteration against value iteration. The page distinguishes them; the
    distinction belongs to the dynamic programming deep dive, and here dynamic
    programming is one row of one table.
  - SAC's entropy bonus, and AlphaZero's search-as-policy-improvement against
    MuZero's learned latent dynamics. Named on the map, not explained. The
    model-based line deserves better than a clause and it is the natural
    second episode off this page, "planning inside a model you had to learn".
  - TD(lambda) as the dial between Monte Carlo and TD, and epsilon-greedy and
    GLIE. Vocabulary, and it is on the model-free deep dive.
  - The Mercor and SkyRL recipe at 397B parameters, the 1,928 expert tasks and
    the 70 percent relative improvement. The page cross-lists it and says it
    sits in full on the training and post-training page, whose own episode
    carries the figures. Its argument, that the environment and the harness
    decide the outcome as much as the algorithm does, is this episode's
    closing line, without figures, because it is a conclusion here and a case
    study there.
  - Reward hacking, a related-topic link from this page and a section with its
    own deep dive on the training page.
  - DeepSeek-R1, InstructGPT and DeepSeekMath as papers. The lineage beat
    names the methods those papers introduced; the papers themselves are the
    page's Related papers block, and the close points at the page.
  - The four best resources: David Silver's course, Sutton and Barto, Spinning
    Up and the RLHF Book. An overview owes no resources card; a deep dive
    does.

The back-port. The page writes RLHF, GRPO and RLVR without expanding any of
the three, in the one paragraph that is the bridge between classical RL and
what is being done to language models. A reader can follow that; a listener
cannot, and this method requires every acronym expanded on first use in
speech. Saying "reinforcement learning from human feedback", "group relative
policy optimisation" and "reinforcement learning from verifiable rewards" out
loud made the page the weaker of the two, so the three expansions went into
that paragraph in Notion in this session, before this script was rendered.

Speakers:
  A  narrator, owns the spine and the map
  B  the listener, three turns, each of which turns the beat

What reading the transcripts caught, none of which any gate rejected, and all
of them on takes that passed at a character error under 0.04. This is the step
that earned its keep on this episode:

  - `lineage` deleted "Doctor G R P O. D A P O. And G S P O." outright, the
    entire last clause of the beat, at a character error of 0.032. It is the
    two shapes this model eats, stacked: a run of bare names with no verb,
    sitting at the very end of a beat. The fix was not a reroll. The caveat
    became two panel rows rather than one, so the corrections have a reveal of
    their own to land on, and the narration now gives them a verb and a
    sentence after them: "Those three are the corrections."
  - "the model based line" came back as "the model baseline" on two different
    beats, `map` and `llm_turn`, on two different seeds. Both words are
    ordinary English and no gate fires, and a listener hears a concept that
    does not exist. Written "the two that plan" on the map and "model based
    methods" in the join, it was right first time on both.
  - `map` welded two panel items into one word: "T R P O and P P O. S A C."
    came back as "TRPO and PPOSAC". One ordinary word between them, "Then
    S A C", separated them.
  - `question` lost the word "what" from B's opening question, turning it into
    a statement, and separately deleted the one-word sentence "Bellman."
    entirely. Both are the front-of-segment deletion this method names. The
    question is now "One question before we walk it. What actually changes...",
    so the fragile clause is not first, and Bellman got a verb: "And the
    Bellman equations tie it together."
  - `question` then echoed its own closing phrase, "plus the discounted value.
    And the discounted value of next", which is unadjudicable from the
    transcript. Written "Reward now, plus the discounted value of next", with
    the word "value" appearing once, it was clean at a character error of
    0.000.
  - `ident` read at 162 words a minute and `classical` at 158. Splitting their
    turns, two into five and six into eleven, with not one word changed,
    brought them to 149 and 152.

One label collision cost a beat's worth of rewriting and is worth naming,
because nothing about it is visible in the script. "REINFORCE" is a map pill,
and its squashed spelling sits inside the ordinary word "reinforcement", so
saying "Then deep reinforcement learning" at the head of the map's second
segment timed the whole deep RL column from there and reported a 3.6 second
lead. The line says "the deep learning era" now.

Names are spelled the way they should be said. Every acronym on the map is
spelled letter by letter in the narration, which is also what makes the pills
match: the orphan check drops single letters from the word set, so "DQN",
"RLHF", "GRPO", "RLVR", "SAC", "TRPO and PPO" and "A2C and A3C" pass only on
the squashed contiguous run, and the letters therefore run with nothing
between them. "SARSA" is written "Sarsa" as a word, because an all-caps name
is the shape that lost its first syllable elsewhere in this series.
"REINFORCE" is written "Reinforce" with a category word in front of it, "the
algorithm called Reinforce", because it is also an ordinary English verb and
the bare form is ambiguous to the ear. "Dr. GRPO" is "Doctor G R P O".
"TD(lambda)" is not said at all. No fragile name opens or closes a segment.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: rl"
SUBTITLE = "one line from Bellman to verifiers"
UPDATED = "21 September 2026"

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is, how current, and why it earns the time -----------------
# The title card's reserve is fixed at 2.4 inside `title_card` and is not
# settable from VISUALS.
SCRIPT["ident"] = [
    (A, "This is the map of reinforcement learning."),
    (A, "The branch of machine learning where an agent learns how to behave "
        "by interacting with an environment and maximising reward."),
    (A, "It earns an episode because most people arrive at one end of it or "
        "the other."),
    (A, "The classical theory, or what is being done to language models now."),
    (A, "This is the whole line, as the page stood on the twenty first of "
        "September, twenty twenty six."),
]

# --- the inventory, named before anything is explained --------------------
# Three columns, three reveals, so three segments, written roughly 40 / 38 /
# 22 percent. Reveal three lands exactly at `beat - reserve`, so everything
# said after the third column is named has to fit inside the reserve.
#
# The squashed-match constraint is why every acronym runs with nothing between
# its letters: the orphan check drops single letters from the word set, so
# "D Q N", "T R P O and P P O", "S A C" and the three in the last column pass
# only on the contiguous run.
SCRIPT["map"] = [
    (A, "Whole board first, and nothing explained yet. Three columns, left "
        "to right in the order the field arrived. On the left, the classical "
        "core. Markov decision processes and the Bellman equations. Dynamic "
        "programming. Monte Carlo and temporal difference learning. And "
        "Sarsa and Q learning, where the on and off policy split comes "
        "from."),
    (A, "Then the deep learning era, where networks replace tables. D Q N. "
        "The algorithm called Reinforce. A two C and A three C. T R P O and "
        "P P O. Then S A C. And the two that plan, AlphaZero and MuZero."),
    (A, "And the third column, where almost everybody arrives from now. "
        "R L H F. G R P O. R L V R. That is the whole board, and it goes in "
        "the corner now."),
]

# --- the organising question, and the object you need to answer it --------
# Five reveals: the head, then one item each. Segments about 23 / 23 / 23 /
# 23 / 10 percent, so the last one holds about a dozen words. The head carries
# the question, which is the longest thing said in the beat, and that is safe:
# reveal one lands at the top of the beat whatever it carries.
SCRIPT["question"] = [
    (B, "One question before we walk it. What actually changes when the "
        "environment is a conversation?"),
    (A, "That is the question the map is arranged around. And you cannot "
        "answer it without the object underneath all three columns."),
    (A, "A Markov decision process. It has states and actions, the things the "
        "agent can do in each state. That much is bookkeeping."),
    (A, "Then the thing that says where an action actually takes you. A "
        "transition distribution. Hold on to that one. It is the expensive "
        "unknown in every classical setting, and the reason the model based "
        "algorithms exist at all."),
    (A, "A reward and a discount factor, deciding how much the future "
        "counts. Together they turn an infinite horizon into a fixed point. "
        "And that fixed point is what every method on this board is "
        "approximating."),
    (A, "And the Bellman equations tie it together. Reward now, plus the "
        "discounted value of next."),
]

# --- one table, one axis: what the update consumes -------------------------
# Six reveals: the head row, then one row each, about 18 percent each with a
# short tail. The corner cell is filled rather than blank: an empty corner
# cell slid a whole header one column left in an earlier episode.
#
# The row labels are checked as claims by the orphan check, so the cells are
# phrased as things the narration actually says, and each row's name is placed
# at the END of its own segment, because being named after the picture is the
# direction `check_leads` passes by design. "DQN" is the only acronym in a
# cell and it passes on the squashed run, since the narration spells it out
# and single letters are dropped from the word set.
SCRIPT["classical"] = [
    (A, "So how do you solve those equations without the model?"),
    (A, "Every row is one answer, and the middle column is what the update "
        "consumes. Read it across."),
    (A, "The first row is the one that does have it."),
    (A, "It solves them exactly, but it needs a known model and a state space "
        "tiny enough to sweep. Dynamic programming."),
    (A, "Throw the model away and average the returns of whole episodes. "
        "Unbiased."),
    (A, "But a whole episode's randomness lands in every estimate, so it is "
        "noisy. Monte Carlo."),
    (A, "Or update from its own next guess."),
    (A, "Biased, much steadier, and it runs online on tasks that never "
        "terminate. Temporal difference learning."),
    (A, "And whose data is it? Sarsa bootstraps off the action it takes, so "
        "it only learns about the policy it is running."),
    (A, "Bootstrap off the best next action instead, and anybody's data will "
        "do. Off policy."),
    (A, "And that licence is what D Q N is built on. A network, plus a replay "
        "buffer, which breaks the correlation between consecutive "
        "transitions."),
]

# --- the policy-gradient ladder -------------------------------------------
# Five reveals, one per layer, about 23 / 23 / 23 / 23 / 10 percent. A `stack`
# because the order down the rungs IS the argument: each one exists to fix the
# one above it. It reveals in list order, top first, which is the order the
# tour walks it. A stack pill is a fixed five units wide, so the layer names
# are short and the glosses carry the content.
#
# B's turn sits at the end of the fourth segment rather than in the fifth,
# because the fifth is the reserve and holds about a dozen words.
SCRIPT["ladder"] = [
    (A, "The other branch optimises the policy directly, and it is a ladder "
        "where each rung fixes the one above it. At the top, the algorithm "
        "called Reinforce."),
    (A, "It raises the log probability of an action in proportion to how well "
        "it turned out. Unbiased, and very noisy. So, add a baseline."),
    (A, "Subtract something that depends only on the state. Variance drops, "
        "the gradient stays unbiased, and that baseline turns the return into "
        "an advantage. Learn that baseline with a critic of its own, and you "
        "have actor critic."),
    (A, "The bottom two rungs are about step size. T R P O made the largest "
        "safe step precise, with a K L constraint, at second order cost."),
    (B, "And that is the one that ended up in the language model loop?"),
    (A, "The rung below it. P P O clips the ratio instead. First order, and "
        "cheap."),
]

# --- the join -------------------------------------------------------------
# Five reveals: the head row, then one row each, about 23 percent each with a
# short tail. A `table` rather than the cleared cut's `compare`, which is a
# two-reveal panel and cannot carry a forty five second line.
#
# The fourth row exists because of the arithmetic rather than in spite of it.
# On three rows, the page's payoff sentence, that credit assignment over
# thousands of tokens is now the hard part, had to live in the twelve word
# tail after the last reveal, and `check_leads` measured the narrator six and
# a half seconds ahead of the picture. Adding a row is the cheap fix the
# method names, and the row is the page's own sentence: the environment model
# was the expensive unknown, and it is credit assignment now.
#
# Its middle cell says "knowing the world" rather than "the environment",
# because "the environment" is spoken two segments earlier, in the actions
# row, and a reveal is matched wherever its label first appears.
SCRIPT["llm_turn"] = [
    (A, "Third column. The join between these two fields is smaller than the "
        "jargon suggests, and this table is the whole of it."),
    (A, "Token generation is itself a Markov decision process."),
    (A, "Classically you never know how the world will respond, and model "
        "based methods exist to cope with that."),
    (A, "Here the state is the text so far, and the transition is: append "
        "the token."),
    (A, "Second row. Classically the actions are whatever the environment "
        "allows."),
    (A, "Here it is the vocabulary, every token in it, at every single "
        "step."),
    (A, "And the reward. Classically it arrives as you go. Here it arrives "
        "once, at the very end."),
    (A, "So the hard part is no longer knowing the world. It is credit "
        "assignment, over thousands of tokens."),
]

# --- the lineage ----------------------------------------------------------
# Five reveals: the head, then one item each, about 23 / 23 / 23 / 23 / 10
# percent. The GRPO caveat is the last row rather than a beat of its own: the
# page carries it as a parenthesis inside one sentence, and a beat for four
# paper names is a beat spent on a list.
SCRIPT["lineage"] = [
    (A, "Those three names are one lineage, in the order they arrived. Each "
        "step deletes a piece of the machinery you just watched me build. So "
        "watch what goes, and what has to stay."),
    (A, "R L H F. A reward model, then P P O. Reinforcement learning from "
        "human feedback trains a model of what people prefer, and optimises "
        "against it, with a per token K L penalty."),
    (A, "G R P O deletes the critic. That is group relative policy "
        "optimisation: it samples a group of answers to one prompt and uses "
        "their mean reward as the baseline. The same advantage, sampled "
        "rather than learned."),
    (B, "And where do the humans go?"),
    (A, "R L V R deletes the reward model. Reinforcement learning from "
        "verifiable rewards puts a programmatic verifier there instead. Did "
        "the tests pass. Is the proof valid."),
    (A, "One caveat, and it is the last two rows. That first version of "
        "G R P O has known biases, so the published version is patched."),
    (A, "Doctor G R P O, D A P O, G S P O. Those three are the "
        "corrections."),
]

# --- the take -------------------------------------------------------------
# Six reveals on the closing beat, deliberately, at about 18 percent each with
# a short tail. Every overview in this series before the still-frame check
# could fire ended on a card that drew itself once and then sat motionless for
# fifteen to thirty seconds.
#
# One tone throughout, and it is `subject`. A `points` panel takes one tone
# for every item, so toning this list anything else would deliver a verdict on
# whichever lines happen not to fit it.
SCRIPT["close"] = [
    (A, "So what actually changed when the environment became a conversation? "
        "Less than the new vocabulary suggests."),
    (A, "The recursion still holds. A value is still a reward now, plus the "
        "discounted value of whatever comes next."),
    (A, "An advantage is still an advantage, learned by a critic or sampled "
        "from a group of answers."),
    (A, "What moved is where the difficulty sits. The environment model got "
        "free. Append the token, and you know the next state."),
    (A, "And the reward got expensive. Either a learned model of human "
        "preference, or a verifier somebody had to sit down and build."),
    (A, "Which is why the work moved to the loop around the algorithm."),
]

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame, and the page's own "Map of the space": three eras, left
    # to right in the order they arrived, because the through-line is this
    # episode's argument rather than a taxonomy imposed on it.
    #
    # Three columns is the roomy case for a map beat: `panel_columns` derives
    # the pill from the column count, `max(2.5, min(4.2, (free - 0.7 x (n-1))
    # / n))`, so at three the pill is at its 4.2 ceiling and about twenty-two
    # characters fit. Every item here is inside twenty.
    #
    # Tones: see the note in the docstring. No column is `context`, so every
    # column has somewhere to brighten from, and no column is `cost`.
    #
    # `reserve` is 8.0 rather than 5.0 because a parked beat spends two
    # seconds of settle and a 0.7 second morph out of the FRONT of the
    # reserve. The format's premise is that the viewer sees the whole field
    # standing still before any part of it means anything, and at 8.0 the
    # finished board is motionless for about five and a half seconds.
    "map": {"kind": "columns", "park": True, "reserve": 8.0, "columns": [
        {"head": "the classical core", "tone": "verified", "items": [
            "MDPs and Bellman",
            "dynamic programming",
            "Monte Carlo and TD",
            "SARSA, Q-learning"]},
        {"head": "deep RL", "tone": "machinery", "items": [
            "DQN",
            "REINFORCE",
            "A2C and A3C",
            "TRPO and PPO",
            "SAC",
            "AlphaZero, MuZero"]},
        {"head": "RL for LLMs", "tone": "subject", "items": [
            "RLHF",
            "GRPO",
            "RLVR"]},
    ]},

    # The formal object, as four items under a head that carries the question.
    # `points` rather than the cleared cut's `claim`, which draws its headline
    # first and then has nothing left to do for the rest of the beat.
    #
    # The items stay inside thirty characters, which is what a `points` item
    # has in the seven point eight units left beside the parked map.
    "question": {"kind": "points", "tone": "verified", "reserve": 5.0,
                 "focus": "the classical core",
                 "head": "what all of it optimises over",
                 "items": [
                     "states and actions",
                     "a transition distribution",
                     "a reward and a discount",
                     "the Bellman equations",
                 ]},

    # The head row is a reveal of its own, so this is six reveals rather than
    # five. The corner cell is filled rather than blank. Cells stay inside
    # nineteen characters, which is what fits beside the parked map.
    "classical": {"kind": "table", "reserve": 5.0,
                  "focus": ["the classical core", "deep RL"],
                  "head": ["how you learn", "from what", "what you get"],
                  "rows": [
                      ["dynamic programming", "a known model", "exact, but tiny"],
                      ["Monte Carlo", "whole episodes", "unbiased, noisy"],
                      ["TD learning", "its own next guess", "biased, steadier"],
                      ["Q-learning", "anybody's data", "off-policy"],
                      ["DQN", "a replay buffer", "correlation broken"],
                  ]},

    # The ladder, as a stack, because the order of the rungs is the whole
    # argument. Toned `machinery`: these are stabilisation devices rather than
    # measured figures or verdicts.
    "ladder": {"kind": "stack", "tone": "machinery", "reserve": 5.0,
               "focus": "deep RL",
               "layers": [
                   ("REINFORCE", "the sampled return: very noisy"),
                   ("a baseline", "variance drops, still unbiased"),
                   ("actor-critic", "learn the baseline, with a critic"),
                   ("TRPO", "a KL constraint on the step"),
                   ("PPO", "clips the ratio instead"),
               ]},

    # Three pieces of the formal object, classically and for a language model.
    # The grid is the content: the episode's whole argument is that one of
    # these three rows got cheaper and one got dearer.
    "llm_turn": {"kind": "table", "reserve": 5.0, "focus": "RL for LLMs",
                 "head": ["the piece", "classical RL", "token generation"],
                 "rows": [
                     ["the transition", "never known", "append the token"],
                     ["the actions", "whatever is allowed", "the vocabulary"],
                     ["the reward", "as you go", "once, at the end"],
                     ["the hard part", "knowing the world", "credit assignment"],
                 ]},

    # No focus: the beat before it left the map lit on RL for LLMs, which is
    # the state this beat wants.
    "lineage": {"kind": "points", "tone": "subject", "reserve": 5.0,
                "head": "one lineage, two deletions",
                "items": [
                    "RLHF: a reward model, then PPO",
                    "GRPO deletes the critic",
                    "RLVR deletes the reward model",
                    "the published version is patched",
                    "Doctor GRPO, DAPO, GSPO",
                ]},

    # The take, as five lines that unfold with it rather than one card held
    # still for the length of the conclusion.
    "close": {"kind": "points", "tone": "subject", "reserve": 4.0,
              "focus": ["the classical core", "deep RL", "RL for LLMs"],
              "head": "what actually moved",
              "items": [
                  "the recursion still holds",
                  "still an advantage",
                  "the environment model got free",
                  "the reward got expensive",
                  "the work moved to the loop",
              ]},
}


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    turns = sum(len(t) for t in SCRIPT.values())
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {turns} turns ({b_turns} for B), {words} words")
    secs = words * 0.42
    print(f"about {secs / 60:.2f} minutes ({secs:.0f}s) at 0.42 s/word")
    for key, t in SCRIPT.items():
        w = sum(len(line.split()) for _, line in t)
        print(f"  {key:11s} {w:3d} words  ~{w * 0.42:4.0f}s  ({len(t)} turns)")
