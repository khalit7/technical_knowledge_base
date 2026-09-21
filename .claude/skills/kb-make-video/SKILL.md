---
name: kb-make-video
description: Produce a narrated explainer video derived from a KB page: the spine, the animation and transitions, the script, the voice, and the weekly news format. The written page stays canonical.
---

# Produce technical explainer video

*Mirrored from Notion, where it is the source of truth. Edit it there:*
*Me -> _AI -> Skills -> Produce technical explainer video. Changes here are overwritten by the next sync.*

Produce a narrated explainer video derived from a Technical knowledge base page: how it is structured, animated, scripted and voiced, and where it lives when it is done. The written page stays canonical.

## Use when

Asked to create or revise a technical explainer video derived from a Technical knowledge base page, or when an explanation would genuinely be easier to follow as a video. This includes the weekly news edition. Load it before the first line of script is written.

## Read first

The canonical page being explained, and [Maintain technical knowledge base](../kb-maintain/SKILL.md) for the writing and accuracy conventions the video must respect.

## Principle

A video is an optional **derived representation** of a topic or deep dive. The written page remains the source of truth, and the video may not claim more than the page it derives from. Keep the video attached to the page it explains rather than building a separate Videos hierarchy.

### Explaining more than the page says

The page is written for a reader who can stop and think. A listener cannot, so a video is allowed, and often obliged, to add explanation the page leaves implicit: what an abbreviation stands for, who a company is, why a figure should be read with suspicion. "Anthropic measured Anthropic" is precise and, spoken aloud, means nothing; "these are self reported numbers, and the company that published them benefits from the answer" is the same fact made usable.

Two limits on that freedom:

- **Add explanation, never claims.** Context, definitions, plain restatements and caveats are the video's to add. A new fact, figure or conclusion is not: if it is worth asserting, it is worth asserting on the page.
- **Back-port it.** If a line of narration explains something better than the page does, the page is now the weaker of the two. Put the explanation on the page in the same session. The page is the thing that lasts; the video is the thing that made the gap obvious.
Borrow the method of the best explainers, not their visual identity: build an original visual system for this knowledge base.

## What we are borrowing, and from what evidence

Both methods were studied from the creators' own videos (transcripts of "Attention in transformers" and "But what is a neural network?", and of "Agent Harness explained in 8min", "Kimi K3 explained in 13min" and "Why Inference is hard"), not from descriptions of them.

### 3Blue1Brown (Grant Sanderson)

The goal he states for his own work is that the viewer should come away feeling they could have invented the thing. What that looks like in a script:

- **Concrete before abstract.** Examples precede the general statement and the definition lands last. The attention chapter spends minutes on the word "mole" in three different sentences, and on a mystery novel ending "therefore the murderer was", before a single matrix appears.
- **One load-bearing idea per beat, named aloud.** "The most important idea I want you to have in mind is how directions in this space can correspond with semantic meaning."
- **Name the confusion instead of hiding it.** "A lot of people find the attention mechanism very confusing, so don't worry if it takes some time for things to sink in."
- **"You and I".** The viewer is a co-investigator, not an audience. First person plural throughout.
- **The visual is the argument.** If you deleted the picture, the sentence would stop being a proof. Nothing on screen is decoration.
- **Recap, then promise.** Every chapter restores the state you need, then says what will be built with it.
- **Hand over the mental image explicitly.** "The picture you might have in mind is..."

### Caleb Writes Code

The same market this knowledge base lives in: six to thirteen minute artificial intelligence explainers, one story followed all the way down, released against the news cycle.

- **Cold open on a live confusion or a shared reference point, then the sharp question.** "Agent harness is one of those terms that is so confusing... how exactly is harness engineering different from prompt engineering and context engineering?"
- **Refuse the obvious take.** "What is really impressive is not the benchmarks, it is how it affects the layers below."
- **History as a causal chain.** Start where the viewer already stands (four thousand token context windows), then walk forward, each step caused by the previous step's limit. This is the engine of the whole video.
- **A ladder of layers, and the ladder is the visual.** Prompt inside context inside harness. Model layer down through semiconductors to the economics of inference.
- **Numbers as the spine.** Activation ratios compared across named models, not adjectives.
- **State the contract, and the difficulty.** "There is a lot to go through, so let's start with what we already know and build from there." "This one gets more technical as it goes on."
- **Pre-empt the objection out loud.** "One clarification to be made here is that harness engineering does not deprecate context engineering."
- **Close on a take or an open question,** never a bulleted recap.
- **Connective tissue is spoken, not structural.** So, and, but, now. There are no visible chapter walls and no "section two of five".
Where they differ: 3Blue1Brown builds one idea to depth and earns every abstraction; Caleb moves fast over a news object and changes altitude often. This knowledge base carries technical news and technical explanation, so take Caleb's framing and pace with 3Blue1Brown's honesty about mechanism.

