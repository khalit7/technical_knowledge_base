---
name: kb-make-video
description: Produce a narrated explainer video derived from a KB page. Three formats with genuinely different shapes: a news edition that tells separate stories one by one, a topic overview built on a map, and a deep dive that follows one mechanism. The written page stays canonical.
---

# Produce technical explainer video

*Mirrored from Notion, where it is the source of truth. Edit it there:*
*Me -> _AI -> Skills -> Produce technical explainer video. Changes here are overwritten by the next sync.*
*This copy is the page as Notion last edited it, 2026-09-23 08:05:00 UTC. A procedure*
*that has moved on since then has moved on in Notion first, so if anything here*
*contradicts what the tools actually do, re-run the sync before trusting this file.*
*The copy your skill loader served you can also be behind this file: if you were told*
*something is true of this run and cannot find it here, read the file on disk and*
*`git log` it before concluding it is not so.*

Produce a narrated explainer video derived from a Technical knowledge base page: how it is structured, animated, scripted and voiced, and where it lives when it is done. The written page stays canonical.

## Use when

Asked to create or revise a technical explainer video derived from a Technical knowledge base page, or when an explanation would genuinely be easier to follow as a video. This includes the weekly news edition. Load it before the first line of script is written.

## Read first

The canonical page being explained, and [Update technical knowledge base](../kb-update/SKILL.md) for the writing and accuracy conventions the video must respect.

## Principle

A video is an optional **derived representation** of a topic or deep dive. The written page remains the source of truth, and the video may not claim more than the page it derives from. Keep the video attached to the page it explains rather than building a separate Videos hierarchy.

### Explaining more than the page says

The page is written for a reader who can stop and think. A listener cannot, so a video is allowed, and often obliged, to add explanation the page leaves implicit: what an abbreviation stands for, who a company is, why a figure should be read with suspicion. "Anthropic measured Anthropic" is precise and, spoken aloud, means nothing; "these are self reported numbers, and the company that published them benefits from the answer" is the same fact made usable.

Two limits on that freedom:

- **Add explanation, never claims.** Context, definitions, plain restatements and caveats are the video's to add. A new fact, figure or conclusion is not: if it is worth asserting, it is worth asserting on the page.
- **Back-port it.** If a line of narration explains something better than the page does, the page is now the weaker of the two. Put the explanation on the page in the same session. The page is the thing that lasts; the video is the thing that made the gap obvious.
**A mention that looks untitled is usually the reader, not the page.** Notion's MCP `notion-fetch` renders every page mention as a bare `<mention-page url="..."/>` with no text, so a page of perfectly good citations reads as a page of nameless ones, and following that impression would have had one episode rewrite six of them. Check the block through the API before believing it: in ordinary prose the mention's `plain_text` carries the title, and on two pages examined that way every mention had one, 15 and 24 respectively.

**The exception is a mention inside a table cell, which the API returns as "Untitled" every time.** Measured on one page: all 23 prose mentions titled, all 14 table-cell mentions untitled, while the repo mirror resolves every one of them correctly because it fetches the referenced page. So an untitled mention in a cell is an artefact and not a defect. Resolve it by fetching the page id rather than believing the cell, and note that table cells live in `table_row.cells`, a list per row, not in `rich_text`, so a walker that only reads `rich_text` will not see them at all. Only when the API also shows it empty is this a real defect, and then open the linked page, take the name, and back-port it as real words in the same session.

**Judge a missing gloss against the page you are deriving from, not its subtree.** An acronym expanded on a deep dive below this page is still unexplained for somebody reading the parent, and a fetch of the parent cannot tell you either way. Check the page itself, and back-port there.

**How to write into a page without rewriting it.** The repo copy is a generated mirror, so editing the file there changes nothing and is lost at the next sync. The back-port goes to Notion. For a **new** block in a known place, the reliable route is the API client in `tools/notion_mirror.py` and a raw `PATCH /blocks/{page_id}/children` with `after` set to an existing block. That client exposes **only GET helpers** (`page`, `block`, `children`, `db_rows`, `database`), so call `api._request("PATCH", path, json={...})` directly, with the body passed as the `json=` keyword rather than positionally, and build the `rich_text` array by hand, then a re-read of the children to confirm where it landed.

**Editing an existing block is a different call**, and the obvious one loses formatting. Use `PATCH /blocks/{block_id}` and round-trip the whole `rich_text` array, rebuilding each mention run as `{"type":"mention","mention":{"page":{"id": ...}}}`. Done that way bold and page links survive; done through the convenient MCP call they do not.

**Notion concatenates rich-text runs with nothing between them**, so a splitter that cuts at a word boundary and hands back the pieces silently eats the space at every join. One Updates entry shipped with ten missing spaces, "attached to Topic: rl.Seven minutes...", and every paragraph had to be patched back. Keep the separator on one side of the cut deliberately.

**A single rich-text run caps at 2,000 characters.** A long paragraph has to be split across several runs inside the one block. Exceeding it fails loudly with a validation error rather than truncating quietly, so the bad case is the one you cannot miss. **It bites hardest on the Updates entry, not on a page edit**, because the house style's long second paragraph runs past 2,500 characters and `POST /pages` rejects the whole entry. Split a long string into several runs at word boundaries before building the block; the entry needs the same handling a back-port does. The obvious MCP call gets the position wrong silently, as the publishing section explains.

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

The opening does four things, in about twenty to thirty seconds:

1. **Name the subject**, in the words the page uses.
2. **Say what it actually is**, in one plain sentence. "Where data sits on a graphics card, and what it costs to move it from one of those places to another."
3. **Say why it earns the time.** The one-line reason this is worth watching rather than skimming.
4. **Give the context needed to follow what comes next.** Who these people are, what came before, what a number should be compared against. Without it the first real beat lands on somebody who cannot place it.
A title card alone does not do this. It names the video without telling anyone what is in it, which is the failure this rule exists to prevent.

**This applies at every level.** It opens the episode, and inside a news edition it opens each story as well: a viewer who joins at story three is owed the same orientation as one who joined at the start.

What comes after the opening is the format's business, not a universal rule. A contract, where the video says where the next few minutes go, is required for a deep dive, optional for an overview, and usually redundant in a news edition where the opening has already said how many stories there are.

## There is no universal spine

There used to be one here: eight numbered beats with timings, applied to every video whatever its format. It was wrong, and it did real damage, because a shape that fits one kind of material gets forced onto material it does not fit. The clearest case: a news edition of four unrelated stories was bent onto a single thesis, because the spine said there had to be one sharp question the whole video answers. The result was harder to follow than the written page.

So: **three things are common to every video, and everything else belongs to the format.**

The three:

1. **The opening**, as described above. Subject, what it is, why it earns the time, and the context needed to follow what comes next.
2. **A reason to keep watching that is not suspense.** The viewer should always know why this beat exists. In a deep dive that is a question being answered; in an overview it is a map being filled in; in a news edition it is simply the next story, properly introduced.
3. **A take at the end.** What this changes, what to watch, what is still unsettled. Never a bulleted recap of what was just said.
Everything else is the format's, and the three formats want genuinely different things:

|  | news edition | topic overview | deep dive |
| --- | --- | --- | --- |
| what it is | several items, usually unrelated | one landscape, seen whole | one mechanism, understood |
| the shape | story, story, story | map first, then the tour | a single line of reasoning |
| borrowed from | a news bulletin | a field guide & caleb writes code style | 3Blue1Brown |
| one thesis? | only if one genuinely exists | often, if one genuinely exists | yes, that is the format |
| length | as long as the stories need | six to seven minutes, never past seven | as long as the idea needs |

### Nothing here is a quota

The old spine gave timings per beat, and that encouraged padding a thin story to fill its slot and rushing a rich one to fit. Neither is acceptable.

- **Stories and sections do not have to be the same length.** A story with a mechanism worth explaining gets two minutes; one that is a single fact gets twenty seconds. Making them equal is a decision to waste the viewer's time on the second one.
- **A video is as long as it has material for.** An overview of a small topic that runs four minutes is finished, not short.
- **Not every beat in any list below is compulsory.** They are the beats that usually earn their place. If one does not, drop it and say so in the script's docstring, so the next person knows it was a decision rather than an omission.

### The one hard limit, which applies to every format

Notion will not take a file over 5 MiB, and `build.py` targets 4.7. It gets there by stepping the encode down a ladder: three 1080p rungs at rate factors 28, 31 and 34, then 720p, then 540p. `PROFILES` in `build.py` is the ladder, and it is worth reading before deciding an episode is too long. So length is not free, whatever the format:

- **Under about six minutes** delivers at 1080p, and text stays crisp.
- **Six to about seven and a quarter** still delivers at 1080p, on a coarser rate factor. The ladder has three 1080p rungs before it gives up resolution, which is one more than this page used to claim. Measured across this series: 6:09 took rung two, 6:43 rung two, 7:04 rung three, every one of them 1080p and between 4.3 and 4.6 MiB.
- **Past about seven and a half** drops to 720p, as a seven minute fifty news edition did. That is the resolution the layout audit already measures against, and a parked panel or a dense table is close to its legibility floor there.
- **Past about nine minutes** the ladder runs out and the render fails at the last step, after the voice and the animation have already been paid for.
A recent seven and a half minute news edition stepped down three rungs to fit. Work the length out at the outline, not at the encode.

**Plan at about 150 words a minute, and aim to land between six and seven, never past seven.** The first seven overviews of this series came in at 6:09, 6:25, 6:37, 6:43, 6:47, 6:58 and 7:04. This page used to say "aim to land under six", and not one episode has ever managed it, because the vocabulary will not go faster: at ten to thirteen seconds per reveal, a beat carrying four or five things is fifty odd seconds, and seven or eight of those is six and a half minutes. A target nobody hits is not a target, it is a thing to apologise for in every docstring. The estimate is softer than it looks: the voice renderer generates several takes and keeps the one whose pace is nearest the target, so beats land anywhere between about 115 and 165 words a minute and the total drifts. One overview estimated at 6.6 minutes delivered at 6 minutes 43. Seven minutes is where 1080p gives out, and the line is sharper than it looks: 6:58 delivered 1080p at 4.61 MiB while 7:10 dropped to 720p, because 1080p at the coarsest rate factor came out at 4.73 against the 4.7 target. **Measure it rather than guessing, once the animation exists.** Encode the manim master by hand at the last 1080p rung and read the overshoot, which turns "trim and hope" into one number:

```bash
ffmpeg -i video/out/media/<episode>/videos/_generic/1080p60/Episode.mp4 -r 30 \
  -vf scale=-2:1080 -c:v libx264 -crf 34 -preset slow -pix_fmt yuv420p \
  -c:a aac -b:a 40k -ac 1 -movflags +faststart /tmp/probe.mp4
```

One episode estimated 6:40, rendered 7:00 and dropped to 720p with no outline arithmetic that could have caught it; the probe said 4.73 MiB against the 4.70 cap, a miss of 0.6 percent, which converts directly into "cut about thirteen seconds". Twenty-one words out of two beats did it. That episode carried a parked map and a dense table for most of its length, which this page names as the two things closest to the legibility floor at 720p, so the rung mattered.

It is not purely duration, since a busier picture costs more at the same length, but **treat seven minutes as the wall** and trim to it at the outline. **When the two disagree, the delivered profile governs and the clock does not, and it can carry you further than you would think.** An episode at 7:17 and 4.63 MiB passed on the same rung as one at 7:02 and 4.42. Treat seven minutes as the planning target, where a 1080p delivery stops being likely, rather than as a second gate: if the probe above says it fits, it fits. Seven minutes is a planning heuristic for hitting the profile; an episode that lands at 1080p inside 4.7 MiB has met the constraint the heuristic exists to serve, and 7:02 at 4.42 MiB is a pass rather than a breach. Do not drop a load-bearing beat to buy back two seconds. One episode bought its way back to 1080p by cutting nine seconds.

**The whole estimate is ****`words x 0.40 seconds`****, and nothing is added per beat.** Measured across nineteen shipped episodes the delivered rate sits between 0.355 and 0.422 seconds a word, median 0.401, which is about 150 words a minute **including** every tail and gap. **Plan at 0.42, the top of that range, not the median.** Expect three numbers for one quantity and know which to trust: this estimate, `check_structure`'s `~N min` from the words, and `build.py`'s silent-preview timing file, which runs the most pessimistic. One 998 word script estimated 399 seconds here, 423 from the preview, and delivered 408. **Trim against the delivered profile**, not against whichever estimate frightened you first. The cost is asymmetric: planning short costs nothing, while planning long overshoots the rung and drops the episode to 720p. One author planned at the median, came out thirty to forty seconds short and paid for three separate length passes. This page used to add three seconds a beat on top of that, which double counts and over-predicts by thirty to forty seconds on a nine beat episode: it told one author their script ran 7.1 minutes when it delivered 6:37, and the error runs in the direction that makes you cut material you did not need to cut.

In round numbers: **900 words is six minutes, 1,050 words is the seven minute wall.**

**The figure to carry to the outline is reveals, because that is what reconciles the two budgets.** Sizing beats by reveal count gives 125 to 160 words a beat, and eight of those is 1,000 to 1,280 words rather than 880, so following the word rule and the reveal rule together produces a draft 40 percent over: one came in at 1,306 words and 9.1 minutes, the rung where the render fails outright. **An episode holds about 33 reveals**, measured across nineteen shipped, where the range is 25 to 42. Count those first and the draft comes out right. **Size a beat by its reveal count, not by a flat word figure**, because the segment arithmetic decides it: n reveals wants about `(n-1) x 30 + 12` words, so a six-reveal panel needs around 165 and not 110. One first draft came in at 1,099 words and 7:25 precisely because it was planned at "about 110 a beat" and the reveal arithmetic then demanded more. As a rough total, **eight beats at about 110 words each is a six minute overview**, and that budget is worth setting before the first draft rather than discovering after it: one first draft came in at 1,253 words and 8.4 minutes, near the rung where the render fails outright, and cost a whole beat to fix. A beat naming four things also needs about forty seconds to reveal them in step with the sentence, so a fifty word beat naming four things is not satisfiable at any `reserve`.

If an episode wants to be longer than that, the answer is usually fewer items or a split, not a coarser picture.

**A four-column map spends one beat per column and leaves room for exactly one more.** Opening, map, question, four column beats and a take is already eight beats and 950 to 1,050 words before a single beat does argumentative work. Plan the fifth idea out at the outline rather than discovering it in a fourth trimming pass, which is what one author paid to get from 1,256 words down to 1,025.

**A page can hold more than one episode, and most of the big ones do.** A five or six thousand word overview does not fit in six minutes, and forcing it produces an episode that gallops. Decide at the outline which single question this episode answers, cut to that, and record in the script's docstring what you left out and why, so the next person can see the second episode sitting there rather than rediscover it. An inventory that splits cleanly in two is two episodes, not one crowded one. Cutting half a page is a normal outcome, not a failure.

