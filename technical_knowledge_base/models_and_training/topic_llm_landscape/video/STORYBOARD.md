---
format: 1920x1080
duration: 90s
message: "Every frontier lab now shares one skeleton, so only two bets separate them: where the test-time budget is spent, and what the model costs to serve."
arc: concept-explainer
audience: "An MSc-level AI engineer (Khalid)"
mode: autonomous
music: none
---

# STORYBOARD: Topic: llms, the two bets

Structure: `concept-explainer`. Hook (counterintuitive claim) lands the message in beat 1 and names it in beat 2; the body is two bets on one consistent stage (two axes), each with its mechanism and its consequence; the payoff applies the same frame to benchmarks; the close distils it to two questions. Every fact is from the page "Topic: llms" (`capture/extracted/visible-text.txt`).

## Video direction

- **palette system** (from `frame.md`, Broadside): dark register (`ink-black` ground, `cream` text, `fire-orange` the single accent) for every frame except Frame 4 and Frame 8, which switch to the orange register (`fire-orange` ground, `ink-black` text) as the two declarative beats. Secondary text uses `cream-muted`; hairlines and chrome use `border-dark`. Bet one is always marked with the accent; nothing else competes for orange in the same frame.
- **type**: display and h1 in Barlow lowercase heavy weights as graphic primitives; all labels, lab names as chips, numbers' units and slide chrome in IBM Plex Mono uppercase label style. Numbers use `stat-value` with tabular figures.
- **recurring stage**: the "two bets" device introduced in Frame 2 (two stacked horizontal bands, `01 budget` and `02 serving bill`) returns as a small mono chrome tag top-left in Frames 3, 5, 6, 7, highlighting the active bet, so the body reads as one film.
- **motion grammar + reveal model**: long-tail `power3` settles; nothing bouncy. Every piece reveals on its spoken cue (VO-paced); at t=0 only what the VO says first is on screen; the back half of each frame carries reveals. Holds are still; the only aliveness is low-amplitude jitter on one held element.
- **rhythm / held frames**: Frame 4 (recurrent depth, orange register) is the first held breather after the dense Frame 3; Frame 8 is the final held landing. Frames 3, 5, 7 are the busiest.
- **negative list**: no purple-blue AI gradients, no bokeh, no generic network-brain imagery, no logos (lab names are typeset text chips, never brand marks), no em-dash characters anywhere, no slideshow front-loading, no screensaver floating, no lazy breathing, no back-half pans or pushes, no `repeat`/`yoyo`, no randomness. Content stays in the top ~83% (caption band).

## Frame 1: Hook: rankings vs bets

- scene: A "#1" slot hard-cuts through four different leaders, each tagged with the benchmark it leads, then shrinks aside as a slow, heavy line about the bets lands
- voiceover: "Capability rankings change every month. The bets that separate the labs move over years."
- duration: 5.438s
- transition_in: cut
- status: animated
- src: compositions/frames/01-hook.html
- type: hook
- persuasion: Counterintuitive claim + contrast (fast vs slow)
- beat: Curiosity + intrigue
- blueprint: fixed-anchor-cycle (Adapt)
- focal: the "#1" slot token cycle, then the hero line "the bets move over years"
- roles: "#1" slot with model name + mono "leads on" tag = foreground subject (Scene 1) · hero line = foreground subject (Scene 2) · faint 1px hairline grid and mono chrome "TOPIC: LLMS / KNOWLEDGE BASE" = background · small label "capability rankings" = supporting
- sfx: glitch-1, impact-bass-1

narrativeRole: Opens the gap: the thing everyone watches (the leaderboard) is the noisy signal; the slow signal underneath is what predicts a lab.
keyMessage: Leaderboards churn monthly; the two bets underneath move over years.

Adapt: keep the pinned-anchor signature (the "#1" never moves while its adjacent slot cycles by hard cut): a fixed "#1" slot whose model name hard-cuts four times, each a leader the page names for a different benchmark ("claude opus 5.5 / most published comparisons", "gpt-6 astra / terminal-bench-science 0.1", "mimo-v2.6-pro / open weights, aa index", "glm-5.3 / real-swe private codebases"); then a statement beat lands.
Scene 1 (0.0 to 2.6s): left 60/40 asymmetric layout; kicker label "capability rankings" (mono, cream-muted), a huge "#1" in fire-orange and beside it the model name at h2 with a mono "leads on" tag under it; as the VO says "change every month" the name and tag hard-cut through the four leaders (in-place token cycle → `discrete-text-sequence`). A mono stamp "the leader changes by task" sits under the slot.
Scene 2 (2.6 to 4.6s): on "The bets that separate the labs" the #1 slot slides left and dims to ~30% (scale-swap → `scale-swap-transition`) while the hero line "the bets move over years." assembles per word at display scale, right-weighted (per-word staggered reveal → `dynamic-content-sequencing`), "years" in fire-orange.
Scene 3 (4.6 to end): held read on the hero line; a 1px orange underline draws under "years" (`svg-path-draw`); still, subtle jitter at most.