## Say what this is before you say anything else

Every video opens by orienting the viewer, whatever its format. This is not in tension with opening on tension: it is what makes the tension mean something. A viewer who cannot tell what they are watching stops watching, and dropping somebody into a surprising number about a subject they have not been told is the subject does not intrigue them, it loses them.

The opening does three things, in about twenty seconds, before the first beat of the spine:

1. **Name the subject**, in the words the page uses.
2. **Say what it actually is**, in one plain sentence. "Where data sits on a graphics card, and what it costs to move it from one of those places to another."
3. **Say why it earns the time.** The one-line reason this is worth watching rather than skimming.
A title card alone does not do this. It names the video without telling anyone what is in it, which is the failure this rule exists to prevent.

Then, after the tension and the question, **the contract**: where the next few minutes go, in the order they go there. Four short steps on screen is enough, and it is the one place a video is allowed to look like an agenda, because by then the viewer has a reason to want it.

## The spine

Every video, explainer or news, follows this shape. Timings are for an eight minute piece.

1. **Tension (0:00 to 0:25).** The confusion, the surprising number, or the thing everyone got slightly wrong. No greeting, no agenda, no "in this video we will".
2. **The sharp question (0:25 to 0:40).** One sentence that the whole video answers. Say it out loud.
3. **The contract (0:40 to 1:00).** Where we start, roughly where we end, and a warning if it gets harder later. Do not drop this beat from anything longer than about three minutes: the two minute news cut can lose it because the viewer can hold the whole thing in their head, and a six minute deep dive cannot.
4. **Common ground (1:00 to 2:00).** What the viewer already knows, restored as the first rung of the ladder.
5. **The causal walk (2:00 to 6:00).** One idea per beat, each beat caused by the limit of the one before. Concrete example first, mechanism second, name of the thing last.
6. **The number (inside the walk).** One worked figure or comparison that makes the claim physical.
7. **The objection (6:00 to 7:00).** The thing a knowledgeable viewer is about to say. Say it first, then answer it.
8. **The take (7:00 to 8:00).** What this changes, what to watch, what is still unsettled. Stop there.

## Production pipeline

1. **Read the canonical page** and the material it links. Resolve factual gaps before scripting. A figure that cannot be traced back to the page does not go in.
2. **Decide the mental model** the viewer should leave with, and the one sentence the video answers.
3. **Outline against the spine, then revise the outline.** Pick one story and follow it down. A roundup of eight items is not an episode.
4. **Write the script sterile**, as speech rather than as prose: beats, each beat a list of speaker turns.
5. **Critique it, and fix what the critique finds.** Record what changed, so the next episode inherits the lesson rather than the mistake.
6. **Only then add the humanity**: the breaths, the one false start, the "yeah, and". This order is Google's published NotebookLM method and it is the right way round, because banter written first becomes the point instead of the delivery.
7. **Storyboard beat by beat**, keyed to the same beat names as the script. Every scene has an explanatory job.
8. **Build the visuals** with Manim Community Edition, designed for this concept: diagrams, real numbers, architecture, data flow. Not generic footage.
9. **Preview silently** and pull a dozen frames out of the draft and actually look at them. Text running off the frame, labels landing on each other and diagrams taller than the screen are the three commonest defects and all three are invisible in the code.
10. **Render the voice, then the animation**, so every visual beat lasts exactly as long as the line spoken over it.
11. **Run the three checks** below and fix what they find: one voice at a time, screen references, and every take transcribed. None of them is optional, and none of them can be replaced by watching it once.
12. **Watch it.** The checks catch what is measurable. Pace, whether a story lands, and whether the take is worth hearing are not, and they are the reasons to make the thing at all.
13. **Publish**: attach the finished video to the canonical page under a `Video` heading, and record it in Updates. Add a video section only where a video actually exists.

## Transitions: never cut, always morph

Abrupt transitions are the most recognisable failure of an automated explainer.