The one thing that is checked mechanically is the small set of roles each format genuinely requires, and `check_structure.py` holds that list rather than this page.

## Production pipeline

1. **Read the canonical page** and the material it links, meaning the page **in Notion**, not the mirrored copy in the repository. The mirror can be hours behind, and a video built from a stale copy quotes a page that no longer says that, with nothing on screen to reveal it. If you read the repo copy for convenience, diff it against Notion before writing a word. Resolve factual gaps before scripting. A figure that cannot be traced back to the page does not go in.
2. **Decide the mental model** the viewer should leave with, and the one sentence the video answers (in case of tech news, there is not necessarily a one sentence the whole video answers, it could be a question per story, or no question at all).
3. **Decide the format first, then outline against that format, then revise the outline.** The three formats are news, topic overview and deep dive, and they want different shapes; the sections below set out each one. Do not carry one format's rules into another. In particular, "pick one story and follow it down" is a deep-dive rule and a sometimes-rule for an overview. It is not a news rule, and applying it there is what produces an edition that forces unrelated stories onto one thesis.
4. **Write the script sterile**, as speech rather than as prose: beats, each beat a list of speaker turns.
5. **Critique it, and fix what the critique finds.** Record what changed, so the next episode inherits the lesson rather than the mistake.
6. **Only then add the humanity**: the breaths, the one false start, the "yeah, and". This order is Google's published NotebookLM method and it is the right way round, because banter written first becomes the point instead of the delivery. **This step is for the news edition.** The overview series has shipped clean throughout and its consistency is worth more than the rule; a deep dive can go either way. Do not be the one episode in a series that suddenly clears its throat.
7. **Storyboard beat by beat**, keyed to the same beat names as the script. Every scene has an explanatory job.
8. **Build the visuals** with Manim Community Edition, designed for this concept: diagrams, real numbers, architecture, data flow. Not generic footage.
9. **Preview silently** and pull a dozen frames out of the draft and actually look at them. Text running off the frame, labels landing on each other and diagrams taller than the screen are the three commonest defects and all three are invisible in the code. A fourth is subtler and no check will ever see it: **a two line caption can break inside a word**, rendering "than" as "th  an" across the line end, with nothing overlapping, nothing off frame and the type well above the legibility floor. Only looking finds it.
10. **Render the voice, then the animation**, so every visual beat lasts exactly as long as the line spoken over it.
10b. **Set every ****`reserve`**** from the rendered durations, then render the animation again.** The right value is arithmetic and it is unknowable until the voice exists, so **`check_leads --reserves`**** computes it** rather than leaving you to write the same script again:

```bash
uv run --group tts --group video python video/tools/check_leads.py --script <episode> --reserves
```

#### Repairing a beat: the whole ladder in one place

Every re-cut agent in the series asked for this, because the pieces were spread across the page. In order of cost:

1. **Make every reveal timeable first.** An untimed reveal is unchecked, not passed, and making one timeable has turned up real leads of 9.7 and 12.6 seconds. Write each panel item as the narration says it: same spelling ("License" against "licence" breaks the match), and no label word spoken earlier for some other reason.
2. **Drop a focus the previous beat makes redundant.** The first reveal draws only after the map finishes lighting, 0.25 seconds per handle, so a focus beat whose heading is spoken in its first words has a guaranteed lead that no reserve or row can touch. --reserves flags it as FIRST REVEAL LEADS.
3. **Sweep each reserve** to the value --reserves suggests, midway between the lead floor and the still cap. That can be **lower** than the reserve already there, and it is still right: a lower reserve is safe whenever the floor sits well below it.
4. **Add a row** for a sentence the beat already speaks with no reveal, near the end of the line. Make the new label a **contiguous run of that sentence**: the matcher looks for a label anywhere in the beat, so any word it shares with an earlier sentence creates a fresh lead. "position bias" and "small judge" each matched an early sentence on one beat and would have produced leads of 8 to 35 seconds. Nine lines of `points` beside a parked map still read cleanly, so rows are not scarce.
5. **Drop or move a heading,** which costs every item after it one place. On a focus beat it costs more, since even the head is drawn only after the whole lighting time: dropping three heads fixed eight of one episode's nine leads.
6. **Re-point a note** on a two-reveal claim or stat to the beat's last sentence.
7. **Re-panel** where the kind cannot fit the beat: compare takes up to four sides, an over-long compare wants points rather than table, and bars cannot gain rows at all.
8. **Only then touch the words.**
Steps 2 to 7 change only VISUALS and leave the audio byte-identical. Record a re-cut in Updates like a new video, titled "the <topic> video re-cut". The reasoning behind each step follows.

**The one invariant that makes all of this tractable: reveal n always lands at ****`beat - reserve`****.** Everything else follows from it, including the corollary that saves the most time: **the last reveal's lead is set only by the words spoken after it is named.** Adding words *before* a reveal changes nothing, because the naming and the drawing move together; one author spent an hour on a map beat before seeing that the 42 words after the third column were the whole problem and the 81 before it were irrelevant. So a beat is fixable by reserve only if something is named in its final few seconds.

`--reserves` prints the smallest reserve per beat that keeps every lead inside tolerance, against the cap that beat can actually reach, how far over it is when it is over, and how many of the beat's reveals it could not time. That last column matters more than it looks: a beat whose reveals are all untimed reports 0.0, which reads as nothing to do, and two genuine leads of 11.7 and 12.6 seconds hid behind exactly that. It says outright when no reserve can close it: `RESERVE CANNOT FIX IT: add a panel row, or move the words`. It cannot tell you **which** row, and an added row still has to satisfy the orphan check, so the useful form of that instruction is inverted: **find a sentence in this beat that currently has no reveal, and give it one.** **And it has to be a sentence near the END of the line**, because the last reveal lands at `beat - reserve` whatever n is. A row added in the middle re-spaces everything before it and leaves the final landing exactly where it was, which is the trap: "re-spaces every landing" reads as though it helps the last one too. One author designed three panels against that reading before noticing none of them could work. That is also why the repair usually improves the episode rather than merely fixing it. Two authors wrote this by hand before it existed, one of them twice, because a re-render moved the durations underneath the first attempt.

`spread` places n reveals evenly from the top of the beat to the end of its budget, so **reveal k of n lands at about ****`(k-1)/(n-1) x (beat_length - reserve)`**: the first is immediate, the last lands exactly `reserve` seconds before the line ends. So `reserve` is not a nudge, it decides **how long the finished panel sits motionless at the end of the beat**, and never reach for a bigger reserve to fix a reveal that lands too early: that makes the still frame worse, not better.

**The six second cap is on ****`still`****, not on ****`reserve`****, and they are not the same number.** `check_timing` measures the rendered frame. **On an ordinary beat ****`still`**** is about ****`reserve + 0.4`**, measured across a whole episode's panel beats, so **5.5 is the reachable ceiling and 6.0 is not**, and that is the case which comes up seven times an episode. If the arithmetic asks for more, the answer is fewer words after the last reveal rather than a bigger reserve. **On a parked beat the park spends 2.0 seconds of settle and a 0.7 second morph out of the front of it, so ****`still`**** is about ****`reserve - 2.4`**, measured at 6.0 giving 3.65 and at 8.5 giving 6.15, which puts the parked ceiling near 8.3. A reserve of 6.0 on a map beat measured 3.65. Budget against `still` and work backwards, rather than treating five as a ceiling on the number you type.

**Those caps are limits, not targets, and the difference costs a render.** They are not exact either: waits quantise to the frame, so a measured still wanders about 0.15 seconds either side of the arithmetic, and a reserve of exactly 5.5 once rendered a still of exactly 6.00. Aim a quarter of a second inside. Fitting a parked map to 8.3 produced a 5.95 second still frame against a 6.0 limit: it passes, and it is not a margin. The reserve has a floor set by the leads and a ceiling set by the still frame, so **take the value furthest from both**, which is what `--reserves` now suggests rather than the bare minimum that closes the leads.

**On a fixed-reveal panel the reserve is the only lever, and "move the words" cannot work.** The last turn can hold about `reserve x wpm / 60` words, which at a reserve of 4.5 and 113 words a minute is **eight words**. Naming a map column's items takes more than eight, and lengthening that turn moves its start earlier, making the lead worse rather than better. So for `columns`, `stat`, `compare` or `table`, where the reveal count is fixed by the data, tune the reserve. **On a parked map, raising the reserve is a pure win**, worth stating because two rules here look like they forbid it: it draws every column earlier, closing leads, **and** buys still time, because the settle comes out of the front of it. The warning about a generous reserve collapsing the map mid-sentence is about where the settle sits, not how big the reserve is. **Raising it reduces a lead** generally, which is also worth saying because the intuition runs the other way: a bigger reserve shortens the drawing budget, so every reveal including the last one lands earlier, closer to the words that name it.

**Sometimes neither lever is available, and then a small lead is an accept.** One `table` beat needed a reserve of 8.0 to close a 3.3 second lead, against a still-frame ceiling near 5.5, while moving the words meant re-rolling an otherwise clean beat. Two seconds is noise and six is a rewrite; in between, inside a sentence that runs on over the reveal, take the lead and say so in the docstring rather than paying a reroll for it. Reserve the advice below for panels whose reveal count you choose. **Do not send a ****`points`**** beat to the reserve at all**: **On a two-reveal panel there is no row to add, and the third lever is re-pointing the note.** `claim` and `stat` have exactly two reveals and `compare` one per side, so "add a row" cannot apply, and from inside the fix ladder that leaves advice that does not work. The note lands at `beat - reserve`, so it has to paraphrase the beat's **last** sentence; a note paraphrasing one from the middle is unreachable by any reserve. Re-point it, or move the material into the caption, which is drawn with the number at t=0. That is `VISUALS`-only and as cheap as adding a row, and it accounted for five of one episode's fourteen leads.

And on a `points` beat, raising the reserve draws the last reveal earlier but moves the earlier ones too, and the arithmetic to close a seven second lead there asks for a reserve of twenty eight seconds. Add a row instead.

Step 10b is also less often needed than it reads: `still` tracks `reserve + 0.37` on an ordinary beat and `reserve - 2.4` on a parked one closely enough that reserves picked at the outline, 8.0 parked and 5.0 ordinary with 4.0 to 4.5 on short panels, came back at 5.65, 5.37 and 4.38 with no change needed.

What a reserve cannot do is move a single reveal on a panel whose length is already settled. If the narration names item k at second t, the levers are n and the order of the words. Read `out/timing_<episode>.json`, compute the landings, and if they do not match the line, **move the words, not the reserve**: reorder the turns so the sentence arrives where the drawing already is. That is the fix for a map beat naming its third column nine seconds before `spread` draws it.

**This is a loop, not a pass**, and it is spread across four sections of this page, so here it is in one place. After any reroll: run `tts/verify.py`, **read the transcripts as text**, recompute the reserves from the new durations, `build.py --skip-tts`, then `check_timing` and `check_references`. Skipping the verify step leaves `verification.json` holding the previous transcript; skipping the reserve step leaves the animation cut to a duration that no longer exists.

Rerolling any take changes that beat's duration and invalidates the reserve computed from it, so it interleaves with the voice gate rather than following it. Durations moved by four to six seconds a beat across one episode's rerolls. The loop is cheap: `build.py <episode> --skip-tts --quality l` uses the real durations from `out/audio/<episode>/durations.json` whenever that file exists, so a timing pass costs about two minutes and no GPU. `build.py`'s own docstring says it "falls back to estimating", which reads as unconditional and is not.

1. **Run the three checks** below and fix what they find: one voice at a time, screen references, and every take transcribed. None of them is optional, and none of them can be replaced by watching it once.
2. **Watch it.** The checks catch what is measurable. Pace, whether a story lands, and whether the take is worth hearing are not, and they are the reasons to make the thing at all.
3. **Publish**: attach the finished video **at the top of the canonical page**, under a `Video` heading, and record it in Updates. Add a video section only where a video actually exists. `uv run python video/tools/upload_all.py --only <episode> --go` is the route for a single episode as well as a batch: it derives the caption from `TITLE` and `SUBTITLE`, the blurb and the minute count from the timing file, places the video at the top, takes down any earlier one, and refuses an episode whose **spoken text** has changed since it was rendered. It rounds the blurb's minute count **to the nearest minute, in both directions**: 6:41 is published as a "7-minute explainer" and 5:58 as a "6-minute" one, while the Updates entry written by hand gives the real duration. The two house artefacts disagree on the same fact; match the Updates entry to the real duration and leave the blurb alone. The fingerprint is on the narration, not the file, so editing a docstring after rendering does not trip it. Hand-writing a caption through the four-argument `upload.py` is how the house wording drifts. The Updates entry is a child page **created with ****`POST /pages`**** and a ****`parent`**** of ****`{page_id: ...}`**, not a `child_page` block appended through `PATCH /blocks/{id}/children`, which returns a 400. The raw-PATCH advice elsewhere on this page is for placing **blocks**, and following it for the entry itself wastes a cycle. The house style is whatever is already in Updates rather than whatever this sentence claims: **date the entry the day the episode was published, in UK time, even when a batch crosses midnight**: a changelog records when things happened, so a run spanning two dates carries both, and backdating an entry to match its siblings is a small lie about the record. Then read the two most recent entries **in Notion** and match them, and where they differ, follow these three rather than tossing a coin: **bold the lead clause of every production note**; **bold the page mention inside the ****`[new]`**** lead**; and **keep the closing full stop inside the bold run**. Successive entries have disagreed on each of those in turn, and every agent that reads "match the two most recent" hits the same fork.
The Updates page is `3c65c17b-0d0d-81e3-b1b7-ca0194ff2c28`, which is otherwise only findable by listing the knowledge base root's children. What reading them tells you, and nothing else does: the markers are the literal strings `[new]` and `[update]`, with the marker **and its lead clause** bold and the rest of the sentence plain; and the entry is a child page **appended at the end**, oldest first, even though the parent page's own description says newest first. Not the `updates/` directory in the repo: the mirror lags a batch, and at one point its newest video entry was a whole method generation old, describing a different voice pipeline entirely. Matching that would reproduce a house style nobody uses any more. They carry the new and update markers used throughout the knowledge base, and a production notes section. Cover which page the video derives from, its length, and anything the page itself gained in the process. **Write it in Notion.** The `updates/` directory in the repository is generated by the sync, and anything written there is overwritten and lost. Commit the script itself as well, as `Overview N of 22: Topic: <name>`. **N is the episode's index among the ****`topic_`**** entries of ****`video/tools/episodes.json`**, in file order. That is alphabetical by **episode name** rather than by title, and the two can differ, so trust the file rather than sorting titles yourself. It is not the order episodes are produced, which is what makes it collision-free while several agents publish at once: agentic-frameworks is 1 and llms is 13 whoever gets there first. Getting it wrong is invisible until somebody reads the log.