## Frame 2: One skeleton, two bets

- scene: Three skeleton layers stack into one shared spine, stamped "every flagship"; then the spine fades back and two bet bands slide out of it, labelled 01 and 02
- voiceover: "By late September 2026, every flagship shares one skeleton. Sparse mixture of experts. A reasoning mode. A million-token context. So only two things are left. Where the test-time budget is spent. And what the model costs to serve."
- duration: 17.517s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/02-skeleton.html
- type: product_intro
- persuasion: Frame-then-fill + subtractive framing (name what everyone shares, so what is left is the difference)
- beat: Orientation + clarity
- blueprint: grid-card-assemble (Adapt)
- focal: the three-layer skeleton stack, then the two bet bands
- roles: skeleton layer bars "sparse MoE" / "reasoning mode" / "1M-token context" = foreground subject · kicker "late september 2026" and stamp "every flagship" = supporting · two bet bands "01 where the test-time budget is spent" / "02 what the model costs to serve" = foreground subject (back half) · hairline grid = background
- sfx: click-soft, whoosh-short

narrativeRole: Names the shared skeleton so the viewer can subtract it, then states the thesis: what is left are two bets.
keyMessage: Sparse MoE, a reasoning mode and 1M context are table stakes; only the budget and the serving cost differ.

Adapt: keep the staggered self-assembly of N items (three layer bars stack bottom-up on their spoken cues), then the array clears to the payoff (two bands), which is the grid-card "clears to a payoff line" variant.
Scene 1 (0.0 to 3.4s): centered; mono kicker "late september 2026" then h1 "one skeleton." enters per word on "every flagship shares one skeleton" (`dynamic-content-sequencing`).
Scene 2 (3.4 to 7.2s): h1 lifts to the upper third; three wide layer bars stack bottom-up, one per VO cue: "sparse mixture of experts" (sub-label mono: "dense only at small scale"), "reasoning mode" (sub-label: "test-time budget"), "1M-token context" (sub-label: "table stakes") (staggered cascade → `grid-card-assemble` recipe via `dynamic-content-sequencing`); each bar is cream on border-dark with a mono index 1, 2, 3. Centered, ~55% of frame.
Scene 3 (7.2 to 9.0s): on "only two things are left" the three bars compress into one thin dim spine at the top (scale-swap → `scale-swap-transition`), and a mono label "shared" stamps beside it.
Scene 4 (9.0 to end): two full-width bands slide out from under the spine on their cues: band 01 "where the test-time budget is spent" with a fire-orange index block, then band 02 "what the model costs to serve" with a cream index block (full-width strip, `center-outward-expansion`). Held read on the two bands; still.

## Frame 3: Bet one: four ways to spend the budget

- scene: One budget block in fire-orange flows into four lanes, each lab's lane ending in a different sink: a hidden router box, a caller-held dial, parallel branches, and a loop that never emits text
- voiceover: "Bet one, the budget. OpenAI hides it behind a router. Anthropic lets the caller set an effort level. Gemini Deep Think spreads it across parallel branches. And GPT-6 Astra sinks it into activations."
- duration: 13.918s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/03-budget.html
- type: feature_showcase
- persuasion: Numbered enumeration + comparison of four options on one stage
- beat: Comprehension + fascination
- blueprint: spatial-pan-stations (Adapt)
- focal: the four lanes diagram, each lane's sink glyph
- roles: source block "test-time budget" (fire-orange) at left = foreground subject · four horizontal lanes with lab chips "OPENAI", "ANTHROPIC", "GEMINI DEEP THINK", "GPT-6 ASTRA" = foreground subject · sink glyphs (closed box with "router" label; slider labelled "caller-set token budget"; three forking branch lines labelled "parallel branches"; a looping arrow labelled "activations, never text") = supporting · chrome tag "01 budget" top-left = supporting · hairline grid = background
- sfx: whoosh-short, click-soft, click-soft, click-soft