- **Objects persist.** Something still relevant stays on screen, moves to the edge and shrinks. It does not disappear and come back.
- **Transform, do not replace.** When a picture becomes a formula, morph it so the viewer sees that they are the same object. Fading a new object onto a cleared screen throws away the connection that was the point.
- **The camera moves, the scene does not jump.** Pan and zoom to change attention. An animated camera frame beats a hard cut every time.
- **Fade the irrelevant, do not clear the stage.** Dim to the muted colour when the thing will be referenced again.
- **Continuity of place and colour.** An idea keeps its position and its colour for the whole video.
- **Reveal in step with the sentence.** One clause, one reveal. Never show a finished diagram while the narrator is still building it, and never let the narrator run ahead of the picture.
- **When that rule fights "point at what is on screen", resolve it by dimming rather than by waiting.** A line like "look at the hierarchy" names a whole structure that the reveal rule wants to build one piece at a time, so the viewer is told to look at something half-drawn. Put the whole structure up at once, dimmed, at the moment it is named, then brighten each part as the narration reaches it. Both rules are then satisfied and neither is bent.
- **Beats overlap.** The first animation of a beat starts while the last word of the previous line is still sounding. Silence over a still frame is where these videos die.
- **Keep a home frame.** The ladder, the pipeline or the architecture sits in a fixed corner as the spine, and the detail happens in the main area against it.

## Visual language

### Charts have to be honest before they are pretty

- **Bars must share a baseline.** If every row starts its bar wherever its own label happens to end, the lengths are no longer comparable and the chart is a misleading picture rather than a comparison. Put the label in a fixed-width column. This shipped wrong once in two different episodes before anyone noticed, which is how quietly it fails.
- **Both sides of a comparison are built by the same function.** Drawing one stack with thicker layers than the other says the layers are different sizes, which is a claim nobody made.
- **Diagrams are sized to the space, not to the content.** Forty layers at a readable thickness is taller than the frame. Derive the thickness from the room available and let the count be whatever it is.
- **A figure on a card is written as a figure.** `4 minutes to 12 hours` is scannable and makes "the number on the screen" a true sentence; "four minutes to twelve hours" spelled out is neither.

### The grammar

Build a consistent original visual grammar across videos, so a returning viewer already knows what a colour means. Fix the colour semantics once and keep them: the subject of the current sentence, a measured number, something verified, a cost or failure, machinery such as loops and harnesses, and context that is on screen but not being discussed. Never reuse a colour for a second meaning. Reuse stable shapes for recurring concepts (tokens, models, memory and cache, users and inputs, networks, databases, computation), which makes later videos easier to follow without copying anyone else's branding.

## Writing narration for the ear

- Write spoken syntax: short clauses, verb early, one subordinate clause at most. If you cannot say it in one breath, split it.
- 130 to 150 words per minute. Slow is the technical register.
- **Pace is a writing problem, not a post-processing one.** Slowing the finished audio with a phase vocoder hits the target rate on paper and makes the voice sound processed, which is the exact quality this whole pipeline exists to avoid. It was tried, and rejected on listening. The levers that work are shorter sentences, full stops instead of commas, and one clause at a time. The other lever is selection: generate a few takes and keep the one whose natural rate is closest to the target, because seeds differ in pace as much as in accuracy. A clean read at a hundred and ninety words a minute is correct and unusable.
- Punctuation is prosody. A comma is a short breath, a full stop is a longer one, a paragraph break is a beat of silence.
- Spell numbers and names the way they should be said: "three point two two times", "twelve hours", "Z dot A I", "four thousand tokens". Text to speech reads `3.22x` and `Z.ai` badly, so never leave either in a spoken line.
- Expand every acronym on first use in speech, even where the page already expanded it in text.
- Vary sentence length deliberately. Three long sentences in a row sound like a document being read.
- Say "you" and "we". Never "this video will", never "let us now turn to".
- Never read the page aloud. The page is written for the eye and in a different order; rewrite it as speech, starting from the mental model.

## Making the voice sound human

- Render each line as its own clip, keyed to its visual beat, so a bad take can be re-rendered alone and pacing is set per beat rather than per paragraph.
- Use a model with real prosody. Piper is intelligible and obviously synthetic: it is the baseline to beat, not a fallback. VibeVoice (Microsoft, expressive long-form multi-speaker dialogue) and Chatterbox (Resemble AI, one strong voice, an exaggeration control and zero-shot cloning from a few seconds of reference audio) are the current candidates.
- Keep one reference clip per speaker for the whole video, or the voice drifts between beats.
- Roughly one disfluency per one hundred and fifty spoken words. Below that it reads as a document, above it as parody.
- Decide by listening. Render the same thirty seconds through each candidate voice and choose with your ears, not from a benchmark table.
- Normalise loudness across clips, leave about two hundred milliseconds of silence at each clip edge, and never butt two speakers' clips together without a small gap.
- Use voices you have the right to use. Never clone a real person's voice without Khalid's explicit say-so.