**"The page" always means the Notion page.** Every instruction here about updating, back-porting or correcting a page means Notion, which is the source of truth. The repository is a generated mirror: editing a file there looks like it worked, reaches nobody, and is destroyed by the next sync.

## Transitions: never cut, always morph

Abrupt transitions are the most recognisable failure of an automated explainer.

- **Objects persist.** Something still relevant stays on screen, moves to the edge and shrinks. It does not disappear and come back.
- **Transform, do not replace.** When a picture becomes a formula, morph it so the viewer sees that they are the same object. Fading a new object onto a cleared screen throws away the connection that was the point.
- **The camera moves, the scene does not jump.** Pan and zoom to change attention. An animated camera frame beats a hard cut every time.
- **Fade the irrelevant, do not clear the stage.** Dim to the muted colour when the thing will be referenced again.
- **Continuity of place and colour.** An idea keeps its position and its colour for the whole video.
- **Reveal in step with the sentence.** One clause, one reveal. Prefer not to show a finished diagram while the narrator is still building it, but know that this is the lesser of the two errors and is sometimes forced on you by the reserve floor above. **A picture a few seconds early is acceptable; a narrator a few seconds early is not**, which is why `check_leads.py` passes anything named at or after the moment it is drawn and fails only the other direction, and never let the narrator run ahead of the picture.
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
- About 145 to 155 words a minute, which is where this pipeline actually lands on technical prose; `check_timing` fails a beat above 165. Slow is the technical register, but selection across seeds will not get dense material below about 145 on its own, and the only other lever is punctuation, which lengthens the beat and fights the seven minute wall. This page used to ask for 130 to 150, which the shipped series has never delivered.
- **Pace is a writing problem, not a post-processing one.** Slowing the finished audio with a phase vocoder hits the target rate on paper and makes the voice sound processed, which is the exact quality this whole pipeline exists to avoid. It was tried, and rejected on listening. **A beat under about 90 words will read fast whatever the seed, so split its turns before the first render rather than after.** One 73 word opening was rejected four times at 167 to 176 words a minute; on a five sentence beat there is no comma left to convert, and no roll will save it. Splitting took it to 149.
**The best lever is splitting the beat's turns, and it costs almost nothing.** It does trip the text fingerprint, so it re-renders that beat and there is no saved take to fall back on, which is worth knowing given how often this page sends you to it. `render.py` emits one conversation item per turn, so more turns means more prosodic boundaries and a slower read of the identical words. One beat was already 24 sentences averaging under eight words, with no comma left to convert, and fifteen seeds gave a best of 169; redistributing the same words from 7 turns into 11, all still spoken by A, came back at **159**. It holds up: a third episode had five beats over the ceiling and not one was fixed by a seed, while its stubborn closing beat went 159, 164, 165, 170 and 190 across five seeds at eight turns and read 156 first time at thirteen. **Keep every split turn a complete sentence**, because a verbless fragment is exactly what the model pours an invention into. No words cut and no seconds of narration added, which makes it strictly better than the other two. Reach for it first.

The other levers are shorter sentences, full stops instead of commas, and one clause at a time. **Price that fix before taking it**: turning one beat's commas into full stops took it from 170 to 147 words a minute without cutting a word, and grew it from 59.7 to 74.5 seconds. Fifteen seconds on one beat is most of the margin between six and seven minutes, so the pace lever and the seven minute wall pull against each other. **Pace wins**, because a beat nobody can follow is worse than an episode at 6:41; if that pushes the total past seven, drop a beat rather than put the commas back. The other lever is selection: the renderer keeps whichever passing take is nearest 145 words a minute, because seeds differ in pace as much as in accuracy. **This used to work in one direction only**, stopping at the first take at or below 165, so a beat that came back at 95 passed instantly and could not be rerolled faster however many seeds you spent. It now keeps seeding until a take lands between 125 and 165, and falls back to the nearest-to-target among those that passed. A slow beat is a defect too: dragging is as unwatchable as galloping. A clean read at a hundred and ninety words a minute is correct and unusable. The fix is almost always punctuation rather than deletion: a beat that came back at a hundred and seventy nine words a minute returned at a hundred and fifty five with its commas turned into full stops and not one word cut. Reach for the full stop before the delete key.

- Punctuation is prosody. A comma is a short breath, a full stop is a longer one, a paragraph break is a beat of silence.
- A figure on a card may be written as a figure: `16.2%` squashes to the way it is spoken, so the checks can time it. In the narration, spell numbers and names the way they should be said: "three point two two times", "twelve hours", "Z dot A I", "four thousand tokens". Text to speech reads `3.22x` and `Z.ai` badly, so never leave either in a spoken line. **A dotted name orphans if you spell out the dot.** `torch.export` is one token on the panel; saying "torch dot export" gives the word set {torch, dot, export}, which shares nothing with it, and squashes to `torchdotexport`, which does not contain `torchexport`. Say "torch export" and both routes pass. This is a common shape on these pages and the squashed-matching rules do not cover it.
**Ordinary product names can be unsayable too**, and those are the dangerous ones because nothing flags them: "PostgreSQL" came back from the transcriber as "postgres cool" at a character error of 0.011, under every threshold, caught only by reading. Say "Postgres". Three shapes to watch for, all of them found the expensive way:

- **A word welded to an acronym.** PostgreSQL.
- **An all-caps name that is also an ordinary word.** "HELM" lost its first syllable and arrived as "LM"; written as the word "Helm" it is read correctly.
- **A multi-word noun phrase that contracts into a different real word.** "the model based line" came back as "the model baseline" on two different beats, on independent seeds. Every word is ordinary English, no gate fires, and the listener hears a concept that does not exist. Say it another way: "the line that learns a model first".
- **A possessive.** "Prefect's 2026 acquisition" came back as "prefix 2026 acquisition". Recast it so the name sits mid-sentence and unpossessed: "Dagster Labs was acquired by Prefect in 2026" was right first time.
- **A lowercase compound.** "lighteval" came back as "LittleMul", and then, far worse, as the identical string the model produced for "lm-eval-harness", so two different tools in one table were spoken with the same name. Written as "Hugging Face's Light Eval" it is both correct and recoverable however the middle lands.
A fourth thing that helps: **do not put the fragile name at either end of a segment.** This page used to say only "do not open a sentence with it", which is the position people already avoid. Ending on one is just as bad, because the model has nothing to move on to: a map beat that ended on "G P T O S S" repeated the phrase three times, at a character error of 0.029 and a no-speech of 0.29, so both gates passed it.

**When a fragile name is also on a panel, the two rules collide, and the escape is to respell both sides to the same squashed string.** `asyncio` is a lowercase compound that came back as "a CO" and "a CCO", so it wants respelling; it is also a panel item that has to match the narration, so respelling it breaks the orphan match. Write "async I O" in the line and `async IO` on the panel: both squash to `asyncio`, the contiguous match survives, and the voice says it correctly. That generalises to any fragile name carried on a card.

**A name pronounced correctly can still be untranscribable, and respelling makes it worse.** "Kueue" is said "queue". The voice read it right every time and the transcriber came back with QP, Kua, Q, Koei and QU across five seeds at character errors of 0.009 to 0.024, because there is nothing for it to write. Respelling it "Kew" produced a bare letter Q and then "Kube", a different product on the same row of the same map. **A name whose correct pronunciation is an ordinary word or a bare letter needs a category word behind it, not a respelling**: "Kueue, a batch queue that only admits a job when its whole gang can run" lands however the middle falls, and the panel carries the spelling.

**An ordinary English word can need respelling too.** "Muse Spark" came back as "NewSpark" on two consecutive seeds, with the correct name on screen underneath. Respelled "Mews Spark", identical phonemes, it was right on the first take and the transcriber even wrote it back as "Muse Spark". Fragility is not confined to acronyms and compounds. "RocketEval" was mangled on four consecutive seeds until it stopped being the first thing said.

- Expand every acronym on first use in speech, even where the page already expanded it in text. **That expansion is the most deletable clause a line can carry**, and the voice gate cannot see it go: two consecutive takes silently dropped "DataComp for Language Models" and both passed at 0.043 character error, because a five word appositive inside a six hundred character beat is well under the 0.07 floor. Reading the transcript is what catches it. The fix is to stop it being an aside: give it its own clause and a verb, "D C L M, which is Data Comp for Language Models, argues that...", rather than a parenthetical the model can skip without tripping anything.
- Vary sentence length deliberately. Three long sentences in a row sound like a document being read.
- Say "you" and "we". Never "this video will", never "let us now turn to".
- **Never narrate the rules.** The constraints this page places on a script are invisible to the viewer and must stay that way. When a rule says not to do something, the script simply does not do it: it does not announce the abstention, apologise for it, or take credit for it. "They are not connected and I am not going to pretend they are." "This is not a roundup." "I will not bore you with the benchmark table." "Rather than list these one by one..." Every one of those is the script talking about itself rather than about the subject, and it reads as defensiveness about a decision the viewer never saw being made. Cut the sentence; the behaviour it describes is already visible in what follows.
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

**Every take is transcribed and scored before it is used.** Run the audio back through an automatic speech recogniser, compare the transcript to the line that was supposed to be spoken, and reject anything whose **character** error rate is above 0.07. That is one of five conditions, and all five have to hold: character error at or below 0.07, detected language English, no-speech probability at or below 0.5, no invented-word burst, and **pace at or below 165 words a minute**, which `render.py` applies itself and reports as `STILL FAST: shorten the sentences`. `check_timing` **weights a spelled letter as 0.4 of a word**, because the narration spells names out for the voice model and "T P U" takes about one word of time while arriving as three tokens: one beat carried eighteen spelled letters in 185 tokens, was reported at 169, and sent its author rewriting a beat that was fine. That is the same calibration the orphan check and the error rate already needed, for the same reason. The renderer does not apply it, so its figure runs high on an acronym-heavy beat as well as low in general. **165 is where the check fails, not where the writing is right.** Two beats came back at exactly 165, passed every check, and galloped: they were the densest beats in the episode and nobody could follow them. The writing target is 145 to 155 and nothing in the pipeline enforces it, so a conscientious reader who trusts the checks ships a gallop. **Anything at 158 or above wants the punctuation fix before it is published**, which on those two beats bought 165 down to 147 and 154 for eight seconds of length and not one word cut. **The two tools disagree on the same wav**, because they divide the same word count by different durations: one beat passed the renderer at 165 and failed `check_timing` at 170. `check_timing` is the authority, since it is the gate that fails the episode. The renderer's figure and the check's disagree by about five words a minute, **but not reliably in the same direction**: on one episode the renderer ran low and 158 there was the safe ceiling; on another it ran high by five to six, 158 / 159 / 161 against 153 / 153 / 155, and following the low-side rule would have rejected three good takes. **So never reroll for pace on the renderer's figure at all.** After the voice, run `build.py <episode> --skip-tts --quality l` and read `check_timing`: two CPU minutes, no GPU, and it is the gate that actually fails the episode. Two separate episodes rerolled good takes against the renderer's number before anyone noticed it reads high on an acronym-heavy page, by one to fifteen words a minute across nine beats in one case. Any renderer-side threshold is a **per-episode calibration** at best, never a constant. A take the renderer accepted has not necessarily passed the pace gate. Six rerolls in one episode were rejected at character errors between 0.003 and 0.013, purely on pace. A take can therefore be rejected at a character error of 0.008, which is baffling if you think the number is the whole gate. Read which condition failed before rerolling. **Do not gate on word error rate.** A page thick with acronyms drives it to 0.15 and beyond while character error stays under 0.05, purely because the transcriber writes "Q Bell A S" for cuBLAS and "N site" for Nsight. Four good takes were nearly thrown away on a word-rate threshold this page used to carry. This is standard practice in text-to-speech data pipelines for the same reason it is needed here. It is also the only way to find these defects without a person listening to every clip.

What the check caught on the 2026-09-21 cut, in a clip that sounded fine in passing: a closing line that came out as "Ian Cladwick, suggest any out-of-the-out-the-book sweet Nolan Wilson's arcs to read that". Word error rate 0.34 against a line that should have read "the constraint moved".

When a take fails:

- **If the defect is positional, no seed will clear it.** A fragile name at the very end of a beat is a rewrite, not a reroll: "profiler" closing a map beat came back as "profiral" and then "profile" on two seeds, and two ordinary words placed after it fixed it on the next take. Reach for the writing rules about name position before spending attempts, because from inside the transcript-reading step the reroll advice is the nearer instruction and it cannot work.
- **Reseed and regenerate, up to about four attempts.** The model is heavily seed-dependent: the same text is gibberish on one seed and clean on the next. Keep the best-scoring take and say so in the log if none passed.
- **After changing a beat's words, just run ****`render.py`**** with no ****`--only`**** and no ****`--force`****.** The fingerprint does the work: it re-renders exactly the beats whose text moved, prints `'map' was rendered from different words, re-rendering`, skips the rest, and keeps `durations.json` consistent. That is cheaper and safer than the `--only ... --force` route, which this page steers you to and which is for **seed** rerolls only.
**Saving a take aside only helps against a seed, never against a rewrite**, and that is exactly where the loop's non-monotonicity bites hardest: a reroll forced by a text change has no fallback at all, because the saved take speaks the words you just fixed. One rename-driven reroll came back worse, "bits per byte" as "bits per bar bye" at a no-speech of 0.44, and the only recovery was another roll.** Once a beat's words change, ****`--only <beat>`**** re-renders it with or without ****`--force`****, because the text fingerprint no longer matches, and the saved wav is then narration of a line that no longer exists. One agent saved two full sets aside and neither was recoverable once the text had moved. So: **copy a passing take aside before rerolling it.** ****`render.py --only <beat> --force`**** overwrites in place and ranks candidates by character error alone, while ****`verify.py`**** also rejects on no-speech probability. A clean take was replaced by one scoring marginally better on characters, which ****`verify.py`**** then rejected for a no-speech burst and a trailing hallucination, with no way back to the good one. **Save the wav aside before every reroll, not only when chasing a score. Twice in one episode a reroll turned a clean transcript into a defective one at a *better* character error: the loop is not monotonic, and `--attempts` does not help when the problem is the text rather than the seed. Raise `--attempts` when you are trying to beat a known-good score.

**Saving is only half a recovery, so know what putting one back costs.** `render.py` writes `durations.json` and a text fingerprint beside each wav, and copying a saved file into place by hand updates neither, so the animation is then cut to a duration that no longer matches and nothing warns you. Either restore the duration alongside it or keep rolling until a take is clean. **Four takes on one beat is normal**, not a sign the text is wrong.

