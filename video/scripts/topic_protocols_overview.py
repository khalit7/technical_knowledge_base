"""
Topic overview: protocols, as of 22 September 2026.

Source: the canonical Notion page "Topic: protocols", id 3c65c17b-0d0d-81ec-
9355-f4eecd6eed02, fetched from the Notion API rather than from the repo
mirror on 22 September 2026 (page_last_edited_at 2026-09-22T02:13Z). The two
agreed block for block, which is worth recording because the method says to
assume they might not. Nothing here comes from the ten deep dives underneath
the page: every figure, name and date below is in the summary itself.

Which kind of overview this is. A mental model rather than a comparison, and
the distinction decides the whole episode. These are not competitors doing the
same job differently; they are layers, and the only reason they are on one
page is that all of them are running underneath the same service at the same
time. "REST against gRPC against GraphQL" is a comparison video, and a much
smaller one than the page deserves.

The axis, which is most of the work of a new overview. The page's own taxonomy
diagram has six groups hanging off the root: foundations, secure transport and
access, transport and web, RPC and APIs, AI-agent protocols, and auth. That is
the axis, and it is the page's rather than this episode's. The alternative
axis, a tour of the ten deep dives in the order the "Deep dives" list gives
them, is a table of contents read aloud and is the same material in a worse
order.

The cut cleared in 74326b3 found the same axis and it is kept, because it
belongs to the page. Read it before outlining, as the method says. Five things
from that cut are not kept:

  - It ran twelve beats and 1,102 words, which at the measured 0.40 seconds a
    word is 7 minutes 21, past the rung where the encode gives up 1080p. This
    is twelve beats and about 960 words.
  - Its map narrated the stack bottom to top while `panel_stack` reveals its
    layers in list order, which is top to bottom. Every layer would have been
    named in the opposite order to the one it was drawn in, and the third
    reveal from the top would have arrived while the narration was on the
    fourth from the bottom. This one narrates the map downwards, with the
    stack drawn the only way a stack can be drawn, and then turns round
    explicitly to climb it.
  - Not one of its beats carried a `reserve`, so every panel finished drawing
    at the very end of its budget and every closing claim sat motionless.
  - Its `mcp` beat was a `compare` carrying 119 words. A `compare` has exactly
    two reveals and is a 25-second panel; 119 words is 48 seconds, so the
    right-hand side would have been named 30 seconds after the left and then
    held still. It is a five-reveal `points` beat here.
  - Its map glossed transport as "TCP, UDP, QUIC, DNS" and then spoke QUIC as
    a word, so the panel item could match the narration neither on a word nor
    on a contiguous squashed run. QUIC is named in the `http` beat instead,
    where it is the thing HTTP/3 moves onto.

What the critique step changed:

  - Draft one gave HTTP its three versions and then gave SSE against
    WebSockets a beat of its own with the RFC 6455 wire format in it. That is
    the deep dive's job. The streaming beat shrank to the one axis that
    actually decides the choice, who is allowed to talk, and the framing,
    timeouts and close codes went back to the page.
  - Draft one's `tls` beat coloured client traffic `verified` and origins
    `cost`. Two tones on one comparison deliver a verdict, and the page does
    not say that a lagging origin is a mistake, only that it is behind. Both
    bars are `number` now and the narration carries the asymmetry.
  - Draft one attributed the "credentials outside the cell, approvals outside
    the chat" pattern to Meta's Muse Spark 1.3. The page itself flags that one
    as "described only in The Batch of 18 September with no primary source
    resolved", and naming it on screen would give it more weight than the page
    does. The page states both patterns generalise, so the beat states them as
    the general answer and names nobody.
  - Draft one's take was a five-line "which layer to suspect" diagnostic list.
    That is the shape the maths overview closes on and it would have read as a
    house tic; worse, it is a recap wearing a diagnosis's clothes. The take is
    the page's own movement now: the bottom of the stack is close to solved,
    the top is not two years old and is already driving microscopes, and the
    thing that breaks changed kind.
  - B narrated in draft one. B has three turns and each is the question the
    viewer is forming: "which of these do I have to know" at the hinge, and
    "what went wrong in the other twenty six" at the number.

What was cut, so the next person can see the second episode rather than
rediscover it:

  - A2A in any depth. The Agent Card at a well-known URL, the explicit task
    lifecycle (submitted, working, input-required, completed, failed), the
    Linux Foundation move and the consolidation of IBM's ACP and Cisco-led
    AGNTCY into it. A2A gets one clause beside MCP here, which is agent to
    agent rather than agent to tool. The alphabet soup and its consolidation
    is a genuine second episode and it is a news story, not a map beat.
  - Google Home MCP, the first consumer-device MCP surface, September 2026.
    The same trust-boundary point as MHS on a different surface, and the take
    only has room to make that point once.
  - The whole "Which to reach for when" table, fifteen rows of situation and
    answer. It is the most useful thing on the page for somebody at a desk and
    the least sayable thing on it: fifteen rows do not become a beat by being
    read faster.
  - RoCEv2, MTU and PMTUD blackholes, TIME_WAIT, the apex CNAME problem, the
    October 2026 root KSK rollover, OCSP retirement, CT and CAA, SSH
    certificates and ProxyJump, webhooks and HMAC signature verification,
    HTTP/2's HPACK, protobuf's numbered fields, OIDC's ID token, IAM with
    SigV4. Every one of these is named on the page and none survives a six
    minute map. SSH in particular loses out: it is half of its own layer here
    and is named on the map and nowhere else.

Reveal arithmetic, which set the length. `spread` puts reveal k of n at
(k-1)/(n-1) x (beat_length - reserve), so a panel with n reveals wants its
line written as n segments: the first n-1 sharing the span up to the last
reveal, and the last one short enough to fit inside the reserve. Every beat
below records the segments it was written to. The one that shaped the episode
is the map: six layers is six reveals, which is a fifty-five second beat at
ten seconds a reveal, and that is a sixth of the whole budget spent before
anything is explained. It is worth it here, because a stack is the one map
whose shape IS the argument.

Lit state of the map, decided for every beat rather than inherited by
accident. `map` builds all six layers in one tone. `question` passes no focus
and inherits that, which is right: the hinge is about the whole board.
`transport`, `tls`, `http`, `rpc`, `mcp` and `auth` each light their own
layer. `streams` passes none and inherits "HTTP and streams" deliberately: it
is the same layer of the map and the same paragraph of the page, and a
redundant focus redraws an identical frame at a cost of about a second of
panel delay. `paper2agent` inherits "agent protocols" for the same reason.
`close` lights all six, which is how this vocabulary says no emphasis and is
also the true statement about a beat whose subject is the whole stack.

Tone. `panel_stack` takes one tone for every layer, so the map cannot colour
its six layers differently the way a `columns` map can. That is a limitation
and it is also the right answer here: there is no mistake on this map and no
layer anybody chose, so a colour saying otherwise would be a verdict the page
refuses. Everything is `subject` except the two beats where the page itself
takes a position: `transport` is `cost`, because that beat is four failure
modes, and nothing else is.

No contract beat, deliberately: an overview's contract is the map built whole
before anything is explained, and `check_structure` exempts the format.

Voice. All twelve beats passed the character gate on the first render, at
errors between 0.000 and 0.021, and reading the transcripts as text caught
four real defects none of the gates can see. Every one is a class the method
already names:

  - A bare numeral opening a sentence. "Three moves onto Quick. Loss is
    recovered per stream." came back as "Every moves onto quick losses
    recovered per stream." at a character error of 0.017, which destroys the
    sentence. It is "And three moves onto Quick, which recovers loss per
    stream" now: the numeral sits mid-sentence and the passive fragment is a
    relative clause.
  - A name that fails in one beat and not another. "Which is why auth stopped
    being somebody else's problem" came back as "Which is why OTH stopped
    being". The same word is read correctly in the map beat, so it is the
    position rather than the word, exactly as the method says. It is "And that
    is why the auth layer stopped being" now.
  - A name broken across an appositive. "Stanford's Paper two Agent, in
    Nature, turns" came back as "Stanford's paper 2, Agent in Nature, turns",
    so the product name split in half and took the journal with it. Nature has
    its own clause and its own verb now.
  - An invented sentence opener. "Not the protocol, and not the model. The
    knowledge needed to run the code..." grew a "No," out of nothing at the
    sentence boundary, at 0.018. The next sentence has a stronger subject now
    and the insertion is gone.

Pace cost two more rerolls, both of them the punctuation fix and neither
cutting a word: `ident` came back at 167 words a minute and `question` at 163,
which is under the 165 that fails but above the 158 that wants fixing. Split
into more turns, they read at 145 and 144. `render.py` emits one conversation
item per turn, so the boundaries do the work.

What `check_leads` found, and it was a real defect the reserve could not fix.
`rpc` named REST 3.5 seconds and gRPC 5.5 seconds before their rows are drawn.
A table's reveal count is fixed by the data, so the only lever is the reserve,
and the reserve that would draw gRPC where it is named is 13.7 seconds against
a still-frame ceiling near 5.5. So the words moved instead: the turns were
20 / 23 / 40 / 15 words and are 31 / 30 / 34 / 15 now, which is the shape the
arithmetic asks for, three equal segments and a tail inside the reserve. It
cost twelve words and seven seconds of episode and every lead is now under
1.6 seconds. Nothing is accepted: every reveal is named at or after the moment
it is drawn.

Reserves were fitted to the rendered durations rather than guessed, solving
for the R that puts reveal k of n, at (k-1)/(n-1) x (L - R), about a second
before the segment naming it begins. `map` is the exception the method
records: the fit wanted 5.65, which is fine, but the floor would have bound
anyway, since a parked beat spends 2.0 seconds of settle and 0.7 of morph out
of the front of its reserve. At 5.5 the finished board stands still for 3.18
seconds, which is the format's premise being met rather than asserted.

Length. 7 minutes 17.7 at 1080p and 4.63 MiB, on the third and last 1080p rung
of the encode ladder. That is past the seven minute clock and inside the
profile the clock exists to protect, and the method arbitrates that case
explicitly: the delivered profile governs. It is still the longest episode in
this series and the reason is structural rather than slack. Six layers is six
map reveals, which is a 48 second beat before anything is explained, and then
six tour beats, one per layer, because a layer named on the map and never
visited is a hole the viewer can see. A future cut wanting margin should drop
`tls` and say so: post-quantum deployment percentages are a state-of-the-world
fact rather than a failure mode you would suspect, which is what the rest of
the episode is about. Every still frame is between 2.5 and 5.88 seconds.

Speakers:
  A  narrator, owns the spine and the visuals
  B  the listener, asks what the viewer is thinking, never chats
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: protocols"
SUBTITLE = "the stack under every LLM service"
UPDATED = "22 September 2026"

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is, what it is, why it earns the time, how current ---------
SCRIPT["ident"] = [
    (A, "This is the map of protocols an artificial intelligence engineer "
        "actually touches."),
    (A, "It runs from how bytes move on a wire, up to how agents talk to "
        "each other."),
    (A, "It earns the time because these are not options you choose between. "
        "They are stacked."),
    (A, "All six already run under your service."),
    (A, "Current as of the twenty second of September, twenty twenty six."),
]

# --- the inventory, named before anything is explained --------------------
# Six layers, six reveals, narrated top to bottom because that is the order
# `panel_stack` draws them in. Six roughly equal segments of about seventeen
# words, the last landing inside the reserve.
#
# The orphan check shapes the wording. A panel line passes if it shares one
# significant word with the beat's narration, or if its squashed spelling
# appears as a contiguous run inside the squashed narration. Single letters
# are dropped from the word set, so an acronym gloss passes only on the
# contiguous run: "M C P and A two A", "O Auth, O I D C, J W Ts" and "REST,
# G R P C, Graph Q L" are said with nothing between the names for exactly
# that reason, and one intruding word would orphan the line.
SCRIPT["map"] = [
    (A, "Whole board first, nothing explained yet. At the top, the newest "
        "layer, agent protocols. M C P and A two A."),
    (A, "Under it, auth, which decides who may ask for anything. O Auth, "
        "O I D C, J W Ts."),
    (A, "Then R P C and A P Is, how services call each other. REST, "
        "G R P C, Graph Q L."),
    (A, "Then H T T P and streams. H T T P, S S E, WebSockets."),
    (A, "Then T L S and P K I, which proves who you are talking to. "
        "Handshake, certs, S S H."),
    (A, "And at the base, transport. T C P, U D P, D N S."),
]

# --- the organising question ----------------------------------------------
# A `claim` has exactly two reveals, so the note lands at beat_length minus
# reserve and the sentence it paraphrases has to be the last thing said.
SCRIPT["question"] = [
    (B, "Six layers. Which of them do I actually have to know?"),
    (A, "All of them, a little."),
    (A, "Which is why the question on the card is not which protocol to "
        "choose. It is which layer to suspect when something breaks."),
    (A, "Because you are running all six already. Chosen or not."),
]

# --- the base, read as failure modes --------------------------------------
# Head plus three rows, four reveals, four segments. The last names D N S
# inside the reserve.
SCRIPT["transport"] = [
    (A, "So start at the base, and read this layer as failure modes rather "
        "than a specification."),
    (A, "Throughput is window over round trip time, so one stream cannot "
        "fill a long fat pipe. It caps near five gigabits a second."),
    (A, "Which makes a hundred and forty gigabyte checkpoint a concurrency "
        "problem, not a bandwidth one. N Vidia's collective communications "
        "library opens sixteen sockets per peer for that reason."),
    (A, "And D N S breaks in ways that look like everything else. N dots "
        "amplification. Negative caching."),
]

# --- the layer being rebuilt underneath you -------------------------------
# A `bars` head plus two bars is three reveals, so two long segments and a
# short tail. Both bars are `number`: the page reports an asymmetry, not a
# verdict, and two tones on one comparison would say on screen that one of
# them is a mistake.
SCRIPT["tls"] = [
    (A, "One layer up, and this one is being rebuilt underneath you right "
        "now, quietly. Post quantum hybrid key exchange runs a classical "
        "elliptic curve exchange beside a lattice based one, and mixes both "
        "secrets."),
    (A, "It is not a proposal, it is deployed, and unevenly. Client traffic "
        "is already past sixty percent, because browsers shipped it and "
        "update themselves. Certificate lifetimes are falling too, to forty "
        "seven days by twenty twenty nine."),
    (A, "Origins are about ten percent. Somebody has to upgrade a server."),
]

# --- http: one bug, fixed twice -------------------------------------------
# A `flow` head plus three steps is four reveals. Three flow steps is the
# ceiling beside a parked map, because `panel_flow`'s pill is a fixed 3.4
# units and every gap carries a one-unit arrow, so the labels are kept to the
# version number and nothing else. QUIC is said the way it is pronounced.
SCRIPT["http"] = [
    (A, "Now H T T P, and the honest way to read those three boxes is one "
        "bug, fixed twice. Head of line blocking."),
    (A, "One point one gives you a connection you can reuse, and one slow "
        "response then stalls everything queued behind it."),
    (A, "Two multiplexes streams over that connection and fixes it in the "
        "application. But they share one T C P connection, so a single "
        "dropped packet stalls all of them."),
    (A, "And three moves onto Quick, which recovers loss per stream."),
]

# --- who is allowed to talk -----------------------------------------------
# A `compare` has two reveals and is a short beat's panel, so the second side
# has to be named inside the reserve: about a dozen words. That suits the
# material, because the WebSockets side is genuinely the shorter story here.
# No focus: `http` left "HTTP and streams" lit and this is the same layer.
SCRIPT["streams"] = [
    (A, "Which is the shape an L L M A P I has, and one question decides it. "
        "Who is allowed to talk? If only the server talks, that is server "
        "sent events: an unending answer returned to a POST. That is how "
        "L L M tokens reach you, and M C P's H T T P transport too."),
    (A, "If both ends talk, text or binary, that is WebSockets. Voice "
        "agents."),
]

# --- how one service calls another ----------------------------------------
# A `table`'s head row IS a reveal of its own, unlike a `columns` heading, so
# head plus three rows is four reveals and four segments. Three columns
# rather than two, every cell short, because the free region beside a parked
# map is about 7.8 units.
SCRIPT["rpc"] = [
    (A, "One layer up, and the question changes. Not how the bytes move, "
        "but how one service calls another. Only three answers are worth "
        "knowing, each with one use and one catch."),
    (A, "REST at maturity level two for public A P Is, because any client "
        "with an H T T P library can consume it, and anything in between "
        "can cache it."),
    (A, "G R P C for internal serving. A caller set deadline propagates "
        "across hops, so services drop work nobody waits for. Its catch is "
        "one long lived connection, pinned by a layer four balancer."),
    (A, "And Graph Q L, for many clients on one backend. Rare in machine "
        "learning serving."),
]

# --- the newest layer ------------------------------------------------------
# Head plus four items, five reveals, five segments. One tone for the whole
# list, and `subject` rather than a split: a `points` panel takes a single
# tone, so colouring it for the majority would draw the thing it buys in the
# colour of the thing it costs.
SCRIPT["mcp"] = [
    (A, "And the top of the stack. The Model Context Protocol, from "
        "Anthropic, November twenty twenty four. J S O N R P C runs between "
        "a host, one client per connection, and servers exposing tools."),
    (A, "What it buys is that you write a server once and every harness can "
        "use it. That is why it won."),
    (A, "July's revision made the core stateless, so an ordinary gateway can "
        "route and cache a request."),
    (A, "What it costs is not a bug anybody can patch. Every tool result is "
        "untrusted text inside the model's context. That is the prompt "
        "injection surface."),
    (A, "Beside it, A two A. Agent to agent, not agent to tool."),
]

# --- the number -----------------------------------------------------------
# A `stat` has two reveals, the second of which is the note, so the sentence
# the note paraphrases is the last thing said. B's question sits between the
# two reveals, where nothing new is drawn anyway.
SCRIPT["paper2agent"] = [
    (A, "This number says how small a contract M C P really is. Stanford's "
        "Paper two Agent turns a research paper and its repository into an "
        "agent exposed as M C P tools. It is in Nature, and it worked on "
        "seventy four of a hundred computational biology papers, with no "
        "manual intervention."),
    (B, "What went wrong in the other twenty six?"),
    (A, "Not the protocol, and not the model. The missing piece was the "
        "knowledge needed to run the code, and it was never in the "
        "repository. The failing twenty six is the informative half."),
]

# --- auth, which stopped being somebody else's problem --------------------
# Head plus three items, four reveals, four segments.
SCRIPT["auth"] = [
    (A, "And that is why the auth layer stopped being somebody else's "
        "problem. M C P made every artificial intelligence engineer an "
        "O Auth integrator."),
    (A, "A remote server authenticates as an O Auth two point one resource "
        "server, holding a token bound to one audience. Itself, and nothing "
        "else."),
    (A, "And the spec bans token passthrough outright. Forward your inbound "
        "token upstream and you hand an attacker your privileged identity. "
        "The confused deputy."),
    (A, "So the answer is structural. Credentials outside the cell, "
        "approvals outside the chat."),
]

# --- the take -------------------------------------------------------------
# Six reveals on the closing beat rather than one card held still, which is
# the defect this series carried through four episodes before the still-frame
# check could fire. `focus` lists all six layers, which is how this vocabulary
# says no emphasis, and is the true statement about a take on the whole stack.
SCRIPT["close"] = [
    (A, "So what is the stack for? For knowing which layer to suspect. And "
        "the suspect has moved."),
    (A, "The bottom is about as solved as networking gets. T C P has been "
        "tuned for forty years and breaks in known ways."),
    (A, "The top is not two years old, and it is already reaching past "
        "software."),
    (A, "Anthropic's Model Hardware Standard puts an agent on microscopes, "
        "liquid handlers and robotic arms."),
    (A, "The thing that broke used to be a dropped packet. You retried it "
        "and moved on."),
    (A, "Now it is a tool result you did not write."),
]


VISUALS = {
    "ident": {"kind": "title"},

    # The home frame, and the axis. A `stack` parks like a `columns` map,
    # collapsing to its layer names and registering its focus handles by
    # them, and a stack is the right home frame when the vertical order is
    # itself the argument. `panel_stack`'s pill is a fixed 5.0 units and does
    # not derive from the layer count, so the names are short and the glosses
    # ride beside them at SMALL.
    #
    # `reserve` is set from the rendered duration below, with a floor: a
    # parked beat spends 2.0 seconds of settle and 0.7 of morph out of the
    # FRONT of its reserve, so the finished board stands still for about
    # reserve minus 2.7 and anything under that leaves the format's premise
    # unmet.
    "map": {"kind": "stack", "park": True, "reserve": 5.5, "tone": "subject",
            "layers": [
                ("agent protocols", "MCP and A2A"),
                ("auth", "OAuth, OIDC, JWTs"),
                ("RPC and APIs", "REST, gRPC, GraphQL"),
                ("HTTP and streams", "HTTP, SSE, WebSockets"),
                ("TLS and PKI", "handshake, certs, SSH"),
                ("transport", "TCP, UDP, DNS"),
            ]},

    # The hinge. The card carries the question's spine and the narration says
    # the whole sentence, so they share their key words without either one
    # reading the other aloud.
    "question": {"kind": "claim", "reserve": 4.8,
                 "text": "Not which protocol.\nWhich layer do you suspect?",
                 "note": "you are running all six already, chosen or not"},

    "transport": {"kind": "points", "tone": "cost", "reserve": 5.5,
                  "focus": "transport",
                  "head": "the base, as failure modes",
                  "items": [
                      "one stream caps near 5 Gbps",
                      "a 140 GB checkpoint needs concurrency",
                      "DNS: ndots, negative caching",
                  ]},

    "tls": {"kind": "bars", "reserve": 5.0, "focus": "TLS and PKI",
            "head": "post-quantum key exchange, deployed",
            "bars": [
                {"label": "client traffic", "text": "past 60%", "value": 60,
                 "tone": "number"},
                {"label": "origins", "text": "about 10%", "value": 10,
                 "tone": "number"},
            ]},

    "http": {"kind": "flow", "tone": "machinery", "reserve": 4.0,
             "focus": "HTTP and streams",
             "head": "one bug, fixed twice",
             "steps": ["HTTP/1.1", "HTTP/2", "HTTP/3 + QUIC"]},

    "streams": {"kind": "compare", "reserve": 5.4, "sides": [
        {"head": "SSE", "tone": "subject", "items": [
            "the server only talks",
            "an unending answer to a POST",
            "LLM tokens, and MCP",
        ]},
        {"head": "WebSockets", "tone": "machinery", "items": [
            "both ends talk",
            "text or binary",
            "voice agents",
        ]},
    ]},

    # Three columns, every cell short, because the free region beside a parked
    # map is about 7.8 units. The corner cell is not blank: an empty Text
    # contributes nothing to its row's bounding box and slides the whole
    # header one column left, silently.
    "rpc": {"kind": "table", "reserve": 5.5, "focus": "RPC and APIs",
            "head": ["style", "use it for", "the catch"],
            "rows": [
                ["REST", "public APIs", "level 2, or it is not REST"],
                ["gRPC", "internal serving", "L4 pins one connection"],
                ["GraphQL", "many clients", "rare in ML serving"],
            ]},

    "mcp": {"kind": "points", "tone": "subject", "reserve": 5.5,
            "focus": "agent protocols",
            "head": "the newest layer",
            "items": [
                "one server, every harness",
                "stateless core since July",
                "every tool result is untrusted text",
                "A2A: agent to agent",
            ]},

    # The figure is written as a figure so the card is scannable.
    "paper2agent": {"kind": "stat", "tone": "number", "reserve": 4.1,
                    "big": "74 of 100",
                    "caption": "papers turned into working MCP servers, "
                               "no manual intervention",
                    "note": "Stanford's Paper2Agent, Nature. The failing 26 "
                            "is the informative half"},

    "auth": {"kind": "points", "tone": "subject", "reserve": 5.3,
             "focus": "auth",
             "head": "MCP made everyone an OAuth integrator",
             "items": [
                 "remote servers are OAuth 2.1 resource servers",
                 "token passthrough is banned",
                 "credentials outside the cell, approvals outside the chat",
             ]},

    "close": {"kind": "points", "tone": "subject", "reserve": 4.0,
              "focus": ["transport", "TLS and PKI", "HTTP and streams",
                        "RPC and APIs", "auth", "agent protocols"],
              "head": "the failure mode moved up the stack",
              "items": [
                  "the bottom is close to solved",
                  "the top is not two years old",
                  "already driving microscopes",
                  "a dropped packet, retried",
                  "a tool result you did not write",
              ]},
}


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    turns = sum(len(t) for t in SCRIPT.values())
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {turns} turns ({b_turns} for B), {words} words")
    print(f"about {words * 0.40 / 60:.2f} minutes at 0.40 seconds a word")
    for key, beat in SCRIPT.items():
        w = sum(len(line.split()) for _, line in beat)
        print(f"  {key:14s} {len(beat)} turns  {w:3d} words  ~{w * 0.40:4.0f}s")
