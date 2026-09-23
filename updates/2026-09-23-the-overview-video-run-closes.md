# 2026-09-23: the overview video run closes

The close of the video run. Every Topic overview and the 2026-09-21 tech news issue now carries a published video at the top of its page, twenty three in all, and the run's last defects are fixed in the tooling rather than in any episode.

**[update] Seventeen published videos were re-cut for timing, and every one of the twenty three now passes an audit against real word timestamps.** The earlier checks timed a reveal against the even-pace estimate of when its label is spoken; timed from the voice itself, the worst lead was 14.5 seconds on the news issue and six leads on swe-and-system-design. After the re-cuts no episode has a lead of 5 seconds or more, or five leads, which was the bar for a re-cut. Twelve have none over 3 seconds; the worst remaining is 4.8 seconds on jax-and-tpu, and rl and pytorch-ecosystem carry four small ones each, all accepted. In every re-cut only the visuals moved; the spoken audio is byte-identical in all but two, which re-voiced one sentence each.

#### Production notes

**The map lights each row once.** A focus beat faded its parked map once per registered name, so a four by four map spent five seconds lighting before anything was drawn, and focusing on an item's name lit its row and then dimmed it again. It now fades each row once. The published cuts still carry the old cost, which the leads check models behind a flag.

**The leads check times a label from the audio by alignment.** It finds the label in the script and aligns script words to transcript words, instead of searching the transcript for it. Searching failed both ways: a garbled first mention matched a later one and hid a lead, and a long pause threw the fallback estimate early and invented one. The last version also maps a spelled-out name such as "F S D P one" onto the single token the transcriber heard.

**The uploader publishes a news issue.** It used to skip one silently and report nothing uploaded. It also prints an overview's index for the commit title, and one command now runs every pre-publish check.

**Every agent's report was folded into the video skill.** Each episode was made by a fresh agent given only the skill and the page, as a cold reading of the procedure, and each reported where the skill was missing, ambiguous or wrong. The pages inside Topic: llms were out of scope and have no videos.