- **Prefer the larger model.** The 7B model is substantially more stable than the 1.5B on exactly this failure. Use 1.5B for a fast draft, never for the published render.
- **Keep guidance between 1.2 and 1.5.** Higher values make the singing failure more likely.
- **A name that failed once will keep failing in that beat.** "Autoregressive" read correctly in two beats and came back as "auto aggressive" in a third on two consecutive seeds. It is not simply that a fragile name should not open a sentence: the same name can be safe elsewhere in the same episode, so respell it phonetically **in the beat that fails** rather than everywhere.
**And a name at the front can be deleted outright, not just mangled.** "Slurm is the high performance computing incumbent" came back as "Is the high performance computing incumbent?", the name absorbed into the previous sentence, at a character error of 0.015. The subject is simply gone and what remains is a grammatical-looking question. Scanning for a garbled word will not find this; only reading for sense will.

- **Do not open a beat with "Welcome to", "Hello" or a bare "However".** Those openings are reported triggers for the model breaking into music.
- **Generate a paragraph, not a fragment.** One short sentence on its own is the least stable input there is; a beat of three or four sentences is more reliable than the same text split up.
- **Keep reference clips clean.** If the reference audio has music under it, the model will put music under the output.
If four seeds all fail on the same line, the line is the problem, not the roll: it usually contains an unusual proper noun or a number written in a form the model cannot say. Rewrite it phonetically and try again.

### Measure it honestly, or the gate is worse than nothing

A check that cries wolf gets its threshold raised, and a raised threshold stops catching real failures. Both directions of error have happened here, so guard against both.

**False positives come from comparing text that was never comparable.** The script spells numbers out because that is how the model reads them; the transcriber writes them back as digits. Without normalising, every number looks like four errors: "six hundred and forty" against "640", "the seventh of September" against "the 7th", "twenty twenty six" against "2026". One beat was rejected four times over nothing. Convert both sides to the spoken form, including ordinals, and read a year in pairs rather than as "two thousand and twenty six".

**False negatives come from averaging.** A word error rate divides by the length of the whole beat, so a short burst of nonsense inside a long passage stays under the threshold. A closing line passed at 0.128 while containing "not just about a model, at the author cases". So check separately for a run of invented words: three or more words in a short window that appear nowhere in the script. Report the phrase it caught, because that is what makes the failure obvious to a human.

**A third signal costs nothing.** Ask the recogniser for its no-speech probability. A clip that is entirely speech but scores above about 0.5 somewhere usually contains a burst of music or noise, which the words around it will happily transcribe through.

**Two failures the gates never see at all, both found by reading.** A whole invented sentence spliced into a beat: "Every harness scores in one of two ways" came back as "**All of them suck.** They all score in one of two ways" at 0.023, and another beat grew "**What a routine.**" out of nothing at 0.033. Both cleared the burst detector, because an invented sentence is made of ordinary words.

And the shape that invites it: **a run of short noun phrases with no verb is a gap the model fills.** "The model. The judge. The gold labels." took "the readers", then "the joke", then a bare "you", on three different seeds. Rerolling does not fix a line like that; give every item a clause and a verb. The existing rule about generating a paragraph rather than a fragment covers a short beat, not a short clause inside a long one, which is where this actually bites.

**Neither detector sees one real word swapped for another, so read the transcripts.** Both gates are built for noise: a high error rate, or a run of words appearing nowhere in the script. A take that substitutes a single real word trips neither, and changes the meaning completely. "That turns the whole question into review" came back as "Zed turns the whole question into review" at an error rate of 0.010, putting an editor into a sentence about cloud review; a line ending on a bare "ninety nine point nine" grew an invented syllable the same way. **A distinctive phrase repeated inside one sentence gets reused in the wrong slot.** "climbing the proxy you wrote down while the thing you actually wanted stalls" came back as "while the thing you actually wrote down actually wanted, stalls". This is the opposite of the short-fragment failure: a long, well-formed sentence that echoes itself, and the model fills the later slot from the earlier one. Do not repeat a distinctive phrase within a sentence.

**A comma splice can turn an imperative verb into a noun.** "freeze the base, train something small" became "frees the base train something small". Give each imperative its own sentence.

**A word after a full stop can attach backwards and rename the thing before it.** "GRPO deletes the critic. Group relative policy optimisation samples..." came back as "GRPO deletes the critic group. Relative policy optimization samples...", renaming the method across two sentences at a character error of 0.010. The fix is the same shape as the elided "that": open the second sentence with a function word, "That is group relative policy optimisation".

**An elided "that" is the case you cannot adjudicate from the transcript.** "a verifier the domain already had" came back as "a verifier. The domain already had." Every word is correct, so no gate fires and the transcript cannot tell you whether the pause was really there. Do not try to decide it: write "a verifier **that** the domain already had" and re-render.

**A company can be renamed as its own product.** "StepFun took that furthest" came back as "Step 5 took that furthest", directly before a sentence about Step 5 Preview, so the lab and the model became one name across two sentences at a character error of 0.021. It is not quite the swapped-word case, because both words are in the script and merely attached to the wrong thing. The shape to watch for: **a lab name sharing a syllable with a model named nearby in the same beat.** Dropping the lab name fixed it, and it was not load-bearing.

**A figure can be read as a different figure, and the frame will corroborate it.** "four hundred to eight hundred gigabits" came back as "700 to 800" at a character error of 0.052, with the correct number on screen underneath. That is worse than a swapped word, because a viewer checking the audio against the picture finds the picture agreeing with the wrong number. **Bracket a range as "between four hundred and eight hundred"**, never as a bare "X to Y", which is the form that invites it.

The normaliser also had to learn the hundreds reading: a script saying "fifteen hundred to eighteen hundred and fifty" against a transcript of "1500 to 1850" expanded as "one thousand, five hundred" and scored a correct take at 0.073 against the 0.07 limit. Four figure numbers from 1100 to 1999 now read in hundreds. Above that both readings are in use, so the ambiguity is genuine and left alone.

**A trailing phrase can be eaten mid-sentence, not only an appositive.** "whose latents span a block of frames" came back without "of frames", which was the entire point of the clause. Any trailing prepositional phrase carrying the meaning is exposed the same way an acronym expansion is.

Read every transcript against its line, as text, before publishing. It costs a couple of minutes on a ten beat episode and it is the only thing that catches this class.

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
- **Never put a screen reference in a beat's opening line.** The first seconds of any beat are an empty or half-drawn panel, and a `focus` beat spends its lighting time before drawing anything at all, so "what is on screen is the 2026 default" as an opening line points at a blank frame. The timing facts elsewhere explain why; this is the rule, and it belongs where narration is written.
- **Do not end a segment on a bare number either.** The name-position rule covers names; a beat closing on "thirty eight point seven" grew "of questions" out of nothing at a character error of 0.048. Ending on the word "percent" was clean first time.
- When something changes on screen, the line acknowledges the change: "watch what happens when we redraw that", "and that is the piece that disappears".
- Anything on screen that the narration never refers to should not be on screen. **The check does not see a ****`head`**** or a ****`caption`**: `panel_strings` collects `text`, `big`, `note`, `items`, `steps`, `layers`, column and side items, bars and rows, and nothing else. So a `stat` caption, a `points` heading, a `columns` column head or a **`table`****'s column headings** can assert something the narration never says and nothing complains, which is the exact rule this paragraph states. Read them by eye. The table headings matter most of the three, because "the claim", "measured how", "how to read it" are doing real work on screen and none of them is checked.
The rest is checked now, by `check_structure.py`, because it breaks in one predictable place: **trimming for length**. Every cut to a spoken line orphans whatever its panel still says, the layout audit passes it because nothing overlaps, and the frame is left carrying a claim nobody makes. Run the check again after any pass that shortens narration.

**How that check decides, because it shapes how an inventory beat is written.** A panel line passes if it shares one significant word with its beat's narration, or if its squashed spelling appears as a contiguous run inside the squashed narration. So a map item reading "AIME / MathArena" is an orphan unless the narration says those two names with nothing between them, because the word sets otherwise share nothing. **A table's row labels are checked as claims, which catches people out.** Two traps sit on either side of that rule. **An opening line that lists the row labels ties every row to the start of the beat**: "how it works, what that buys, what it comes to" is natural signposting, and it made the lead check time all three rows from the first four seconds, a 16.7 second lead on the last. Drop the signpost or reword the labels. And the left column of a comparison table is often grammar rather than content, "who", "on", "reported", "by", and the check rejected a beat with `nothing in the narration refers to what the panel says, "who"`. A cell made **entirely** of stop words fails outright, which is worth knowing because the opposite is easy to assume: "you own it" is rejected, "the programmer" passes on the one significant word in it. Either make a row label a word the narration actually says, or phrase the line so it does: "Who took which path?" reads better than the alternative anyway.

Either say an item exactly as the panel spells it, or spell the panel the way you are going to say it. This, rather than the field names, is what actually constrains the narration of an inventory beat.

**On a page of acronyms it constrains every panel, not just the inventory beat.** Narration spells names out for the voice model, "C U D A C plus plus", "Cu BLAS L T", and single letters are dropped from the word set entirely, so such an item can pass only on the contiguous squashed match. That makes the rule concrete: **a panel item may not be longer than a run you will say uninterrupted.** `cuBLAS, cuBLASLt` passes only because the line says "Cu BLAS. Cu BLAS L T." back to back; `CUDA C++, via nvcc` fails where `CUDA C++` passes. **The way it breaks is worth seeing too**, because the intruding word is smaller than you expect: `AMD: MI300X to MI400` passes when the line says "A M D, M I three hundred X to M I four hundred", and orphans the moment you write "up **to**" instead of "to", because `up` lands in the middle of the squashed run. On an acronym-heavy page, keep a panel item to one name.

**This dictates how the narration says an acronym, which is easy to miss.** A panel item that is an acronym passes only if the line spells it out letter by letter: `VAE` matches because the narration says "V A E", `GAN` because it says "G A N". Say the expansion alone and the item is an orphan. So the check, not taste, decides that an inventory beat spells its acronyms, and the expansion has to sit beside the letters rather than replace them.

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

**Do not invent a thesis that ties the stories together.** This is the rule, and it was learned by breaking it. The 21 September edition was built as "two stories, one point", with a spine running from a task-horizon chart through a serving-infrastructure post to two mathematical proofs, all of it arguing that the constraint had moved from capability to verification. It is a good argument and the stories did not support it: they were unrelated things that happened in the same week, and forcing them onto one line made the episode harder to follow than reading the page.

A week's news is not an essay. Work like a news outlet: take the stories one at a time, in order of how much they matter, each one introduced, explained and closed before the next begins.

**Grouping is allowed, and only when the stories are genuinely related.** Two releases of the same kind in the same week, a paper and the product that implements it, a claim and the result that contradicts it: those are one story with two parts, and running them together is right. The test is whether you would still mention the second one if the first had not happened. If yes, they are separate, and a transition implying otherwise is a small lie the viewer will feel even if they cannot name it.

If a genuine connection runs through the whole issue, state it once at the end and let the viewer see the stories first. If it does not, and usually it does not, the episode is simply *story one, story two, story three*.

**Stories do not get equal time.** One with a mechanism worth explaining earns two minutes. One that is a single fact earns twenty seconds and a line in the coda. Giving them the same length is a decision to waste the viewer's time on the smaller one, and it is what turns an edition back into a feed.

What replaces the connecting thesis is the opening: say what this edition is, how many stories there are and roughly what they are about, so the viewer knows the shape of the next eight minutes. Then take them in order. The closing take is about the week, not about a thread running through it.

**Do not say that the stories are unconnected.** Just do not connect them. The viewer learns that four separate things happened by watching four separate stories, and a line like "they are not connected, and I am not going to pretend they are" tells them about an editorial decision instead. See the rule below, which this is one case of.

A story is finished when its mechanism, its number and its caveat have been said. Move on with a plain handover ("second story") rather than a transition that implies a relationship. A flat handover is not a failure of craft here; it is the honest signal that a new thing is starting.

Every story opens the same way, in this order, before any mechanism:

1. **The headline**, in one sentence: who did what, in plain words, and then the claim. "Anthropic released a report measuring how much better their models have got at running long tasks on their own" and then the number. A headline that opens on the figure alone ("four minutes to twelve hours") assumes the viewer already knows what is being measured, which is the thing the story is supposed to tell them. Name the actor and the action first, then the number.
2. **Why it matters**, in one or two sentences: what changes for the viewer, or what it settles.
3. **The context** somebody needs to follow it: who these people are, what came before, what the number should be compared against.
4. **Then** the detail, the mechanism and the caveats.
That is the inverted pyramid, and it is the one place the news edition departs from the single-explainer shape: an explainer can hold its conclusion back to build tension, but a viewer scanning the week's news is entitled to know what each story is before deciding to spend two minutes on it. Tension still belongs at the top of the episode as a whole.

What is still banned is the undifferentiated list: eight items of equal weight, read out, with nothing said about which matters or why. Separation and ranking are what make it an edition rather than a feed.

## The topic overview edition

Every root topic page earns one of these: a video that gives you the whole landscape of that topic in one sitting. The thing that makes it its own format is that **the inventory comes first**. It refuses to go deep until the viewer can see the whole board, because no part of a landscape means anything until you know how big the landscape is.

### Two kinds of overview, and they want different videos

Work out which one you have before you outline, because the answer changes the whole episode.

- **A comparison.** The page is a field of things that do the same job differently: model families, database engines, serving stacks, orchestrators. The organising question is what separates them, the video is a tour of the map, and the most valuable thirty seconds is usually the convergence, what they all do the same way and why.
- **A mental model.** The page is one general subject with structure rather than competitors: the maths topic, machine learning fundamentals, systems design. There is nothing to compare. The organising question is what this way of looking at things lets you say that you could not otherwise say, and the beats are the distinctions that only exist when you can see the whole subject at once.
**A single story running through the whole overview is allowed, and is sometimes the best version**, particularly for a mental model, where the through-lines are the point. But it has to be a story the page already tells. Do not invent a thesis to give an overview a spine it does not need: a well-built map, toured in a sensible order, is a complete video.

### The shape, when it is a comparison

1. **What this is, and how current.** The topic, one sentence on what it covers, and the date the page was last updated. **When the page prints no date anywhere in its text, use Notion's ****`page_last_edited_at`**, not the repo's `git log`, which records when the mirror last ran rather than when the page changed. A landscape video is worthless without a date on it.
2. **Name everything before explaining anything.** Build the map on screen: every provider, grouped the way the page groups them, with their models named. Do not explain any of them yet. The viewer needs to see the size and the shape of the field before any one part of it means anything, and naming all of it first is what makes the rest feel like a tour rather than a list.
3. **The organising question.** One sentence: what actually separates these things? Everything after this answers it, and it is what stops the video being an inventory read aloud.
4. **The philosophies, one per beat.** For each provider, what that lab is actually doing differently, in a sentence or two. Not its product line: its bet. "OpenAI hides a router, Anthropic exposes a token budget" is the shape to aim for, because it explains behaviour the viewer has already noticed. Group them so the contrasts land next to each other rather than alphabetically.
5. **Compare on one axis at a time.** Open against closed. Breadth against a single flagship. Who decides how much the model thinks. A comparison that changes axis halfway is a list wearing a chart's clothes.
6. **Then the convergence.** What everybody is doing the same way, and why. This is usually the most valuable thirty seconds in the video, because it is the part a reader of the page skims and a practitioner needs.
7. **The numbers.** Benchmark scores, prices, active-parameter ratios, whatever the page carries. Late, not early, and always with who measured them. A vendor's own table is labelled as such, on screen and out loud.
8. **The take.** What the map is for. What would change it.