## Check the voice, because it lies quietly

Text to speech does not fail loudly. VibeVoice's own issue tracker documents three failure modes: bursts of music or singing, a garbled second or two at the start while the model "warms up", and drift into another language or into invented words. A clip with any of these looks perfectly normal as a waveform and as a duration, so a render passes every check a pipeline normally has and still ships something embarrassing.

**Every take is transcribed and scored before it is used.** Run the audio back through an automatic speech recogniser, compare the transcript to the line that was supposed to be spoken, and reject anything whose word error rate is above about 0.15 or whose detected language is not English. This is standard practice in text-to-speech data pipelines for the same reason it is needed here. It is also the only way to find these defects without a person listening to every clip.

What the check caught on the 2026-09-21 cut, in a clip that sounded fine in passing: a closing line that came out as "Ian Cladwick, suggest any out-of-the-out-the-book sweet Nolan Wilson's arcs to read that". Word error rate 0.34 against a line that should have read "the constraint moved".

When a take fails:

- **Reseed and regenerate, up to about four attempts.** The model is heavily seed-dependent: the same text is gibberish on one seed and clean on the next. Keep the best-scoring take and say so in the log if none passed.
- **Prefer the larger model.** The 7B model is substantially more stable than the 1.5B on exactly this failure. Use 1.5B for a fast draft, never for the published render.
- **Keep guidance between 1.2 and 1.5.** Higher values make the singing failure more likely.
- **Do not open a beat with "Welcome to", "Hello" or a bare "However".** Those openings are reported triggers for the model breaking into music.
- **Generate a paragraph, not a fragment.** One short sentence on its own is the least stable input there is; a beat of three or four sentences is more reliable than the same text split up.
- **Keep reference clips clean.** If the reference audio has music under it, the model will put music under the output.
If four seeds all fail on the same line, the line is the problem, not the roll: it usually contains an unusual proper noun or a number written in a form the model cannot say. Rewrite it phonetically and try again.

### Measure it honestly, or the gate is worse than nothing

A check that cries wolf gets its threshold raised, and a raised threshold stops catching real failures. Both directions of error have happened here, so guard against both.

**False positives come from comparing text that was never comparable.** The script spells numbers out because that is how the model reads them; the transcriber writes them back as digits. Without normalising, every number looks like four errors: "six hundred and forty" against "640", "the seventh of September" against "the 7th", "twenty twenty six" against "2026". One beat was rejected four times over nothing. Convert both sides to the spoken form, including ordinals, and read a year in pairs rather than as "two thousand and twenty six".

**False negatives come from averaging.** A word error rate divides by the length of the whole beat, so a short burst of nonsense inside a long passage stays under the threshold. A closing line passed at 0.128 while containing "not just about a model, at the author cases". So check separately for a run of invented words: three or more words in a short window that appear nowhere in the script. Report the phrase it caught, because that is what makes the failure obvious to a human.

**A third signal costs nothing.** Ask the recogniser for its no-speech probability. A clip that is entirely speech but scores above about 0.5 somewhere usually contains a burst of music or noise, which the words around it will happily transcribe through.

## Building scenes that survive being reused

An episode is not a one-off animation, and the second one is where you find out. Three rules, each learned by breaking.

- **Shared furniture lives in a base class, not in last week's episode.** The ident, the story cards, the banner and the closing take are the same every week. A new edition should supply its own argument and its own diagrams and nothing else. If writing one means reimplementing the furniture, the abstraction is in the wrong place.
- **Beats hand over by name, never by knowing what came before.** A beat that clears "the object the contract beat made" breaks the moment a shorter cut drops that beat. Leave whatever is centre stage in a known place and let the next beat clear that, so any beat can be dropped.
- **Position things explicitly.** Placing a label next to something inherits that thing's alignment: a take line hung under a left-aligned banner runs off the left edge, and a diagram label placed under a loop lands on top of the model's own label. Set the axis you care about after placing.

## Say what the picture is doing

The narration and the visuals have to refer to each other out loud, or the viewer has to decide for themselves which half to pay attention to.