narrativeRole: Shows the first bet as four concrete, distinct design choices for where deliberation goes.
keyMessage: The labs differ in where the test-time budget goes: hidden by a router, set by the caller, spread across branches, or sunk into activations.

Adapt: keep the stations-on-one-canvas idea but as a locked stage (no camera pan, to avoid back-half motion): four stations are lanes on one diagram, each revealed when the VO names its lab; the signature "callout per station" is each lane's sink glyph drawing on.
Scene 1 (0.0 to 2.2s): asymmetric 30/70; chrome tag "01 budget" top-left; the fire-orange source block "test-time budget" seats left-center with h2 "bet one, the budget." above the diagram area (per-word reveal → `dynamic-content-sequencing`).
Scene 2 (2.2 to 5.0s): on "OpenAI hides it behind a router" lane 1 draws from the source (`svg-path-draw`) to a closed box glyph; chip "OPENAI" and label "router, hidden" land.
Scene 3 (5.0 to 7.4s): on "Anthropic hands it to the caller" lane 2 draws to a slider glyph whose knob slides to a set point (`svg-path-draw` + `stat-bars-and-fills`); label "caller-set token budget".
Scene 4 (7.4 to 10.4s): on "Gemini Deep Think spreads it across parallel branches" lane 3 draws and forks into three parallel lines (`svg-path-draw`); label "parallel branches".
Scene 5 (10.4 to end): on "GPT-6 Astra sinks it into activations" lane 4 draws into a loop that circles back on itself and ends with no output tick (`svg-path-draw`); label "activations, never text" in fire-orange; the other three lanes dim to ~50% (`depth-of-field-blur`, light). Hold.

## Frame 4: Recurrent depth: deliberation you cannot read

- scene: Orange register; a stack of layer bars with an arrow looping from the top layer back to the bottom, while a transcript line beside it stays blank; the line "deliberation a monitor cannot read" lands
- voiceover: "That is recurrent depth. The model loops activations back through its own layers. Deliberation a monitor cannot read."
- duration: 6.957s
- transition_in: crossfade
- status: animated
- src: compositions/frames/04-recurrent-depth.html
- type: benefit_highlight
- persuasion: Concretization (show the loop) + coined term
- beat: Unease + "aha"
- blueprint: titlecard-reveal (Adapt)
- focal: the looping arrow around the layer stack
- roles: stack of six layer bars (ink-black outlines on orange) = foreground subject · looping arrow = foreground subject · a "transcript" panel with an empty cursor line = supporting · term "recurrent depth" at h1 = foreground subject (Scene 1) · line "deliberation a monitor cannot read." = foreground subject (Scene 3)
- sfx: whoosh-cinematic

narrativeRole: Lands the most consequential of the four choices and why it matters: reasoning that leaves no trace.
keyMessage: Recurrent depth spends test-time compute in latent space, so a monitor or harness cannot read it from the transcript.

Adapt: keep the calm breather shape with one restrained reveal per cue and a still hold; the restrained move is the loop arrow drawing once.
Scene 1 (0.0 to 2.0s): orange register, rule-of-thirds; term "recurrent depth." enters at h1 upper-left (per-word reveal → `dynamic-content-sequencing`); mono kicker "gpt-6 astra".
Scene 2 (2.0 to 5.6s): on "loops activations back through its own layers" a six-bar layer stack builds right-of-center bottom-up, then an arrow draws from the top bar around and back into the bottom bar (`svg-path-draw`); beside it a small panel labelled "transcript" with a blinking-free empty line stays blank (still).
Scene 3 (5.6 to end): on "deliberation a monitor cannot read" the line sets at quote-text scale beneath the term (per-word reveal); held read, still.

## Frame 5: Bet two: the serving bill

- scene: A tall total-parameter bar beside a short active-parameter bar for Step 5 Preview (600B vs 27B); then a row of attention-variant chips stamps in under "every lab ships sparse or linear attention"
- voiceover: "Bet two, the serving bill. The race moved from total parameters to active ones. Step 5 Preview: six hundred billion total, twenty-seven billion active. And every lab now ships sparse or linear attention."
- duration: 14.197s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/05-serving-bill.html
- type: feature_showcase
- persuasion: Worked example with real numbers + before/after (total vs active)
- beat: Comprehension + momentum
- blueprint: dataviz-countup (Adapt)
- focal: the 600B total vs 27B active bar pair
- roles: two vertical bars, "total 600B" (cream outline, tall) and "active 27B" (fire-orange fill, short) = foreground subject · counters "600B" and "27B" = foreground subject · chrome tag "02 serving bill" = supporting · attention chips "DSA / CSA", "MSA", "KDA", "QSA" = supporting (Scene 4) · hairline grid = background
- sfx: whoosh-short, pop, pop