### Rules particular to this format

- **The map is the home frame.** It is built once, parked, and every later beat highlights the part of it being discussed. A viewer must always be able to see where the thing being explained sits in the whole.
- **One thing per beat, usually.** The moment two of them share a beat, the narration starts listing. The exception is a pairing that is itself the argument ("one hides the reasoning budget, the other hands it to you"), which is a comparison rather than a list, and is worth more than either half alone. If you pair, say in the docstring why.
- **Say the model names.** The inventory is the point; a viewer should be able to hear a name they half-know and place it.
- **Six to seven minutes, and never past seven.** There is one length rule on this page, not a format-specific one, and this is it: seven minutes is the wall, because that is where the encode ladder gives up 1080p. An overview is a reference video and its length is the map rather than padding, but a map is a selection, and six minutes of selection beats nine minutes of recitation. An overview that comes in under six is finished rather than short, though none in this series has managed it.
An overview that wants nine usually has an inventory that wants splitting. When the topic genuinely cannot be split, and some cannot, the answer is not to cram: make the map an openly stated selection, say on what axis it was selected, and name in the script's docstring what was left off and the episode it would make. A seventy row table does not become sayable by being read faster.

- **The page is the inventory's source.** If the video names a model the page does not, the page is out of date and that is the defect to fix first.
- **Work out what the inventory actually is before assuming it is a list of competitors.** The llms map is providers and their models. The CUDA map is layers of a stack: what the machine is, where you are allowed to write, and what you call instead of writing anything. Same format, same furniture, completely different axis, and getting that axis right is most of the work of a new overview.

## The deep dive edition

A deep-dive page explains one mechanism. Its video does the same, and the temptation to resist is turning the page's six or seven headings into six or seven sections, which is a table of contents read aloud.

**This is the format where the 3Blue1Brown method pays off most, so lean on it hardest here.** The other two formats borrow its honesty about mechanism; this one borrows the whole method. The goal Grant Sanderson states for his own work is that the viewer should come away feeling they could have invented the thing, and that is achievable for one mechanism in eight minutes in a way it is not for a landscape or a week of news.

What that means concretely, beyond the rules below: go slower than feels necessary, build one idea at a time, let the picture carry the argument rather than illustrate it, and say the confusion out loud instead of hiding it. A deep dive is allowed to spend a minute on something a viewer could have looked up, if that minute is what makes the next four make sense.

This is also the one format where a single line of reasoning genuinely is the structure, so the contract, the question, the objection and the closing resources are all required rather than optional, and the structure check enforces them.

- **Pick the load-bearing idea and follow it.** One page usually has one sentence that everything else is downstream of. Find it, open on it, and let the other sections arrive only when the walk needs them. Anything the walk does not need belongs to the page, not the video.
- **The worked example is the spine, and it is compulsory.** Take one concrete case, with real numbers from the page, and carry it the whole way. Concrete before abstract is not a stylistic preference in this format: it is the only way a viewer ends up able to redo the reasoning.
- **Derive on screen, do not assert.** If a figure follows from two other figures, show the division happening. That is precisely what a reader skimming the page does not get, and it is the reason to make a video of a page at all.
- **Name the wrong model the viewer is carrying, then replace it.** "You think the card is slow at arithmetic. It is not, it is starving." A deep dive that does not correct a belief is a list of facts.
- **One diagram, built up.** Not a sequence of pictures: one construction that grows, so that pausing anywhere shows the whole argument so far.
- **End on the resources.** The last frame names the two or three best resources from the page's own Best resources block. The video is an entry point to a subject, not a replacement for reading about it, and saying so is what stops it pretending otherwise.
- **Build the intuition before the formalism, and say which you are doing.** The viewer should be able to predict the next step before you take it. If they cannot, the step before was too big. This is the difference between somebody who can repeat what a mechanism does and somebody who could have derived it.
- **Name the confusion instead of hiding it.** "A lot of people find this part genuinely confusing, and here is exactly which bit." A deep dive that pretends the subject is easy leaves a viewer who does not follow it assuming the fault is theirs.
- **As long as the idea needs, and slower than the news edition.** Usually six to ten minutes. A mechanism needs pauses that a news item does not, and a deep dive that has said everything in five minutes is finished.
- It still may not out-claim the page, and any explanation the video invents to make the mechanism land goes back into the page in the same session.

## Running it, in the mirror repository

The toolchain lives in the GitHub mirror, under `video/`, and this page is mirrored into it as a loadable skill, so these commands are here rather than in a second copy of the method.

1. Write the script into `video/scripts/<episode>.py`: beat keys mapping to `(speaker, line)` turns, a `FORMAT` declaration, and short sentences. Add `TITLE`, `SUBTITLE` and `UPDATED` for the title card.
**The episode name is the join key and nothing derives it for you.** It names the script, the `KB_EPISODE` the scene reads, the audio directory, `out/<episode>.mp4`, the timing and layout files, and the argument every check and the uploader take. Derive it from the page: a news issue is `tech_news_YYYY_MM_DD`, a topic page is `topic_<slug>_overview`, a page inside a topic is `<topic>_<slug>`. Underscores, no dashes, because it is a Python module name.

1. In the same file, declare `VISUALS`: one entry per beat key, saying what that beat shows. This is the normal way to build an episode now, and it needs no scene file at all. The vocabulary is in the section below.
2. Write a scene file by hand only where the argument needs its own picture, in which case `video/scenes/<episode>.py` inherits `common/overview.py` for a page-derived episode or `common/deepdive.py` for a mechanism, and a beat must not depend on an object another beat created. Nothing needs registering anywhere: an episode is found by its file.
**Note what a declarative episode actually renders through**, because the answer is not obvious and one reader was sent the wrong way by the sentence above: `scenes/_generic.py` to `common/episode.py` to `PageVideo` in `common/overview.py`. Its scene class is always `Episode`, which is what the checks that ask for one want. `common/news.py` is only reachable from a bespoke scene and is not on this path, so the news furniture it holds is not available to a declarative episode. Satisfy the news format's "visible break and the story's own title on screen" with a `claim` panel at each story's open and the ordinary clear between beats. That works, and it is the intended answer rather than a workaround.

1. Check the shape before rendering anything:

```bash
uv run python video/tools/check_structure.py --script <episode>
```

