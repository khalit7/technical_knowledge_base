"""
Narration for "Tech news, week to 21 September 2026".

Source: the canonical Notion page "2026-09-21: tech news". Every figure below
comes from that page; nothing is invented for narrative shape.

Written with the five-step method the knowledge base skill "Explainer video
style and voice" prescribes, which is Google's published NotebookLM order:

  1. outline
  2. revise the outline
  3. write the detailed script, sterile
  4. critique it and fix what the critique found
  5. last, and only last, add the breaths and the false starts

The outline that survived step 2:

    tension     two agent systems proved theorems this month, fifty times apart
                in cost
    question    when the machines do the work, what actually limits them
    contract    start from the numbers everyone is quoting, then go one layer
                down to why the cheap run was cheap
    ground      the task-horizon series, because it is the number everyone has
                already seen
    walk        leverage is real -> but capability was not the binding
                constraint -> the GLM serving story says the constraint was
                feedback -> which explains the proof cost gap -> so the field
                is now optimising the loop, not the model
    objection   this is vendors marking their own homework
    take        the constraint moved from capability to verification
    coda        the rest of the week in thirty seconds

What the step-4 critique caught, and what changed:

  - The first draft opened on the Anthropic percentages. They are the most
    quoted numbers of the week and therefore the least interesting thing to
    open on. Moved to beat 5, behind the cost gap, which nobody has seen.
  - The Lean proofs were two separate stories in draft one. They are one story:
    the same class of result at fifty times the cost, and the difference is how
    much verified structure each one started from. Merged.
  - Draft one let "recursive self-improvement" stand unexamined. The GLM post
    explicitly denies having reached it, and that denial is the honest spine of
    the episode. Promoted.
  - Two numbers were doing no work (the 166-page paper, the 97 languages) and
    were cut rather than shrunk.
  - Speaker B was agreeing. B now interrupts three times and is right each time.

Speakers:
  A  narrator, owns the spine and the visuals
  B  the listener, asks what the viewer is thinking, never chats

Numbers are spelled the way they should be said, because text to speech reads
"3.22x" and "Z.ai" badly.
"""

A = "A"
B = "B"

FORMAT = "news"