- When a visual carries the evidence, the line says so: "the bars are logarithmic", "look at the gap between those two", "this is the same chart, drawn linearly". Not "as shown in the figure below", which is written-report language nobody says.
- Name what is on screen in the words that are on screen. If the label reads "harness overhead", the narrator says harness overhead, not "the wasted part".
- A number that appears on screen is spoken at the moment it appears, not before and not two sentences later.
- When something changes on screen, the line acknowledges the change: "watch what happens when we redraw that", "and that is the piece that disappears".
- Anything on screen that the narration never refers to should not be on screen.

## The weekly news edition: hybrid, and why

Decision (2026-09-21): **one narrator carries the video, and a second voice plays the listener rather than a co-host.**

The reasoning, from the evidence rather than from taste:

- The full two-host conversation is the NotebookLM Audio Overview format. Its strength is companionship, and its weakness is the reason Google added a disfluency pass at all: two synthetic voices talking to each other is painful. It also spends words on rapport that a technical viewer did not ask for, and it fights the animation, because a conversation cannot be tied to a visual beat as tightly as narration can.
- A single narrator is what actually works in this genre at this length, and it keeps the visual as the argument.
- The hybrid takes the one thing the conversation format genuinely buys: somebody asking the question the viewer is already forming, and pushing back when the narrator waves something through.
Concretely:

- Voice A narrates, and owns the spine and the visuals.
- Voice B appears three to five times in an eight minute video, never more: to ask the question the viewer would ask, to flag a caveat the chart hides ("those bars are logarithmic"), or to make the narrator justify a number. B's turns are one or two sentences, and A always does something different because of them.
- No greetings, no signing off together, no banter that carries no information.
- The audio must work with eyes closed. The video should still make sense as a podcast, which is what the second voice and the spoken connective tissue are for.

### Open with what this is

The first thing on screen and the first thing said establish the edition: that this is the week's technical news, the date, and the window it covers. A viewer who arrives from anywhere should know within five seconds what they are watching and how current it is. Keep it to one card and one sentence, then go straight into the tension. The date also belongs on the closing frame, because that is the frame people screenshot.

### One story at a time, each opened properly

Several stories in one issue is normal. Run them one at a time and separate them plainly: a visible break, the story's own title on screen, and a spoken handover. The separation is the point, so do not blur two stories into one continuous passage.

Every story opens the same way, in this order, before any mechanism:

1. **The headline**, in one sentence: who did what, in plain words, and then the claim. "Anthropic released a report measuring how much better their models have got at running long tasks on their own" and then the number. A headline that opens on the figure alone ("four minutes to twelve hours") assumes the viewer already knows what is being measured, which is the thing the story is supposed to tell them. Name the actor and the action first, then the number.
2. **Why it matters**, in one or two sentences: what changes for the viewer, or what it settles.
3. **The context** somebody needs to follow it: who these people are, what came before, what the number should be compared against.
4. **Then** the detail, the mechanism and the caveats.
That is the inverted pyramid, and it is the one place the news edition departs from the single-explainer shape: an explainer can hold its conclusion back to build tension, but a viewer scanning the week's news is entitled to know what each story is before deciding to spend two minutes on it. Tension still belongs at the top of the episode as a whole.

What is still banned is the undifferentiated list: eight items of equal weight, read out, with nothing said about which matters or why. Separation and ranking are what make it an edition rather than a feed.

## The topic overview edition

Every root topic page earns one of these: a video that gives you the whole landscape of that topic in one sitting. It is a different shape from both the news edition and the single-idea explainer, and the difference is that **the inventory comes first**. A news edition picks one story and follows it down. An overview refuses to go deep until the viewer can see the whole board.

### The shape