1. Preview silently, then pull frames and look at them. The preview writes `out/<episode>.preview-l.mp4`, so it can no longer be mistaken for the delivery file, but **the episode still has to be rendered at full quality before it is published**:

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
video/tools/gpu.sh uv run --group tts --group video python video/tools/check_references.py --script <episode>
uv run --group tts python video/tts/verify.py --script <episode> --device cuda
```

`check_references` defaults to the `Episode` scene class, which is right for every declarative episode; pass `--scene` only for one with a bespoke scene file.

The layout audit needs no command: it runs inside the render and writes `video/out/layout_<episode>.json`.

1. Watch it, then attach it to the canonical page and record it in Updates.
**A video goes at the top of its page, always.** Above the reading-time line, above the prose, above everything. It is the fastest way into the page, and appended at the bottom it is something the reader finds only after they no longer need it.

This is not a thing to arrange by hand on each page:

```bash
uv run python video/tools/upload.py <page_id> <episode> "<caption>" "<blurb>"
```

The **caption** sits under the player and is the episode's title and subtitle. The **blurb** is the paragraph above it, and it exists to keep the page authoritative: say what the video is, then say that the page is canonical, that the video is a derived representation, and that every figure in it came from the page.

The **page id** is the Notion id of the page the video derives from. `video/tools/episodes.json` already holds every topic overview, with its episode name and its page id, so there is no row to add. A news issue is not in it, so find that one by title through the Notion API. `video/tools/upload_all.py` does a whole batch from that map, and refuses any episode whose script has changed since it was rendered.

The tool handles placement: Notion's API has no "insert before", so it sends the video blocks and a copy of the page's current first block as one batch positioned after that block, then deletes the original. It also takes down any video section the page already has, so remaking an episode replaces the old one instead of leaving two, and the stale one is always the one somebody watches.

One trap, learned by doing it wrong on a live page: **do not position anything ****`after`**** a block you have just created.** Notion accepts the request, ignores the position, and appends to the END of the page. A page lost its reading-time line from the top and gained it as the last thing on an eighteen minute article, with no error anywhere.

This is not a fact about video blocks, and reading it as one costs an hour. The same silent append happens to `insert_content` with a `selection_with_ellipsis` naming a heading: the new block lands under the child page links at the foot of the page and nothing reports it. Treat the rule as general. The only placement that is reliable is a raw `PATCH /blocks/{page_id}/children` carrying `after` set to a block that already existed before this session's writes, and after any positioned write, re-read the children and check where the block actually landed. `insert_content` also flattens bold to plain text, so rich text has to be built by hand.

The page stays canonical underneath. Leading with the video says it is the fastest way in, not that it is the authority: the note under it says so, and every figure in it came from the page it sits on.

After any refactor of the toolchain, build one episode end to end before calling it done: a moved path or a renamed tool does not surface until something uses it.

### Declaring what a beat shows

The first episodes were three hundred lines of hand-positioned manim each. That is how the visual grammar was worked out, and it is the wrong way to make forty, for reasons that are not about effort: hand-written scenes drift apart until the series stops looking like a series, and the bugs they carry are positioning bugs, invisible in the code and visible only in the frame.

So a beat declares its picture from a fixed vocabulary, and one generic scene draws it. The vocabulary is the furniture the hand-written episodes had already converged on:

- `title`: the page, what it covers, and the date it was current.
- `points`: a short list, revealed a line at a time. The commonest beat there is.
- `columns`: the map. Named groups of things, built group by group. Usually carries `park`.
- `stack`: layers where the order top to bottom is the argument.
- `flow`: a left-to-right pipeline with arrows.
- `bars`: a comparison where the length is the point. Give `value` per bar and let the widths be computed. A chart whose bars were sized by hand is a chart that can lie by arithmetic.
- `stat`: one number, large, with its caption.
- `compare`: two positions side by side, so the difference is spatial rather than remembered.
- `table`: rows and columns, for when the grid itself is the content.
- `claim`: one sentence alone on screen, for the take.
- `resources`: where to go next, which every deep dive owes the viewer.
Three modifiers: `park` shrinks the panel into the corner and keeps it as the home frame, `focus` lights up one named part of it in a later beat, and `keep` leaves the previous panel up instead of clearing it. Exactly one beat may park.

**A news edition parks nothing.** A parked panel stays in the corner for the rest of the episode, so parking story three's map leaves it there through story four and the take, which is exactly the implied relationship between unrelated stories that the news format exists to avoid. The home frame belongs to an overview, where the map genuinely is the spine of the whole video, and to a deep dive's single construction.

**If a previous cut of this episode exists in git history, read it at the outline and then write fresh.** Episodes get cleared when the method changes, and the old one is worth reading for the inventory axis it found and the traps it hit. It is not worth reusing: it was written to rules that no longer apply, and at least one deleted cut asserted a date its own page does not carry. The specific thing to look for is **figures imported from a child deep dive into a topic overview**, which is what half the beats of one cleared cut were built on. The page being explained is the inventory's source; a number that lives only on a page below it does not belong in the overview.

**Check relative dates against the page, not against your sense of now.** "Three weeks old" was written for a paper the page dates six days earlier. The rule that every number traces to the canonical page covers this only implicitly, because a date phrased as a duration does not look like a number.

Find it with `git log --all -- video/scripts/<episode>.py`; the cuts written against the old skill were cleared in commit `74326b3`. Read it before the inventory axis is chosen, not while declaring what a beat shows, because the axis is exactly what a previous cut is most likely to have already got right or already got wrong. One overview's first draft repeated a subject taxonomy that the deleted cut's docstring had already recorded as tried and rejected.

There is a fourth modifier, `reserve`, which holds back a number of seconds at the end of the beat so a panel finishes revealing before the line pointing at it ends. The units are seconds, not a fraction: existing episodes pass values like 9.0. Note also that it holds the tail, not the head, so it is no help at all to a line that points at the panel in its opening words.

**`reserve`**** also schedules the park.** `beat()` runs `spread()`, then a two second settle, then the park morph, then `hold()`, so a generous reserve on the map beat collapses the map to its headings while the narration is still naming items.

That settle is new, and it exists because the format's premise was not being met. The overview shape says the viewer needs to see the size and the shape of the field before any one part of it means anything, but `spread` landed the last column at the end of its budget and the morph began immediately, so the complete map existed only for the 0.7 seconds of the morph and never once stood still. The reserve could not buy that time, being the tail after the park. The settle comes out of the front of the reserve, so **a parked beat wants a reserve of about two seconds plus whatever motionless tail it can afford.**

**On a parked beat that floor beats the fit.** Fitting the reveal arithmetic to one map beat asked for a reserve of 2.1, which is less than the 2.7 the park spends on settle and morph, so the fitted value leaves the finished map no still time at all and the format's premise goes unmet. The two rules genuinely conflict and the floor wins: **never go below about 2.7 plus the tail you want on a parked beat, whatever the fit says.** Accept that the middle of the map draws a few seconds ahead of the words. Make the map beat's last line the one that survives the collapse and the trap becomes the transition: "That is the whole board. It goes in the corner now, and it stays there." Use it whenever the narration names something drawn late: a three step `flow` named in one sentence otherwise draws its third step two thirds of the way through the beat, and the narrator points at the right of the screen twelve seconds before anything is there.

Two timing facts that are not obvious and will cost you a re-render:

- **A beat carrying ****`focus`**** delays its own panel** by about **0.25 seconds per handle**, spent **at the head of the beat**, because `beat()` lights the map before it builds anything. A handle is an **item**, not a row: `compact()` registers one per item and one per heading, so a four column map of four items each is twenty fades and **five seconds**. This page has now been wrong about that figure in both directions, four times too high and then four times too low, which is what comes of counting the thing that is easy to see instead of reading `compact()`. Five seconds off the front moves every reveal on the beat, so `check_leads` models it now; before it did, a focus beat's leads were reported several seconds early and an author trusting the check alone would ship one it had passed. Note what that scales with: `focus_on` fades every handle, lit or dimmed, so a five row map costs about 1.25 seconds whether you name one label or five. This page used to say a second per label, which is four times too much on the usual map and led one author to restructure an episode around a cost that was not there. That is what decides whether a line pointing at the panel in its opening words is safe. A screen reference in the first line of such a beat lands on an empty frame. The general form of this is worth holding on to, because it bites without `focus` too: reveals are spread across the whole beat, so the first several seconds of a forty five second beat are an empty or half drawn panel whatever the beat carries. A line one second in that asks "who measured these" has nothing to point at. Put the reference after the picture, or hold the picture back with `reserve`.
- **A partial reveal under a reference is fine.** "Look at what that checkpoint buys" correctly lands with two of four items drawn, and `check_references` will still show you that frame. The checker is working, not complaining.
**A ****`stack`**** parks too, not just a ****`columns`****.** It collapses to its layer names and registers its focus handles by them, so a stack is a good home frame when the order of the layers is the argument. **It reveals in list order, which means top first**, so a stack whose base is at the bottom, a protocol stack most obviously, is drawn in the reverse of the order you would naturally tour it. Either write the tour downwards or list the layers bottom-up; a cleared cut got this wrong and would have named every layer against the order it was drawn.

The orphan check also reads **both** halves of a layer tuple, the name and its gloss. A gloss is naturally a list of acronyms, so the contiguous-run rule applies to it: "O Auth, O I D C, J W Ts" has to be said back to back with nothing in between, which constrains several segments of the map beat rather than one item. One catch: `compact()` gives every row of a parked stack the **same tone**, so a stack map cannot colour its stages differently the way a columns map can.

**What parking actually leaves on screen.** The parked map is its column headings and nothing else, and `focus` only changes their brightness. The detail does not come back. So a parked map is an orientation device, four or five words telling the viewer which part of the subject a beat belongs to, and any beat needing the detail again has to draw it again.

**`focus`**** is a state, not a flash, and it persists until something changes it.** Three columns lit for one beat stay lit through every later beat, so the map goes on asserting a relationship long after the narration has moved elsewhere. Nothing warns you: the frame is legible, and the check only asks whether the labels exist. To return to neutral, light everything, because a `focus` naming every label reads as no emphasis at all. Decide the lit state of the map for every beat after the first one that touches it. Deciding can mean no `focus` at all: when the previous beat already left the map right, a redundant `focus` buys nothing and costs about a second of panel delay. Say in the script where you did that, so it reads as a decision rather than an oversight.

**A ****`focus`**** on a ****`context`****-toned column is invisible.** Read the instruction above as: pass a `focus` listing every label, and the uniform result is what reads as neutral. Against a parked map, every label means every column heading, since a focus there resolves items to their heading. A column's `head` is itself a valid `focus` label, registered alongside its items, so pass the heading rather than hunting for an item that stands for the column.

And a focus on a `context`-toned column is invisible: that tone is already the de-emphasis colour, so lighting it produces no change on screen while the narration says to look at it. Nothing warns you, and a beat lighting two columns can have only one of them visibly move. Give any column a beat will point at a tone with somewhere to brighten from.

**Choose the panel by how many reveals it has, because that is what sets the pacing.** The reveals are spread evenly across the beat, so a panel with few of them on a long beat leaves long motionless stretches that no reserve can fix: `reserve` is the tail after the last reveal, not a way to delay one. **Budget roughly ten to thirteen seconds per reveal.** A fifty second beat wants four or five; a two-reveal panel on it cannot be saved. Run that the other way at the outline and it gives you the episode: four or five reveals is a fifty second beat, so seven or eight beats is six and a half to seven minutes, which is the whole budget. **If a beat needs six or seven reveals, it is a sixty five second beat and the episode has room for fewer of them.** Decide that before writing, not after rendering.

**An inventory beat runs 30 to 40 words a minute slower than prose, and that is the single biggest source of reserve error.** A list of short names separated by full stops is read slowly: one map beat delivered 109 words in 55 seconds, 113 words a minute, where the 150 estimate predicted 43 seconds. That twelve second error put the third column five and a half seconds behind the line naming it. **Budget a map or inventory beat anywhere from 95 to 135 words a minute**, and everything else at 150. **What sets the pace is the syntax, not the column count.** Every measurement behind the slow end is a map beat written as bare names separated by full stops, which is read slowly; a four-column map written as four ordinary sentences with the names inside them came back at 139 and 145. Budgeting it at the slow figure cost one author seventeen seconds on a single beat, in the direction that makes you cut material you did not need to cut. That range is embarrassingly wide because the measurements are: 95 twice on one episode, 113 on another, 131 and 148 on a third. The spread is the point. **Do not plan a reserve on any per-beat estimate; render the voice and fit from the real durations**, which is the only figure worth trusting. The low end came from one beat at 113 and this page briefly stated it as a rule; another map came back at 131, which is six seconds on a fifty second beat and enough to move a fitted reserve. Treat any per-beat estimate as a placeholder: **render the voice and fit from the real durations**, which is the only figure worth trusting. The aggregate estimate is fine for total length and useless per beat, which is exactly where the reserve arithmetic needs it.

**Write the narration in as many segments as the panel has reveals, and name each item progressively deeper into its own segment.**

Equal segments alone cannot work, and the arithmetic says why. Segment k *starts* at `(k-1)/n x D` while reveal k is *drawn* at `(k-1)/(n-1) x (D - r)`, and those coincide only when `r = D/n`: ten seconds on a fifty second five-reveal beat, against the 5.5 ceiling this page imposes elsewhere. **So "equal segments" and a legal reserve are jointly unsatisfiable**, and one author followed both and got eleven reveals named before they were drawn, up to 10.2 seconds. **Here is the number to write against.** Segment k must begin at or after the word fraction `(k-1)/(n-1) x (beat - reserve) / beat`. For five reveals with a five second reserve on a fifty second beat that is **0, 23, 45, 68 and 90 percent** of the beat's words, not 0, 20, 40, 60, 80. The later the item, the deeper its segment starts, and the last one begins nine tenths of the way through.

Equivalently, keep the segments roughly equal and name item k about `(k-1) x W x (D - n x r) / (n x (n-1) x D)` words into its segment, which for a typical beat is three or four words further in each time. Item one opens its segment; item five is named a dozen words in. The opening segment is where this fails, not the last, and the reason is structural: a beat naturally opens with a nine to fourteen word orienting line and then runs three thirty word segments, while `spread` gives the head an equal slice of time. One episode wrote to the rule and still shipped four beats where the narrator ran five to eight seconds ahead, every one of them at the head: paged attention named at 3.4 seconds and drawn at 11.2, chunked prefill named at 5.2 and drawn at 10.5. **Budget five to ten percent of the episode's length for lead balancing.** Every lead fix is "put more words earlier in the beat", so the arithmetic that satisfies those ratios can only be paid for in words: one episode went from 988 to 1,067 with no new content at all, purely on lead balancing, and that is what carried it past the seven minute clock. Plan for it at the outline instead of meeting it as a surprise after the voice exists.

**That gives you a length pass that cannot break anything**, which matters because the two budgets on this page reliably produce a draft well over: cut only from **after a beat's last reveal is named**, and take it from whichever beats `--reserves` shows the most slack on. Cutting anywhere else moves names earlier and can open a lead in a beat you were not even editing.

**Trimming a beat's tail is always lead-safe; trimming its head is not.** Cutting words after the last item is named shrinks the beat and so pulls every reveal earlier, while leaving the moment each name is spoken where it was. That makes a final length pass mechanical rather than a gamble. Cutting from the head moves every name earlier and can open a lead anywhere.

**The opening segment has to be as long as the others**, and an over-long one is safe: it pushes every later reveal ahead of its words, which the check passes by design. That is what makes merging beats possible, and it is how one episode folded its organising question into the ladder beat and came out at eight beats instead of nine. If you merge the question into another beat, **rename that beat ****`question`**, because the role comes from the key.

**A parked ****`columns`**** map is the same effect seen on four columns, and its segments are deliberately unequal. **A `bars` beat cannot gain rows, so one over about thirty seconds is a design error at write time. Every other panel can take another row when its landings are too far apart, but a bar needs a value, and if the page has no third figure there is nothing to add. That leaves only giving up the chart: one re-cut had to turn a 62.7-against-99.9 comparison from two bars into two figures a line apart, a real loss and not repairable after the fact. Size a `bars` beat at write time, or use a different panel.

A heading is drawn at t=0 and still spends a share of the drawing budget, so dropping it outright is often the cheapest repair available: two beats lost their `points` heading and their first real row stopped landing 8.9 seconds after the line that named it. Where the heading text is worth keeping, make it the last row, which is usually where the narration says it anyway.

**A ****`points`**** head is a reveal of its own too, and that is the systematic cause of leads on a points beat**: it consumes one share of the drawing budget while carrying a single short framing sentence, so every later item is named before it is drawn, and one episode had all five of its points beats uniformly three to nine seconds ahead for exactly that reason.** Reveal n lands at ****`beat - reserve`**** and the reserve is capped near 8.4, so **everything said after the last column is named has to fit in about eighteen words**. That forces roughly 28, 28, 28 and 16 percent of the beat's words across four naming segments, with the last column's heading spoken about six words into the final one. Written that way a four-column map came in with a worst lead of 2.0 seconds first time; written as four equal segments it is the defect another episode shipped, its fourth column drawn six seconds after it was named. The count alone is not enough, because reveals are spread evenly **in time**: a 44 word segment next to an 18 word one still leaves reveals landing seven to nine seconds behind their words. **And the match is lexical, not structural, which makes it a rewriting rule rather than a reserve one.** The check looks for a reveal's label words anywhere in the narration, so a word appearing in an **earlier** segment than its own reveal produces a lead however perfect the segment structure is. One episode lost four beats to this: a close saying "not a reading order" in its head segment while that was reveal two, and a panel item containing "transformer" poisoned by the word being spoken two segments earlier. **A panel item's words must not appear in the narration before that item is drawn. If they must, reword the item: "what is left of the lineage" for the transformer pill.

Two more things follow. Measure a lead from the moment the **name** is spoken rather than from the segment start, since a segment opened by B's short question looks worse than it is. And when segments genuinely cannot be balanced, **add a row to the panel**, and reach for it **before** rewriting the narration: adding one row changes n and therefore re-spaces **every** landing on the beat, which is the highest-leverage edit available, and five one-line `VISUALS` changes took one episode's worst lead from 12.9 seconds to 3.3 with no GPU, no re-render and not one word changed. Reach for it whenever a segment has nothing to land on, or when everything after the last reveal overruns the reserve: one episode took `schedulers` from four items to five because two products had no reveal, and `ray` from four to five because twelve seconds of narration followed the last one against a reserve ceiling of five. A CPU-only change, far cheaper than re-rolling the voice. This falls straight out of the arithmetic and it is the single most expensive thing to get wrong. Reveal n lands at exactly `beat_length - reserve`, so **everything said after the last item is named has to fit inside the reserve**: six seconds, about fifteen words. The shape is **`n - 1`**** roughly equal segments plus a short tail**, not n equal ones: reveals 1 to n-1 share the span `[0, beat - reserve]` while reveal n lands exactly at `beat - reserve`, so the last segment gets only the reserve, about a dozen words. Written as five equal fifths, a three-reveal `bars` beat puts the second bar's name ten seconds before the bar. One episode broke this in four of six panel beats and cost a full redraft: the map named its third column thirteen seconds before it appeared, and a harness beat named two tools twelve and sixteen seconds early.

**`check_leads.py`**** measures it, so stop doing the arithmetic by hand.** This page used to say nothing saw the defect, which was true and left every reader to invent the same ten line script. Reveal k lands at `(k-1)/(n-1) x (beat - reserve)`; a word at index i of w is spoken at about `i/w x beat`; the check subtracts them, matching a reveal's labels the squashed way the orphan check does.

**It reports what it could not time, and that is not the same as a pass.** The orphan check has a second route, a shared significant word; this one does not, because a reveal has to be located at a *moment* and a common word turns up earlier in a beat for other reasons. Matching that way was tried and timed one genuinely clean episode as eighteen leads. So a label the narration never says as a contiguous run is listed as `NOT SAID VERBATIM, so not timed` and left alone. **Write every panel item as a phrase the line actually says**, and where that is impossible, time it by hand rather than reading the silence as clean.

Concretely, an item is timeable if either the whole thing squashes to a run the narration says, which is how a spelled-out name matches (`pgvector` against "P G vector", `44.7%` against "forty four point seven"), or **two of its words of four or more characters appear as exact whole words, in order, within fourteen words**. The two words have to appear **in the order the label gives them**, so "a recorded trajectory" fails against "a trajectory recorded"; and a contraction in a label contributes a word the narration may never say, so "don't replace" against "not replace" is untimed. That second route is also what silently excludes an item built from short words: "cut" is three characters, and "3am" squashes to "threeam" against a line that says "three in the morning". Rewriting one item is usually cheaper than accepting an unchecked reveal.

One collision the matcher cannot report: **a bare digit in a label squashes to a number word, which then matches a spoken year.** A label with "5" becomes "five" and times itself from "twenty twenty five" earlier in the beat. An early match overstates a lead rather than hiding one, so it produces false alarms, not missed defects; still, keep digits out of labels on a beat that says a year, or the report stops being trustworthy.

A second route catches the common paraphrase case: two or more of a multi-word item's significant words, in order, inside a fourteen word window, so "chunking moves quality most" is found in "chunking is still what moves quality most". It matches whole words rather than substrings, because "gain" sits inside "against" and a substring test once placed a label four seconds into a beat that names it forty seconds later. **A ****`points`**** list of paraphrased sentences is still the weak case**: one episode had 23 of 32 reveals unmatched, and hand-timing then found agentic RAG named 12.9 seconds before its row, chunking 8.8 and the reranker 7.1, all past every check. `columns`, `bars`, `stat`, `claim` and `table` time reliably; a `points` beat wants verbatim item strings or a hand check.

```bash
uv run --group tts --group video python video/tools/check_leads.py --script <episode>
```

**Run it before the voice as well**, with `--estimate`, which works from word counts at 0.40 seconds a word instead of measured durations. That closes the gap between the outline and the GPU where there was nothing but hand arithmetic: on three episodes tested it returned exactly the same verdicts as the measured run, 8 leads, 5 leads and clean. Fix the writing there, then run it again on the real durations.

The sign is the thing to get right, and both readings of "subtracts them" are natural. **The rule is an inequality: segment k must begin at or after reveal k lands.** In words, the cumulative word count before segment k has to be at least `(k-1)/(n-1) x (beat - reserve) / beat x total_words`. One author built the arithmetic inverted, read "safe" for beats failing by five to thirteen seconds, and caught it only by noticing the check passes anything named at or after it is drawn.

It wants the real durations for the final pass, so run it again after the voice. **A lead you cannot explain from the segment structure is usually a label collision**: the check matches a reveal's label anywhere in the beat, so a map whose linear-algebra column contained a pill reading "matrix calculus" reported a 16 second lead on the *calculus* column. The artifact was pointing at a real defect, because a parked map carrying the same word as both a pill and a heading is ambiguous to the viewer and to `focus`, which resolves items to headings. Rename one of them. Watch for one silent trap while iterating: **`build.py`**** prints ****`nothing to render`**** both when everything is up to date and when the edit you just made failed to apply**, so a bad match string looks exactly like success. If a beat's duration has not moved after a rewrite, check the file before rebuilding. Treat two seconds as noise and six as a beat to rewrite. **The figures are estimates, good to about a second either way**, because the check assumes the narration runs at an even rate within a beat: one reported 3.1 second lead was 2.3 seconds by word timestamps, and that 0.1 over the line forced a voice change that was not needed. Before re-voicing anything for a lead within a second of the line, check the real timing with word timestamps from faster-whisper. Import `torch` before `faster_whisper` in any script of your own, or ctranslate2 fails to find libcublas; `verify.py` does this and says why in a comment. It is not a floor to clear once: **its first run found leads in four of the first nine episodes, up to 39.9 seconds** of a narrator pointing at an empty frame, every one of which had passed all the other checks.

A corollary worth knowing before you fight it: if a closing claim has no reveal of its own to land on, it has to live in the reserve, and the reserve is not long enough. **Add a row to the panel** so the claim has something to arrive with.

What each kind reveals: `stat` 2 (the number **with** its caption, which are one mobject, then the note), `compare` 2 (one per side), `claim` 1 or 2, `columns` one per column, `stack` one per layer, and `points`, `flow`, `bars`, `table` and `resources` one per row or step, plus one for the head where there is one.

**A ****`columns`**** reveal is timed from whichever of its labels the narration says first**, head or item, not from the head. So moving the product names in front of the category name to buy runway buys nothing at all.

**Two heads that behave differently, which is worth holding on to because it moves every landing on the beat.** A `columns` heading is drawn as part of its column and is **not** a reveal of its own, so a three column map is three reveals. A `table`'s head row **is** a reveal of its own, so a table with a head and three rows is four. A `points` head behaves the same way. Either is a **free** reveal: drawn at t=0, so it can never produce a lead, which is why a handful of untimed heads in the lead report is structurally fine rather than alarming, and excluded from the orphan check, so it carries no naming obligation either. **Free for itself, though, and it costs every item after it one place**, which is the part that bites: on one beat the head pushed the first real item from reveal 1 to reveal 2 and put it 8.7 seconds ahead of its row. Count it in n and then forget it. Count wrong and every reveal after it lands somewhere else. `claim` **and ****`stat`** draw their big line **first**, at the top of the beat, so neither can build towards its own headline: the headline is already on screen while you argue for it. If a beat's shape is an argument arriving at a statement, use a `stack` or `points` and let the statement be the last row. They also deserve their own warning: both have two reveals, the second of which is the `note`, so it lands at `beat_length - reserve` and **the sentence the note paraphrases has to be the last thing said in the beat.**

**Fit that to the sentence, not to the turn that contains it.** A two-reveal beat whose turns are 9 words and 45 words asks, if you fit naively to the second turn's start, for a reserve of sixteen seconds. The note belongs to a sentence inside that turn, and fitting to the sentence gave 2.7. One draft said it eight seconds in and the card carrying it appeared fifteen seconds later.

So **`stat`****, ****`compare`**** and a two-reveal ****`claim`**** are all roughly 25 second panels**, sharing identical arithmetic. And **`bars`**** cannot be repaired at all once written**, and neither can a long `stat`, for a related reason: it has two reveals, so on a 55 second beat the frame moves at the top and not again until the note near the end, while `still` scores only the tail after the last reveal and reports a pass. Keep a `stat` beat to about 25 seconds, or carry the number in a `points` head. The `bars` case is that a bar needs a value: with no third measurement on the page there is no row to add, so a `bars` beat over about thirty seconds has to be re-panelled or rewritten. Two re-cuts lost a chart to this, one of them a comparison whose entire point was the length of the two bars. Choose `bars` only for a beat you already know is short. And **with three reveals the last item gets only the final tenth of the words**, since reveal 3 lands at 90 percent of the drawing budget, so a three-column `columns` panel is structurally wrong for a beat whose **third** item is the payoff: one author gave the item that actually mattered ten words and had to rebuild the panel. Put the payoff on a row of its own, or use a panel with more rows so the landings space out. One author built a `stat` beat for a figure, found it could not carry the material, and had to merge it away and rewrite. `compare` is a **short beat's** panel, however well two positions side by side suit the argument: one episode's first draft used it on two long beats and the preview came back with 19.3 and 22.3 second still frames. The fix was `points`, and for a compare specifically **not ****`table`**, though a table looks like the natural upgrade. A compare's narration runs one side fully and then the other, while a table's rows span both sides, so every row is named in the first half of the beat and drawn in the second. One author designed and discarded two tables before working that out. Pick the kind that fits the beat's length, then write the line to it.

The field names each panel takes are not listed here on purpose, because a second copy of them would drift. `PANEL_FIELDS` in `check_structure.py` holds the required ones and `common/episode.py` holds the optional ones, and the check tells you what is missing before anything renders. The tone names a script may use (`subject`, `number`, `verified`, `cost`, `machinery`, `context`) are the keys of `SEMANTIC` in `common/style.py`.

Two more things that live in code and nowhere else. **A beat's key is what gives it its role**: `CONVENTION` in `check_structure.py` maps `question` to the role question, `ident`, `open`, `cold_open` and `title` to opening, and `close` and `take` to take, so a beat named anything else does not fill that role unless the script declares `ROLES`. And **the title beat's reserve is fixed at 2.4 inside ****`title_card`**, not settable from `VISUALS`.

A bespoke scene is still allowed and has to earn itself. The memory pyramid and the roofline in the GPU deep dive earn it, because those pictures are the argument. If the vocabulary can carry the beat, use the vocabulary: a consistent series is worth more than a clever frame.

#### How much fits

This is the number authors actually need, and "keep panels small" is not it. The frame is about 14 units wide. A parked map takes the left 4.2 plus a gutter, so the free region beside it is **about 7.8 units**. **A ****`columns`**** panel reads top to bottom within each column**, so architectural language has to match: writing "c ten d underneath, D Tensor above it" contradicts a frame where c10d is the topmost pill. Decide which way the stack runs on screen before writing "above" or "under" at all.

**Changing a panel's kind invalidates every spatial word in the beat, and no check can see it.** A `VISUALS`-only repair feels safe because the narration is untouched, but "on the right of the screen" is false the moment a `compare` becomes a list, and `check_references` has no such phrase in its list. Re-read the beat's lines against the new panel by hand; two of one re-cut's three broken references were found no other way.

**Four columns is the practical maximum for a map**, and a fifth page-level group belongs inside one of them or in a beat of its own. The "five is the coloured-blocks failure" figure is for the space beside a parked map; on the map beat itself there are about 12.4 units, so five is marginal rather than fatal, which is a distinction worth not having to derive from the formula.

In that space, three columns or three flow steps are comfortable, four are marginal, and five are the coloured-blocks failure. Without a parked map you have about 12.4 and can afford one more of each.

Everything that draws itself wide has to be derived from that number rather than fixed, and the two that were not both produced the same defect: a four-column map at a fixed pill width was nineteen units wide before anything was drawn, and a bar chart at its default span was thirteen. In both cases `fit` scaled the labels below what the delivery encode can show, which the layout audit then reported as text too small to read.

#### What the vocabulary still cannot draw

Worth knowing before you plan a beat around one of these, because every one of them was worked around rather than solved:

- **Focus is column-level.** Against a parked map, every item resolves to its column heading, so lighting two different items in the same column produces the same frame twice. It does accept a list, so a beat genuinely about two columns can light both.
- **Keep map items short, and the budget shrinks as columns grow.** A `columns` pill is derived from the column count, not fixed, so there is no one character figure: at three columns **beside a parked map** a 22 character item was already wide enough to make its column visibly wider than the others and scale the whole board down. **The pill width comes from the column count, not from the free space**, which is why the map beat is only sometimes the roomy case. `panel_columns` computes `max(2.5, min(4.2, (free - 0.7 x (n-1)) / n))`, and 2.5 is a floor the pill cannot go below, so past four columns it stops shrinking and the whole board scales down instead. Measured, in characters that fit:

| columns | on the map beat | beside a parked map |
| --- | --- | --- |
| two | 26 | 17 |
| three | 22 | 15 |
| four or more | 15 | 15 |

So "22 characters has shipped three times" is true of **three** column maps only. At four columns the map beat is exactly as tight as a parked one, which the two four-column maps in the series found the hard way: both cap their items at 16 characters. Thirty characters is the budget for a `points` item beside a parked map, not for a map pill. The layout audit passes an over-wide pill cleanly, so this is one to check on a frame. With a map parked, a `compare` side's items want about twenty-two. There is no measured budget for `bars` labels, `table` cells, a `stack` gloss or a `claim` note, so the layout audit is what tells you. The cheap way to get it is `uv run video/build.py <episode> --skip-tts --quality l`, which renders in a couple of minutes and writes the same `layout_*.json` a full render does. It writes its video to `out/<episode>.preview-l.mp4` and deliberately not to the delivery name, because that name is what `upload_all.py` reads, and a preview reaching it meant publishing a 480p-sourced file with no warning anywhere. Run that before the GPU is booked rather than guessing.

**`panel_stack`****'s pill is a fixed 5.0 units wide**, and so is `panel_flow`'s, at 3.4. Neither is like `panel_columns`, which derives its width from the column count, so the "how much fits" reasoning above is built on derived widths and does not apply to either: layer and step names have to be short, or the whole group scales down to fit them. A flow also carries a one-unit arrow in every gap, so four steps want about eighteen units in the 7.8 free beside a parked map, a scale of 0.43. That is the coloured-blocks failure, not the "marginal" promised above. Beside a parked map, **two** flow steps is the ceiling. Three rendered with the labels at about a third of body size and **no visible arrows at all**, in a frame otherwise two thirds empty, and the layout audit passed it correctly because nothing overlapped and nothing left the frame. Only the silent preview catches it. The arithmetic just above predicts it and was never run for the three-step case: beside a parked map there are about 6.4 free units and three steps want 12.2.

- **No "same structure, twice, with one thing changed".** `compare` gives two free-form positions and `table` gives a grid; neither draws an identical skeleton with one differing part, which is exactly what makes some comparisons land.
- **No translation panel.** Two topics in this knowledge base are explicitly translation tracks (SLURM to Kubernetes, PyTorch to JAX) and the most useful picture either has is "these two names are the same thing in two worlds". A table renders it as data instead.
- **Bars cannot show before and after on one quantity**, so an improvement from 58% to 99.3% draws identically to two different things measured once. They also cannot mark a row as the denominator rather than a measurement.
- **A stat holds one number**, so a result that is really two pushes the second into the small note, where the screen-reference rule then obliges the narration to read something hard to see.
- **A table cannot mark its load-bearing column**, so the narration has to say "read the right hand column".
- **A stack cannot show something running underneath it**, which a lifecycle with machinery under every stage needs.
- **A ****`points`**** heading is always drawn in the subject colour**, whatever the panel's `tone`, so a cost-toned list gets a blue heading over red items.
- **A ****`columns`**** item is a pill and must be a noun phrase, not half a sentence.** Splitting a line across two items puts the punctuation on screen: `["timelines,", "not totals"]` renders a pill reading "timelines," with the comma still attached.

#### Bugs that came from using it at scale

Three defects surfaced only once forty episodes were written against the vocabulary, and all three were silent.

- **Ghost panels.** Every panel that registers labels for `focus` used to leave them behind, so a later `focus` animated a retired mobject, and `Scene.play` re-adds an animation's mobject to the scene. The dead panel came back at 35% opacity and stayed for the rest of the episode.
- **A third comparison side was dropped in silence**, because the sides were zipped against a two-colour tuple. Fixed long ago, and worth reading as a capability rather than a scar: **`compare`**** takes up to four sides**, which is the cheapest way to give a two-reveal beat a third landing, and it was the single most useful lever in one re-cut.
- **A table's blank corner cell slid its whole header one column left.** `panel_table` places cells at absolute x, then arranges the rows with `aligned_edge=LEFT`, which undoes it; an empty `Text` contributes nothing to its row's bounding box, so a comparison table with the natural blank corner put every heading over the wrong data. The layout audit was clean, nothing overlapped and nothing left the frame. The two earlier tables in the series happened to have a non-empty corner, which is why it waited for a third episode to appear. A blank cell in a **body** row is safe and was confirmed so on a frame; it is the header row that moves.
- **A ****`focus`**** label matching nothing** renders a beat where nothing lights up while the narration says to look at part of the map. The structure check now rejects it.
- **A tone can deliver a verdict the page refuses, and a single-tone panel does it too.** Two options drawn as `cost` against `verified` say on screen that one is right and the other is a mistake. The same thing happens on a `points` list, which takes **one** tone for every item: a panel of four costs plus the one approach that works drew the working one in the cost colour, because the tone was chosen for the majority. The fix was to drop the positive item from the panel and say it instead. Where the page takes no such position, neither may the frame: use `machinery` against `verified`, or two neutral tones. The equivalent lesson for bars is about geometry and a check catches it; this one is about colour and no check does. It is found by looking at a frame.
The pattern is worth naming: every one of these produced a correct-looking render, and each was found by somebody writing a new episode rather than by a test.

### Producing many at once

**When other episodes are being made at the same time, put every GPU command through ****`video/tools/gpu.sh`****.** Several episodes are often in flight at once, each in its own agent. The voice model wants the best part of twenty gigabytes, and two renders landing on the same card is a CUDA OOM that throws away an episode's work and does it late, after the script is written and half the takes are done. The wrapper waits for a card with enough free memory, takes a lock on it, and shows the command exactly one device, so `--device cuda` and `--device auto` both do the right thing and nothing has to name a card:

```bash
video/tools/gpu.sh uv run video/build.py <episode>
video/tools/gpu.sh uv run --group tts --group video python video/tts/render.py --script <episode> --only <beat> --force --device cuda
video/tools/gpu.sh uv run --group tts python video/tts/verify.py --script <episode> --device cuda
```

It costs nothing when nothing else is running, so use it every time rather than working out each run whether you are alone.

**Re-render before trusting a timing file you did not just produce.** A published episode's `timing_*.json` was written by whatever `scene.py` existed at the time, and the `still` figures in particular were structurally zero before that measurement was fixed. One re-cut found four beats holding a motionless frame for 12 to 18 seconds while the file on disk said zero; an audit of the series then found one at 30.6 seconds and another at 22.3. A file you did not just write is a record of an older tool, not of the episode.

**Re-run every check immediately before publishing, not after the last edit.** In a batch the tools move: one episode had the focus delay start being modelled after its reserves were fitted, worth about five seconds at the head of four of its nine beats. Refitting confirmed them that time and could as easily have invalidated them after the render was paid for.

**Re-run the tools as well as re-reading the page.** Both move under you in a batch: one episode saw three commits to `check_leads` during its run, and the improved matcher timed nine reveals the earlier one had silently skipped. A tool you ran an hour ago has told you about an hour-old version of your script.

**Re-read the skill after rendering as well as before.** In a batch it moves under you: one author was served the 22:29 copy, the file reached 22:33 before the render and moved again during it, and reading the disk copy afterwards is what caught a pill budget that had just tightened from 22 characters to 15, with three map items already rendered over it. **`check_references`**** needs a card too**, despite being a checking step: it transcribes with word timestamps to find when a phrase is spoken, and `--device` defaults to `cuda`. Run bare while another agent holds a card, it dies with a CUDA out of memory, which is what happened to an author following this page when it listed the check as CPU work. CPU work is the layout audit, `check_structure`, `check_timing`, and anything at `--quality l --skip-tts`.

**Git is shared too**, and the obvious procedure is wrong during a batch. `git pull --rebase` refuses outright with "cannot pull with rebase: You have unstaged changes", and those changes belong to the other agents, so stashing or committing them is not yours to do. The workable order is: **stage only your own path, commit, ****`git fetch`****, push, and reach for a pull only if the push is rejected.** Never `git add -A`, which sweeps up another episode's half-written script. Retry once after a pause if an index lock collides.

**So is the scratchpad**, which is per session and not per agent. One agent's `reserves.py` was overwritten mid-run by another agent writing its own version of the same obvious filename, and it was noticed only because a file-changed notice quoted somebody else's episode name back. **Name every scratch file after your episode.**

One episode end to end leaves both GPUs idle while a single core draws rectangles, because the two stages want different hardware: the voice is GPU work whose model takes most of a minute to load, and the animation is manim on a CPU core.

`video/produce.py` runs them as a pipeline: one persistent voice worker per GPU, each holding the model in memory and taking the next script as soon as it finishes the last, and a pool of animation jobs started the moment an episode's audio lands. A worker asks for work when it is free, so the faster GPU simply does more. Load balancing needs no scheduler.

```bash
uv run python video/produce.py ep_one ep_two ep_three
uv run python video/produce.py --from episodes.txt --gpus 0,1 --cpu-workers 4
```

Two things had to be true before concurrency was safe, and both were found by running three episodes at once rather than by reading the code. Manim writes every piece of text through a temporary SVG keyed by a hash of the text and font and unlinks it after converting, so episodes that share any text delete each other's files: each episode now renders into its own media directory. And the finished animation used to be found by searching the whole media tree for the scene class name and taking the newest, which under concurrency hands one episode's animation to another episode's audio, because nearly every topic overview calls its scene class Overview.

## Tool choice

- **Manim Community Edition** is the default for technical, mathematical and systems explanation.
- General generative-video tools are for supplementary footage only, never the explanation engine.
- Avatar and presenter tools are optional, and are not the default for technical material.
- Video editors are for assembly and polish after the explanatory visuals exist.

## Quality bar

Ship only if all of these hold:

- Sound off, the animation still tells the story.
- Eyes closed, the audio still tells the story.
- No sentence on screen is read aloud verbatim. This does not fight "name what is on screen in the words that are on screen": the card carries a compressed form of the claim and the narration says the full sentence, so they share their key words without being the same string. A `claim` panel whose text is exactly its spoken line is the failure; one that is that line's spine is right.
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

**When the watcher cannot watch.** Several rules here say to decide by ear or by eye, and they are right: the checks are a floor. An agent that cannot play a file should say so rather than claim it watched, and should substitute the closest honest proxies, which are better than nothing and worse than a person: pull a frame per beat and read them, **but not at ****`start + dur - still`**** on a parked beat**, which lands inside the park morph and returns smeared blocks that look exactly like the coloured-blocks failure described elsewhere on this page. One author nearly reported a layout defect that did not exist. The finished board stands still only between `beat - reserve` and `beat - reserve + 2.0`, so take the frame there; read the transcript the voice gate already produced, as text, against the script; and read the per-beat words-per-minute table that `check_timing.py` prints, where anything above about 165 is the pace defect this pipeline keeps producing. The check fails on it now rather than leaving it to be noticed. Report which of these were done and that the video was not actually watched.

### Check that only one person is talking

A beat starts its narration when its animation starts. If the animation is shorter than the line, the next beat begins while the previous line is still playing, and two voices talk over each other. This is invisible to every other check: each clip is correct on its own, each clip verifies, the animation is right, and the video is unlistenable. One episode shipped with twenty five seconds of it.

So compare the beat log against the clip lengths, mechanically, on every render. For each beat in order, its start time must be at or after the end of the one before. The same pass should flag two neighbouring failures with the same cause:

- **A silent gap** longer than a few seconds, which means a beat animates for far longer than it speaks.
- **A still frame** held for more than about six seconds, which means a beat ran out of things to show and left a card on screen while somebody talked over it. That is usually the real defect, and the overlap was only how it announced itself.
  This check spent four episodes unable to fire. `still` was measured as the residual wait at the top of the next beat, and every beat ends in `hold()`, which consumes exactly that residual, so the answer was structurally always zero and the field came out null on all forty two beats ever logged. It is measured from the last thing that **moved** to the end of the beat now, and the final beat is scored too, which it never was. The first run of the fixed check found an eighteen second hold on a published episode. **A check nobody has seen fail is not a check**, and this one was sitting inside the section that says so: if a rule here has never once rejected anything, go and find out whether it can.

  **The closing beat is where this always bites.** Measured across the first four overviews, every single one ends on a motionless card: 14.9, 18.0, 18.1 and 30.6 seconds of a take sitting still while the narrator delivers the conclusion over it. The pattern is the same each time, because a take draws its claim in one move and then has nothing left to do with half a minute of speech. Give the closing beat something that unfolds with the line, and give it **enough** pieces. Two or three parts over a forty second take is not movement. Reach for six or seven, which is a head plus its points rather than a single claim, and keep the reserve small. Drawing one card and holding it is the default, and the default is the defect.

The fix for all three is the same: give the beat more to show, or split the line across the beats that follow it. Never fix it by cutting the narration short.

### Check the script has the shape its format requires

Run this before rendering anything, because it is the only check that looks at the script rather than at the finished video.

Every other check here inspects what came out: the layout, the timing, what the narration actually said. None of them notices a **missing beat**, because a video with no contract and no objection renders perfectly, sounds fine, and is simply worse in a way only somebody who knows the format can see. A beat went missing twice, and both times for the same reason: writing a new episode from a blank file and forgetting a step that has no visual consequence.

So declare the format in the script and check its required beats mechanically. What is actually required differs by format, and the check is the authority rather than this page: a news edition needs only an opening and a take; an overview adds a question; a deep dive adds a contract, an objection and a resources card. Writing a beat to satisfy a checker that was never going to ask for it is wasted work, so read `REQUIRED` in `check_structure.py` if in doubt. Two rules the check also carries:

- **A contract is required above about three minutes**, measured on the rendered narration rather than on a word-count estimate, because the rule turns on a few seconds either way.
- **A beat under about twenty five words is flagged**, because a short fragment is the least stable input the voice model gets, which is a rule this page already states and nobody remembers while writing.
Two exceptions worth stating, both discovered by the check firing on work that was actually fine:

- **An overview needs no separate contract beat.** Building the whole map on screen before explaining any of it is the contract, and a stronger one than a list of steps, because the viewer can see the entire scope rather than being told about it.
- **A contract can be a clause inside the opening** rather than a beat of its own ("two stories, and by the end they turn out to be the same story"). When it is, say so in the script rather than letting a checker guess.

### Check the layout as geometry

At the end of every beat, before the next line starts, walk every piece of text on screen and flag two things: anything whose bounding box leaves the frame, and any two pieces of text whose boxes overlap by more than about a quarter of the smaller one. Both are ordinary consequences of placing a label next to something (it inherits that thing's alignment) or of sizing a block for an empty frame when something is already parked at the side.

This is cheap, it runs inside the render, and it replaces several rounds of pulling frames and squinting. Still pull frames, but to judge whether the thing reads, not to hunt for collisions.

`video/out/audio/<episode>/verification.json` carries what the transcriber heard against what the script said, per beat. It is the only way to read the narration back as text, which matters when nobody can listen to it.

**And know which defects the frames are now for.** The three this step used to name, text off the frame, labels on each other, a diagram taller than the screen, are exactly what the audit catches automatically. One episode reported zero layout issues with five real defects on screen, and every one was of a kind only a person sees: a panel line the narration had stopped saying, a card read aloud word for word, a trailing comma stranded inside a pill, a list toned as a cost where half its lines were neutral facts, and the date printed twice because the title carried it and the corner strip appended it again. Those are what to look for.

One warning learned immediately: a check nobody has seen fail is not a check. The first version of this one silently passed everything, because a text object in manim holds no points of its own and the filter that was supposed to skip empty objects skipped all of them. Test a new check against a defect you have deliberately created before believing a clean report from it.

**Know what this check cannot see.** It finds collisions, not the absence of space. A table whose cells were arranged rather than placed in measured columns rendered as "Kimi K32.8T104B", and the audit passed it correctly, because nothing overlapped anything. So a frame of every panel kind still has to be looked at once, and that is what the silent preview is for. Two layout rules that came out of the same look: a parked map must clear the page name and date the title card leaves in the top corner, or it sits on them for the rest of the episode, and a centred panel must be fitted to the frame that is left after the map is parked rather than to the whole frame.

### Check the screen references

The rule that narration points at the visuals creates its own failure: a line that says "the number on the screen" when the screen holds no number, or "look at the loop" before the loop is drawn. Nothing else catches it. The animation renders, the audio verifies, and the video is still lying to the viewer.

**Most of what it reports is ordinary English.** `these` and `here` used non-deictically account for nearly all the noise: "some of these converged", "here is the question", "Diffusion survives here in music". One episode's seven hits were all of that kind and not one was a pointer. A clean-looking list of seven is not seven real references, so read them rather than counting them.

**The check knows its phrase list and nothing else.** **It reads the delivery render, so it runs last, **and it has to run again after any text change**. One episode's only real catch appeared on its third full build and would have been invisible to anyone who stopped at ****`check_timing`****.** After a `--quality l` pass it reports no render at all, because that writes to 480p15, which used to read as "you never rendered" while `out/<episode>.mp4` sat there. The message now names what it found. It matches the phrasings it was built with, so a deliberate pointer written another way, "lit on the map", "the last line", "Read it across", is invisible to it, and an episode can report zero references while containing a real one. The genuine failure in one episode, a beat saying "the last line is why you cannot mix them" about a table row drawn six seconds later, was found by doing the reveal arithmetic by hand. It earns its keep anyway: on the same episode it caught a map opening "Here is the whole board" over an empty frame. Treat it as a floor and compute a pointer's timing yourself.

So check it mechanically, every time. Transcribe the narration with word-level timestamps, find every phrase that promises something is visible (on the screen, look at, watch, this chart, the axis, coming up, underneath, these), work out the exact moment it is spoken in the finished video, and pull that frame. Then look at each frame and confirm the thing the line names is actually in it.

When a reference fails there are two fixes and the visual one is usually better: put the thing on screen rather than removing the line. A card that said "four minutes to twelve hours, in two years" while the narration said "the number on the screen" was fixed by writing the figures as figures, `4 minutes to 12 hours`, which also made the card scannable.

The same pass catches two other things worth looking for while the frames are in front of you: anything on screen the narration never refers to, and any beat whose frame is identical at its start and its end, which means nothing happened for the length of a spoken line.

### Check every take against what it was meant to say

The transcription gate described under the voice. Every clip, every render, no exceptions, and measured honestly in both directions.

Two more false alarms, both on takes that were read correctly, both from the burst detector rather than from the error rate:

- **A transcriber renders a spoken figure its own way.** "Seventeen hundred" comes back as "one thousand, seven hundred". Every one of those words is then absent from the script, so three in a row look invented. Number words are a closed class: treat them as always known.
- **A transcriber splits a compound the script contains.** "Subagents" comes back as "sub agents", and neither half is in the script. Any piece of a word the script contains counts as known.
After changing a gate, re-test it against the defect it was built for. This one still catches "actually not just about a model, at the author cases", which is the only reason the change was safe to make.

### Audio belongs to the words it was rendered from

A beat is re-rendered when its words change, not only when its file is missing. An episode gets rewritten, the beat keys stay the same, and skipping on "the wav exists" then keeps the old take under the new line. Every check downstream passes it: the clip is clean, it verifies against nothing, and the episode says something the script does not. The renderer stores a fingerprint of each beat's text beside the durations, and `produce.py --fresh` clears an episode's audio outright when it has been rewritten wholesale.

**A partial re-render does not refresh the verification file.** `render.py --only <beat> --force` writes the new audio and prints its own error rate, but `verification.json` still holds the previous transcript until `tts/verify.py` runs again. **`--only`**** takes several beat keys at once**, so three beats re-render on one model load rather than three; the cost model of four takes a beat is about seeds, not about loads.

Two artefacts the rest of this page leans on, since neither says what is in it: `out/timing_<episode>.json` is a **list** of `{key, start, dur, still}` in beat order, and `verification.json` is a **list** of objects, each carrying `key`, `said`, `heard`, `cer`, `no_speech` and `invented`. It is not a map, and the obvious `for k, d in v.items()` returns nothing at all, silently. `said` against `heard` is the pair to diff when reading transcripts. Read the file after a targeted fix and you will conclude the fix failed while the renderer is telling you it worked. Re-run the verifier before reading it, every time.

### Checking the script before the GPU is booked

`check_structure.py` reads `VISUALS` as well as `SCRIPT`, because a beat with narration and no visual renders as a blank frame with a voice over it, and nothing else notices: the audio verifies, the layout audit finds nothing to collide with, the timing is right. It also catches a visual key that matches no beat, a panel missing the field it needs to draw anything, a bar without a numeric value, and a second beat trying to park, which would replace the home frame and strand the first panel on screen forever.

### Reviewing a batch

One episode gets watched. Forty do not, and pretending otherwise is how a batch ships with a defect every individual check would have caught. `video/tools/review.py` runs structure, layout, timing, voice and delivery across a list of episodes, ranks them worst first, and pulls a frame per beat with `--frames`. It reports what it cannot see, which is most of what matters: pace, whether a story lands, whether the take is worth hearing.

One more lesson from retiring a bespoke scene: a register you have to remember to update is a register somebody forgets, in both directions. `build.py` now falls through to discovery when a registered scene file no longer exists, because an episode re-authored declaratively otherwise fails with "file not found" after its voice has already rendered.

### Then watch it

The checks are a floor, not a ceiling. They cannot tell you that a story did not land, that the take is obvious, that the second voice is decorative this week, or that the pace is wrong. Watch it once with the sound off and once with your eyes closed, which is what the quality bar asks, and then once properly.

### The rest

If making the video reveals a clearer explanation or a factual correction, update the written page first, so the knowledge base stays authoritative. Confirm the finished video is linked from the canonical page, that no empty video sections were created elsewhere, and that the change is recorded in Updates.