SCRIPT: dict[str, list[tuple[str, str]]] = {
    # 1. tension
    "cold_open": [
        (A, "Two different agent systems produced formally verified mathematics this month. "
            "Real proofs, checked by machine, not press releases."),
        (A, "One of them spent about six billion output tokens. "
            "The other spent about three hundred billion."),
        (A, "Same category of result. Fifty times the bill."),
    ],

    # 2. the sharp question
    "question": [
        (A, "So that is the question worth eight minutes of your time. "
            "When the machines are doing the work, what is actually limiting them?"),
        (B, "Because it is obviously not how clever the model is. "
            "Both of those runs worked."),
    ],

    # 3. the contract
    "contract": [
        (A, "Right. So we are going to start with the numbers everyone quoted this week, "
            "and then go one layer underneath them, to why the cheap run was cheap. "
            "It gets more technical as it goes."),
    ],

    # 4. common ground: the task horizon
    "horizon": [
        (A, "Start where you already are. Task horizon. "
            "How long a job a model can finish on its own, start to finish."),
        (A, "March, twenty twenty four. Opus three. About four minutes."),
        (A, "March, twenty twenty five. Sonnet three point seven. Ninety minutes."),
        (A, "March this year. Opus four point six. Twelve hours."),
        (A, "And the projection for next year is work that would take a person weeks."),
    ],
    "horizon_caveat": [
        (B, "And I want to stop you on that chart, because the axis is logarithmic. "
            "Every step up is much bigger than it looks."),
        (B, "Also, Anthropic measured Anthropic."),
        (A, "Both true. Hold onto the second one, it comes back at the end."),
    ],

    # 5. leverage is real
    "leverage": [
        (A, "The leverage numbers around it are genuinely striking, though. "
            "More than eighty percent of the code merged into Anthropic's own production "
            "codebase was written by Claude, as of May."),
        (A, "The model now leads twenty six percent of their artificial intelligence research work, "
            "with more than thirty thousand internal agents running at any one time."),
        (A, "Their continuous integration workload grew twenty five fold in six months. "
            "The test suite grew ten fold just to keep up with it."),
        (B, "That last one is the tell, isn't it. "
            "The verification bill grew faster than anything else."),
    ],

    # 6. the pivot
    "pivot": [
        (A, "That is the turn this whole episode is built on. "
            "The expensive part stopped being the thinking, and became the checking."),
        (A, "And the clearest evidence for it came from a serving stack, of all places."),
    ],

    # 7. the GLM story
    "glm": [
        (A, "Zed dot A I published a post about how G L M five point three built the "
            "inference infrastructure that now serves it, on more than a hundred thousand "
            "Chinese accelerators."),
        (A, "Thirteen days from start to production. Three point two two times the "
            "throughput they began with."),
        (B, "And they are careful to say this is not recursive self improvement."),
        (A, "They are, and that is exactly why the post is worth reading. "
            "Humans kept the objectives and the boundaries. "
            "What changed was the environment the model worked inside."),
    ],
    "feedback": [
        (A, "Their claim is that the bottleneck was never the model. It was the feedback."),
        (A, "So they replaced one sparse signal, the test failed, "
            "with three kinds of local, verifiable feedback."),
        (A, "Correctness, by comparing numerical results across different execution paths."),
        (A, "System behaviour, by looking at timelines instead of totals."),
        (A, "And performance, by layered testing that shows which constraint is actually binding."),
    ],
    "bugs": [
        (A, "And you can see what that buys, because two bugs fell out of it "
            "that an end to end metric would never have produced."),
        (A, "A T F thirty two precision bug that was only visible under one particular "
            "parallelism strategy. Caught by comparing execution paths against each other."),
        (A, "And a twenty percent slowdown that turned out to be the Python global "
            "interpreter lock, blocking the key value cache transfer from overlapping."),
        (B, "Neither of which shows up as anything except, it's a bit slow."),
        (A, "Exactly. The model could not have fixed either one, because nothing told it they existed."),
    ],

    # 8. back to the proofs
    "proofs": [
        (A, "Now take that back to the two proofs, because the gap stops being mysterious."),
        (A, "Anthropic's run worked alone for eleven days, about six billion output tokens, "
            "and it built on Kevin Buzzard's formalisation effort at Imperial. "
            "It was standing on verified ground and adding to it."),
        (A, "OpenAI's run grew to ten thousand concurrent agents, exchanged four point nine "
            "million messages, and burned roughly three hundred billion output tokens, "
            "for an estimated two to twenty two and a half million dollars."),
        (B, "Which is a real result. Navier Stokes blow up, verified in Lean. "
            "That is not nothing."),
        (A, "It is not nothing at all. But the cheaper run had more of its verification "
            "already built. That is most of the difference, and it is a design choice, "
            "not a capability difference."),
    ],

    # 9. the field noticed
    "loop": [
        (A, "And the rest of the week says the field has worked this out too, "
            "because three separate papers went after the loop rather than the model."),
        (A, "N Vidia's Sol Pi found that roughly half of an agent's token traffic is "
            "harness inefficiency. Not thinking. Overhead. "
            "They cut about forty five percent of the tokens at the same task success rate."),
        (A, "Agora threw away the planner entirely and used Git as shared memory. "
            "Thirteen workers, twelve days, seventeen hundred contributions, "
            "and a hundred and sixty five independent reproductions with zero failures."),
        (B, "Reproducible is the word I would underline there."),
    ],

    # 10. the counterweight
    "counterweight": [
        (A, "So, the counterweight, because it landed the same week and it is the more "
            "important result."),
        (A, "Emergence World stress tested long horizon multi agent systems under attack. "
            "Eight worlds, ten agents each, sixteen days, eight hundred and fifty thousand "
            "model calls, fifty billion tokens."),
        (A, "None of the systems was resilient. And the finding that should worry you is not "
            "that they were fooled."),
        (A, "It is that detection did not ensure containment. "
            "Systems recognised adversarial content, and then went on interacting with it, "
            "in some cases for another forty six hours."),
        (B, "So the system knew, and carried on anyway."),
        (A, "The system knew, and nothing in the loop was wired to act on knowing."),
    ],
    "nous": [
        (A, "You can see the same shape in a friendlier setting. "
            "Nous Research pointed one thousand three hundred and ninety three subagents "
            "at a million line Python repository for about nineteen active hours, "
            "and cut a third of the non test source for around nineteen thousand dollars."),
        (A, "The tests passed. Human reviewers then found removed public interfaces "
            "and changed exception handling that the tests had happily approved."),
    ],

    # 11. the objection
    "objection": [
        (B, "Okay, but I have to say the obvious thing. Almost every number in this episode "
            "comes from the company that benefits from it."),
        (A, "That is fair, and it is the right instinct. Although notice which numbers survive it. "
            "The G L M bugs and the Nous review findings both come with a mechanism attached, "
            "so you can check the reasoning even if you cannot check the run."),
        (A, "And there is a paper this week that makes the point harder than I can. "
            "Experts re-graded six popular physics benchmarks, and most of the failures "
            "everyone had been reporting turned out to be the test's fault. "
            "Wrong answer keys. Ambiguous questions. Grader bugs."),
        (B, "So the measurement was the broken part."),
        (A, "The measurement was the broken part."),
    ],

    # 12. the take
    "take": [
        (A, "So here is what I think this week actually says."),
        (A, "The constraint moved. It used to sit on capability, and it now sits on "
            "verification, on the feedback you can give a system about work you did not watch it do."),
        (A, "Which means the useful question about your own stack is not "
            "which model, it is what does this thing find out when it is wrong, and how soon."),
        (A, "And the number I would like to see next is a task horizon figure "
            "verified by somebody other than the lab that produced it."),
    ],

    # 13. coda
    "coda": [
        (A, "Quickly, the rest of the week."),
        (A, "Vera Rubin N V L seventy two posted up to seven times the token throughput "
            "per megawatt of G B three hundred, on replayed agent traffic, "
            "though that is pre release software."),
        (A, "N Vidia shipped GPU programming in Rust, in two tracks. "
            "The tile track is already in production. The lower level one is early alpha."),
        (A, "Bonsai two, a twenty seven billion parameter model squeezed to one point seven six "
            "bits per weight, five point nine gigabytes, keeping ninety eight percent of its scores."),
        (A, "And Claude Code now reads an agents markdown file, which quietly ends "
            "a year long argument about agent configuration."),
    ],
    "outro": [
        (A, "The written issue has all of it, with the sources. "
            "This was just the part I could not stop thinking about."),
    ],
}


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    turns = sum(len(t) for t in SCRIPT.values())
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {turns} turns ({b_turns} for B), {words} words")
    print(f"about {words / 145:.1f} minutes at 145 words per minute")