1. **What this is, and how current.** The topic, one sentence on what it covers, and the date the page was last updated. A landscape video is worthless without a date on it.
2. **Name everything before explaining anything.** Build the map on screen: every provider, grouped the way the page groups them, with their models named. Do not explain any of them yet. The viewer needs to see the size and the shape of the field before any one part of it means anything, and naming all of it first is what makes the rest feel like a tour rather than a list.
3. **The organising question.** One sentence: what actually separates these things? Everything after this answers it, and it is what stops the video being an inventory read aloud.
4. **The philosophies, one per beat.** For each provider, what that lab is actually doing differently, in a sentence or two. Not its product line: its bet. "OpenAI hides a router, Anthropic exposes a token budget" is the shape to aim for, because it explains behaviour the viewer has already noticed. Group them so the contrasts land next to each other rather than alphabetically.
5. **Compare on one axis at a time.** Open against closed. Breadth against a single flagship. Who decides how much the model thinks. A comparison that changes axis halfway is a list wearing a chart's clothes.
6. **Then the convergence.** What everybody is doing the same way, and why. This is usually the most valuable thirty seconds in the video, because it is the part a reader of the page skims and a practitioner needs.
7. **The numbers.** Benchmark scores, prices, active-parameter ratios, whatever the page carries. Late, not early, and always with who measured them. A vendor's own table is labelled as such, on screen and out loud.
8. **The take.** What the map is for. What would change it.

### Rules particular to this format

- **The map is the home frame.** It is built once, parked, and every later beat highlights the part of it being discussed. A viewer must always be able to see where the thing being explained sits in the whole.
- **One provider per beat, at most.** The moment two labs share a beat, the narration starts listing.
- **Say the model names.** The inventory is the point; a viewer should be able to hear a name they half-know and place it.
- **Longer than a news edition, and that is fine.** Six to nine minutes for a large topic. It is a reference video, and the length is the map, not padding.
- **The page is the inventory's source.** If the video names a model the page does not, the page is out of date and that is the defect to fix first.
- **Work out what the inventory actually is before assuming it is a list of competitors.** The llms map is providers and their models. The CUDA map is layers of a stack: what the machine is, where you are allowed to write, and what you call instead of writing anything. Same format, same furniture, completely different axis, and getting that axis right is most of the work of a new overview.

## The deep dive edition

A deep-dive page explains one mechanism. Its video does the same, and the temptation to resist is turning the page's six or seven headings into six or seven sections, which is a table of contents read aloud. Use the spine at the top of this page, and add the rules below, which are what make the difference between explaining a mechanism and summarising a page.

- **Pick the load-bearing idea and follow it.** One page usually has one sentence that everything else is downstream of. Find it, open on it, and let the other sections arrive only when the walk needs them. Anything the walk does not need belongs to the page, not the video.
- **The worked example is the spine, and it is compulsory.** Take one concrete case, with real numbers from the page, and carry it the whole way. Concrete before abstract is not a stylistic preference in this format: it is the only way a viewer ends up able to redo the reasoning.
- **Derive on screen, do not assert.** If a figure follows from two other figures, show the division happening. That is precisely what a reader skimming the page does not get, and it is the reason to make a video of a page at all.
- **Name the wrong model the viewer is carrying, then replace it.** "You think the card is slow at arithmetic. It is not, it is starving." A deep dive that does not correct a belief is a list of facts.
- **One diagram, built up.** Not a sequence of pictures: one construction that grows, so that pausing anywhere shows the whole argument so far.
- **End on the resources.** The last frame names the two or three best resources from the page's own Best resources block. The video is an entry point to a subject, not a replacement for reading about it, and saying so is what stops it pretending otherwise.
- **Six to ten minutes, and slower than the news edition.** A mechanism needs pauses that a news item does not.
- It still may not out-claim the page, and any explanation the video invents to make the mechanism land goes back into the page in the same session.

## Running it, in the mirror repository

The toolchain lives in the GitHub mirror, under `video/`, and this page is mirrored into it as a loadable skill, so these commands are here rather than in a second copy of the method.

1. Write the script into `video/scripts/<episode>.py`: beat keys mapping to `(speaker, line)` turns, a `FORMAT` declaration, and short sentences.
2. Storyboard into `video/scenes/<episode>.py` with the same beat keys, inheriting the shared furniture (`common/news.py` for an edition, `common/overview.py` for a topic map, `common/deepdive.py` for a mechanism). Write only this episode's diagrams. A beat must not depend on an object another beat created.
3. Register the episode in the `SCENES` map in `video/build.py`.
4. Check the shape before rendering anything:

```bash
uv run python video/tools/check_structure.py --script <episode>
```

1. Preview silently, then pull frames and look at them:

```bash
uv run video/build.py <episode> --skip-tts --quality l
```

1. Render the voice and the animation. The voice stage transcribes every take and reseeds on failure:

```bash
uv run video/build.py <episode>
```

1. Run the remaining checks and fix what they find:

```bash
uv run python video/tools/check_timing.py --script <episode>
uv run --group tts --group video python video/tools/check_references.py --script <episode> --scene <Class>
uv run --group tts python video/tts/verify.py --script <episode>
```