narrativeRole: Shows the second bet as a number you can see: what matters is how much of the model runs per token, and how attention scales.
keyMessage: Serving cost is set by active parameters and by sparse or linear attention, not by total size.

Adapt: keep the count-up hero metric with bars filling; drop the camera push-through (no back-half motion), replace with a locked stage where the bars grow on their spoken cues.
Scene 1 (0.0 to 2.4s): split 50/50; chrome tag "02 serving bill"; h2 "bet two, the serving bill." left (per-word reveal).
Scene 2 (2.4 to 5.4s): on "from total parameters to active ones" two mono column labels "total" and "active" appear right, baseline hairline draws (`svg-path-draw`).
Scene 3 (5.4 to 10.0s): on "six hundred billion total" the total bar grows tall with counter 0 to 600B (`counting-dynamic-scale` + `stat-bars-and-fills`); on "twenty-seven billion active" the active bar grows only a sliver in fire-orange with counter 0 to 27B; a mono label "step 5 preview, stepfun" sits under the pair, and a small note "smallest active count in the frontier band".
Scene 4 (10.0 to end): on "every lab now ships sparse or linear attention" a row of four mono chips stamps in left under the h2: "DEEPSEEK DSA / CSA", "MINIMAX MSA", "KIMI KDA", "QWEN QSA" (staggered `spring-pop-entrance` in its smooth register); held read.

## Frame 6: Receipts: the reversal and the 56 / 14 split

- scene: A "decoder-only" stamp gets struck through and replaced by "encoder-decoder, 552B" with a KV-cache bar shrinking; then two big stats 56% tokens and 14% spend split the frame
- voiceover: "DeepSeek even reversed the decoder-only consensus, for the KV cache. And on one large gateway, open weights carry 56 percent of tokens on 14 percent of spend."
- duration: 11.838s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/06-receipts.html
- type: social_proof
- persuasion: Common-belief vs reality + statistical proof
- beat: Surprise + conviction
- blueprint: comparison-split (Adapt)
- focal: the struck-through "decoder-only" stamp, then the 56% / 14% pair
- roles: "decoder-only consensus" stamp with orange strike = foreground subject · replacement card "deepseek v4.1-flash, encoder-decoder, 552B" with a KV-cache bar shrinking to about one quarter (label "kv cache: about 1/4 of v4-flash hbm") = foreground subject · two stat cards "56% of token volume" and "14% of spend", labelled "open weights, one large production gateway" = foreground subject (back half) · chrome tag "02 serving bill" = supporting
- sfx: glitch-2, impact-bass-2