The layout audit needs no command: it runs inside the render and writes `video/out/layout_<episode>.json`.

1. Watch it, then attach it to the canonical page and record it in Updates.
After any refactor of the toolchain, build one episode end to end before calling it done: a moved path or a renamed tool does not surface until something uses it.

## Tool choice

- **Manim Community Edition** is the default for technical, mathematical and systems explanation.
- General generative-video tools are for supplementary footage only, never the explanation engine.
- Avatar and presenter tools are optional, and are not the default for technical material.
- Video editors are for assembly and polish after the explanatory visuals exist.

## Quality bar

Ship only if all of these hold:

- Sound off, the animation still tells the story.
- Eyes closed, the audio still tells the story.
- No sentence on screen is read aloud verbatim.
- Exactly one sentence states what the video is about, and it arrives in the first forty seconds.
- Every number traces to the canonical page, and none was invented for narrative shape, including any extreme operating point the source itself flags as unrepresentative.
- No hard cut anywhere: every beat change is a morph, a camera move, or a fade of something that persists.
- Somebody who watched only the last thirty seconds knows what to think about it.

## Why these get redone, and how not to

The first four of these videos were each remade several times. Almost none of that was the content: it was four mistakes in how the work was checked, repeated. They are worth naming because each one has a cheap prevention.

**Looking when you could have measured.** Text running off the frame, two labels landing on each other, a diagram taller than the screen, bars that do not share a baseline. Every one of these is invisible in the code that causes it and obvious in the frame, so they were found by pulling frames and squinting, one at a time, across several rounds. They are all geometry, so check them as geometry: at the end of every beat, walk the text on screen and flag anything outside the frame or overlapping something else. Pull frames as well, but to judge whether it reads, not to find collisions.

**Trusting a metric before calibrating it.** The transcription gate was wrong three times in a row, and every time it was the measurement rather than the audio: spelled-out numbers against digits, ordinals and years, then proper nouns ("DeepSeek" comes back as "Deep Seek", "V four Pro" as "V4 Pro"). Each false alarm cost a re-render, and a gate that cries wolf gets its threshold raised until it stops working. Calibrate a new check against material you already believe is good, before you trust it to reject anything. Prefer the character-level comparison from the start; word-level disagreement on technical text is mostly spelling convention.

**Letting an invariant depend on remembering.** Two voices talked over each other for twenty five seconds because a beat's audio started when its animation started, and one beat's animation was shorter than its line. The rule "call hold() at the end of a beat" was written down and was still broken the first time a new episode was written. If an invariant matters, enforce it in the base class so it cannot be forgotten, and add the check that proves it.

**Optimising the number instead of the thing.** Narration was read too fast, so it was slowed to hit 142 words a minute with a phase vocoder. The number was right and the voice sounded processed, which was the one quality the pipeline exists to avoid. When a measurement and the ear disagree, the ear wins, and the fix belongs upstream in the writing.

Two smaller ones with the same shape: run one episode end to end after any refactor, because a moved path or a renamed tool will not show up until something actually uses it; and work out the delivery profile from the length before rendering at full quality, rather than discovering at the last step that eight minutes will not fit inside the upload limit.

## Failure modes

What an automated explainer does wrong, in the order it actually happens:

1. Reading the written page aloud. Symptom: perfectly grammatical sentences that nobody would say.
2. Narrating a list. Symptom: items of equal weight in sequence, none of them opened with a claim or a reason to care. Clearly separated stories are the opposite of this failure, not an example of it.
3. Stating results with no tension. Symptom: the first sentence contains the conclusion and there is nothing left to want.
4. Decorative animation. Symptom: the picture would look fine under the narration of a different video.
5. Even rhythm. Symptom: every beat, every sentence and every turn is the same length.
6. Explaining the name instead of the thing. Symptom: the viewer learns a term and cannot use it.
7. Summary endings. Symptom: "in summary, we looked at", followed by what the viewer already understood.

## Validation

Three of these are mechanical and run on every render. They exist because each one caught a defect that every other check passed: a video where two voices talked over each other for twenty five seconds, a line telling the viewer to look at a number that was not on screen, and a closing sentence that came out as invented words. None of them was visible in the code, in the waveform, or in a quick watch.

Run all three, then watch the video anyway.

### Check that only one person is talking

A beat starts its narration when its animation starts. If the animation is shorter than the line, the next beat begins while the previous line is still playing, and two voices talk over each other. This is invisible to every other check: each clip is correct on its own, each clip verifies, the animation is right, and the video is unlistenable. One episode shipped with twenty five seconds of it.

So compare the beat log against the clip lengths, mechanically, on every render. For each beat in order, its start time must be at or after the end of the one before. The same pass should flag two neighbouring failures with the same cause:

- **A silent gap** longer than a few seconds, which means a beat animates for far longer than it speaks.
- **A still frame** held for more than about six seconds, which means a beat ran out of things to show and left a card on screen while somebody talked over it. That is usually the real defect, and the overlap was only how it announced itself.
The fix for all three is the same: give the beat more to show, or split the line across the beats that follow it. Never fix it by cutting the narration short.

### Check the script has the shape its format requires

Run this before rendering anything, because it is the only check that looks at the script rather than at the finished video.

Every other check here inspects what came out: the layout, the timing, what the narration actually said. None of them notices a **missing beat**, because a video with no contract and no objection renders perfectly, sounds fine, and is simply worse in a way only somebody who knows the format can see. A beat went missing twice, and both times for the same reason: writing a new episode from a blank file and forgetting a step that has no visual consequence.

So declare the format in the script and check its required beats mechanically: an opening first, a take at the end, a question, and for a deep dive a contract, an objection and a resources card. Two rules the check also carries:

- **A contract is required above about three minutes**, measured on the rendered narration rather than on a word-count estimate, because the rule turns on a few seconds either way.
- **A beat under about twenty five words is flagged**, because a short fragment is the least stable input the voice model gets, which is a rule this page already states and nobody remembers while writing.
Two exceptions worth stating, both discovered by the check firing on work that was actually fine:

- **An overview needs no separate contract beat.** Building the whole map on screen before explaining any of it is the contract, and a stronger one than a list of steps, because the viewer can see the entire scope rather than being told about it.
- **A contract can be a clause inside the opening** rather than a beat of its own ("two stories, and by the end they turn out to be the same story"). When it is, say so in the script rather than letting a checker guess.

### Check the layout as geometry

At the end of every beat, before the next line starts, walk every piece of text on screen and flag two things: anything whose bounding box leaves the frame, and any two pieces of text whose boxes overlap by more than about a quarter of the smaller one. Both are ordinary consequences of placing a label next to something (it inherits that thing's alignment) or of sizing a block for an empty frame when something is already parked at the side.

This is cheap, it runs inside the render, and it replaces several rounds of pulling frames and squinting. Still pull frames, but to judge whether the thing reads, not to hunt for collisions.

One warning learned immediately: a check nobody has seen fail is not a check. The first version of this one silently passed everything, because a text object in manim holds no points of its own and the filter that was supposed to skip empty objects skipped all of them. Test a new check against a defect you have deliberately created before believing a clean report from it.

### Check the screen references

The rule that narration points at the visuals creates its own failure: a line that says "the number on the screen" when the screen holds no number, or "look at the loop" before the loop is drawn. Nothing else catches it. The animation renders, the audio verifies, and the video is still lying to the viewer.

So check it mechanically, every time. Transcribe the narration with word-level timestamps, find every phrase that promises something is visible (on the screen, look at, watch, this chart, the axis, coming up, underneath, these), work out the exact moment it is spoken in the finished video, and pull that frame. Then look at each frame and confirm the thing the line names is actually in it.

When a reference fails there are two fixes and the visual one is usually better: put the thing on screen rather than removing the line. A card that said "four minutes to twelve hours, in two years" while the narration said "the number on the screen" was fixed by writing the figures as figures, `4 minutes to 12 hours`, which also made the card scannable.

The same pass catches two other things worth looking for while the frames are in front of you: anything on screen the narration never refers to, and any beat whose frame is identical at its start and its end, which means nothing happened for the length of a spoken line.

### Check every take against what it was meant to say

The transcription gate described under the voice. Every clip, every render, no exceptions, and measured honestly in both directions.

### Then watch it

The checks are a floor, not a ceiling. They cannot tell you that a story did not land, that the take is obvious, that the second voice is decorative this week, or that the pace is wrong. Watch it once with the sound off and once with your eyes closed, which is what the quality bar asks, and then once properly.

### The rest

If making the video reveals a clearer explanation or a factual correction, update the written page first, so the knowledge base stays authoritative. Confirm the finished video is linked from the canonical page, that no empty video sections were created elsewhere, and that the change is recorded in Updates.