narrativeRole: Grounds bet two in two receipts: a lab changed its whole architecture for serving cost, and the market split shows open weights winning on cost.
keyMessage: Serving economics now drive architecture (DeepSeek's encoder-decoder) and market share (open weights: 56% of tokens, 14% of spend).

Adapt: keep the two equal-weight cards entering from opposite wings with mirrored tilts and the inner-edge badge punctuation, but only for the back-half stat pair; the first half is the reversal beat.
Scene 1 (0.0 to 2.8s): centered; a large mono-outlined stamp "decoder-only consensus" sets; on "reversed" a fire-orange strike line draws through it (`css-marker-patterns`).
Scene 2 (2.8 to 5.4s): the stamp slides up and dims; a card "deepseek v4.1-flash / encoder-decoder / 552B" lands; on "for the KV cache" a KV-cache bar shrinks from full to about one quarter (`stat-bars-and-fills`), label "kv cache: about 1/4 of v4-flash hbm".
Scene 3 (5.4 to 9.0s): the card group compresses to the upper band; on "56 percent of tokens" the left stat card enters from the left wing with mirrored tilt (`split-tilt-cards`), counter to 56% (`counting-dynamic-scale`); on "14 percent of spend" the right card enters from the right wing, counter to 14%.
Scene 4 (9.0 to end): a mono badge "open weights, one large production gateway" lands at the inner edge between the cards (`spring-pop-entrance`); held read.

## Frame 7: Same weights, 37 points apart

- scene: Two bars on the same model label "GPT-6 Astra, ARC-AGI-3": standard harness 62.7%, provider adapter 99.9%; a bracket between their tops reads "37 points"; the stamp "same weights" lands
- voiceover: "Benchmarks follow the same bets. On ARC-AGI-3, Astra scored 62.7 percent in the standard harness. With an adapter that keeps its hidden reasoning state, 99.9. Same weights, 37 points apart."
- duration: 13.557s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/07-harness.html
- type: social_proof
- persuasion: Demonstration + comparison of two options (same model, two harnesses)
- beat: Surprise + "aha"
- blueprint: dataviz-countup (Adapt)
- focal: the 62.7 vs 99.9 bar pair and the 37-point bracket
- roles: two horizontal bars, "standard harness" (cream) and "provider adapter, keeps opaque reasoning state" (fire-orange) = foreground subject · counters 62.7% and 99.9% = foreground subject · bracket "37 points" = supporting · stamp "same weights" = foreground subject (end) · small mono footnote "adapter run: 3.66x faster, 49% cheaper in tokens" = supporting · chrome tag "01 budget" = supporting · hairline grid = background
- sfx: whoosh-short, click, impact-bass-1

narrativeRole: Pays off the frame: a benchmark number measures where the budget is spent (the harness), not just the weights.
keyMessage: Astra's ARC-AGI-3 score is a harness number: 62.7% standard, 99.9% with the adapter, same weights.

Adapt: keep the count-up hero metric signature on a locked stage; the hero is the gap between two bars rather than a single number; no camera push.
Scene 1 (0.0 to 2.6s): chrome tag "01 budget"; h2 "benchmarks follow the same bets." enters per word, upper third.
Scene 2 (2.6 to 6.4s): on "On ARC-AGI-3, Astra" a mono label "gpt-6 astra, arc-agi-3" sets; on "62.7 percent in the standard harness" bar one grows left to right with counter to 62.7% (`stat-bars-and-fills` + `counting-dynamic-scale`), label "standard harness".
Scene 3 (6.4 to 10.0s): on "an adapter that keeps its hidden reasoning state, 99.9" bar two grows in fire-orange to 99.9%, label "provider adapter, keeps opaque reasoning state".
Scene 4 (10.0 to end): on "Same weights, 37 points apart" a bracket draws between the two bar ends with label "37 points" (`svg-path-draw`), the stamp "same weights" lands at display scale right (`spring-pop-entrance`, smooth), and the footnote "adapter run: 3.66x faster, 49% cheaper in tokens" fades in small; held read.

## Frame 8: Two questions

- scene: Orange register; the two bet bands return as two big questions stacked: "where does the budget go?" and "what does it cost to serve?"
- voiceover: "So read every release as two questions. Where does the budget go? And what does it cost to serve?"
- duration: 6.037s
- transition_in: crossfade
- status: animated
- src: compositions/frames/08-two-questions.html
- type: branding
- persuasion: Distillation + callback (the two bands from Frame 2)
- beat: Clarity + "now I get it"
- blueprint: titlecard-reveal (Adapt)
- focal: the two stacked questions
- roles: question 01 "where does the budget go?" and question 02 "what does it cost to serve?" at h1 = foreground subject · mono kicker "read every release as" = supporting · index blocks 01 / 02 in ink-black = supporting · source line "source: topic: llms, technical knowledge base" mono, small, bottom of the safe area = supporting
- sfx: chime

narrativeRole: Turns the explainer into a reusable reading habit; callback to the two bands.
keyMessage: For any new model, ask where the budget goes and what it costs to serve.

Adapt: keep the calm landing card with one restrained move per cue (here a two-card chain, question 01 then question 02), ending on a still hold (the final frame owns a real exit: a slow fade of everything to the orange ground in the last 0.6s).
Scene 1 (0.0 to 2.4s): orange register, left-aligned; mono kicker "read every release as two questions" sets (per-word reveal).
Scene 2 (2.4 to 4.6s): on "Where does the budget go?" question 01 with index block "01" slams up at h1 (smooth long-tail, `dynamic-content-sequencing`).
Scene 3 (4.6 to 7.4s): on "what does it cost to serve?" question 02 with index block "02" lands below; the source line fades in small at the bottom of the safe area; held read.
Scene 4 (7.4 to end): final exit, all elements fade together to the plain orange ground.
