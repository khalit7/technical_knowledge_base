"""
Topic overview: protocols, as of 22 September 2026.

The load-bearing idea, and why this page earns a video: these are not
competing options, they are a stack, and every one of them is already running
underneath an LLM service whether or not anybody chose it. So the inventory is
layers rather than competitors, and the organising question is what each layer
means for running LLM services and agents. Getting that axis right is most of
the work: "REST against gRPC against GraphQL" would be a comparison video, and
a much smaller one than the page deserves.

The outline that survived the revision step:

    ident       what this is, and how current
    map         the six layers, built bottom to top and parked as the home
                frame: transport, TLS and PKI, HTTP and streams, RPC and
                APIs, auth, agent protocols
    question    not which protocol, but what each layer costs you
    transport   the foundations, as four failure modes
    tls         the layer that is quietly being rebuilt: PQ and 47-day certs
    http        three versions, one recurring bug: head-of-line blocking
    streams     SSE against WebSockets, and webhooks beside them
    rpc         REST, gRPC, GraphQL, and gRPC's one production trap
    mcp         the newest layer, what it buys and what it costs
    paper2agent the number: 74 of 100 papers, and what the other 26 means
    auth        OAuth 2.1, and why MCP banned token passthrough
    close       the take: the failure mode moved up the stack

What the step-4 critique changed:

  - Draft one ordered the tour top-down, starting at MCP because that is what
    this audience cares about. It read as a countdown rather than a stack, and
    the MCP beat had to keep borrowing things (SSE, OAuth, JSON-RPC) that had
    not been explained. Reversed to bottom-up, and every later beat now stands
    on one that came before it.
  - Draft one had a WebSockets beat with the whole RFC 6455 wire format in it.
    That is the deep dive's job. It shrank to one axis: who is allowed to
    speak, which is the only question that decides SSE against WebSockets.
  - The Paper2Agent number was presented as a success in draft one. Both
    halves are informative, and the failing 26 percent is the better half, so
    B now asks about it and A gives the page's actual answer.
  - Four figures were doing no work in speech (the RoCEv2 port number, the
    150-plus A2A member organisations, the HTTP/2 HPACK detail, the count of
    OAuth flows) and were cut rather than shrunk.
  - Draft one gave A2A and the Model Hardware Standard a beat of their own,
    which made thirteen beats and nine and a half minutes. A2A is one sentence
    beside MCP (agent-to-agent, not agent-to-tool) and MHS is named in the take,
    because the irreversible physical action IS the take.
  - B was narrating in draft one. B now has four turns, each one the question
    the viewer is forming, and A does something different because of each.

Every figure comes from the canonical page "Topic: protocols". If this video
names something the page does not, the page is the thing to fix.

Numbers and names are spelled the way they are said, because text to speech
reads "HTTP/3", "mTLS" and "QUIC" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: protocols"
SUBTITLE = "the stack under an LLM service, and what each layer costs you"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    "map": {"kind": "stack", "park": True, "layers": [
        ("agent protocols", "MCP, A2A, MHS"),
        ("auth", "OAuth 2.1, OIDC, JWTs, mTLS"),
        ("RPC and APIs", "REST, gRPC, GraphQL"),
        ("HTTP and streams", "HTTP/1.1, 2, 3, SSE, WebSockets, webhooks"),
        ("TLS and PKI", "TLS 1.3, certificates, SSH"),
        ("transport", "TCP, UDP, QUIC, DNS"),
    ]},

    "question": {"kind": "claim",
                 "text": "Not which protocol.\nWhat does each layer cost you when it fails?",
                 "note": "you are already running all six of them"},

    "transport": {"kind": "points", "focus": "transport",
                  "head": "the foundations, as failure modes", "tone": "cost",
                  "items": [
        "throughput is window over RTT, so one flow cannot fill a fat pipe",
        "roughly 5 Gbps per flow: a 140 GB checkpoint needs concurrency",
        "NCCL opens 16 sockets per peer on AWS for exactly this reason",
        "DNS: ndots amplification and negative caching, in Kubernetes",
    ]},

    "tls": {"kind": "bars", "focus": "TLS and PKI",
            "head": "post-quantum hybrid key exchange, deployed",
            "bars": [
                {"label": "client traffic", "text": "past 60%", "value": 60,
                 "tone": "verified"},
                {"label": "origins", "text": "about 10%", "value": 10,
                 "tone": "cost"},
            ]},

    "http": {"kind": "flow", "focus": "HTTP and streams", "tone": "machinery",
             "steps": ["HTTP/1.1: keep-alive",
                       "HTTP/2: multiplexing",
                       "HTTP/3: QUIC, per-stream loss"]},

    "streams": {"kind": "compare", "sides": [
        {"head": "SSE", "tone": "subject", "items": [
            "one direction: the server talks",
            "an unending response to a POST",
            "LLM tokens, and MCP's HTTP transport"]},
        {"head": "WebSockets", "tone": "machinery", "items": [
            "both directions, and binary",
            "voice agents",
            "CSWSH, which CORS does not prevent"]},
    ]},

    "rpc": {"kind": "table", "focus": "RPC and APIs",
            "head": ["", "use it for", "the catch"],
            "rows": [
                ["REST", "public APIs, any client", "level 2 or it is not REST"],
                ["gRPC", "internal and inference infra", "one HTTP/2 connection, so L4 pins it"],
                ["GraphQL", "many heterogeneous UI clients", "rarely earns it in ML serving"],
            ]},

    "mcp": {"kind": "compare", "focus": "agent protocols", "sides": [
        {"head": "what MCP buys", "tone": "verified", "items": [
            "write a server once, every harness can use it",
            "stateless core since 2026-07-28",
            "so a plain gateway can route and cache it"]},
        {"head": "what MCP costs", "tone": "cost", "items": [
            "every tool result is untrusted text",
            "arriving inside the model's context",
            "the whole prompt-injection surface"]},
    ]},

    "paper2agent": {"kind": "stat", "big": "74 of 100",
                    "caption": "computational biology papers turned into working "
                               "MCP servers, no manual intervention",
                    "note": "Stanford's Paper2Agent, Nature, September 2026. "
                            "The failing 26 is the informative half"},

    "auth": {"kind": "points", "focus": "auth",
             "head": "MCP made every AI engineer an OAuth integrator",
             "items": [
        "remote servers are OAuth 2.1 resource servers, audience-bound",
        "token passthrough is banned: it destroys audience binding",
        "a forwarded token hands an attacker your privileged identity",
        "so: credentials outside the cell, approvals outside the chat",
    ]},

    "close": {"kind": "claim",
              "text": "The failure mode moved up the stack.\n"
                      "It used to be a dropped packet.",
              "note": "now it is a tool result you did not write, arriving "
                      "inside your model's context"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

SCRIPT["ident"] = [
    (A, "This is the map of protocols. Not all of them: the ones an artificial "
        "intelligence engineer actually touches, from how bytes move to how "
        "agents talk to each other."),
    (A, "Current as of the twenty second of September, twenty twenty six. And "
        "it earns the time because you are already running every layer of it, "
        "whether or not anybody chose them."),
]

# --- the inventory, built bottom to top -----------------------------------
SCRIPT["map"] = [
    (A, "Here is the whole stack, bottom to top, and nothing explained yet."),
    (A, "Transport at the base. T C P, U D P, D N S, and the encrypted "
        "multiplexed one called quick, spelled Q U I C. Then T L S and public "
        "key infrastructure, with S S H alongside."),
    (A, "Then H T T P in three versions, plus the streaming shapes: server "
        "sent events, WebSockets, webhooks. Then remote procedure calls. Then "
        "auth. And on top, the newest layer, the agent protocols."),
]

# --- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (B, "Six layers. Which of them do I actually have to know?"),
    (A, "All of them, a bit. Which is why the question on the screen is not "
        "which protocol. It is what each layer costs you when it fails."),
    (A, "They are not competitors. They are stacked, and each one solves the "
        "problem the layer below it left behind."),
]

# --- the foundations ------------------------------------------------------
SCRIPT["transport"] = [
    (A, "Start at transport, and read the failure modes rather than the "
        "specification."),
    (A, "Throughput is window over round trip time, so one T C P stream cannot "
        "fill a long fat pipe. It caps around five gigabits a second, which is "
        "why a hundred and forty gigabyte checkpoint needs concurrency, not a "
        "faster link."),
    (A, "N Vidia's collective communications library opens sixteen sockets per "
        "peer on A W S for that reason. And D N S, at the bottom, breaks in ways "
        "that look like everything else: ndots amplification and negative "
        "caching, in Kubernetes."),
]

# --- the layer being quietly rebuilt --------------------------------------
SCRIPT["tls"] = [
    (A, "One layer up, T L S one point three. One round trip to a working "
        "session, forward secrecy mandatory rather than configurable, and "
        "everything after the server's first message encrypted, the "
        "certificate included."),
    (A, "And it is being rebuilt underneath you. Post quantum hybrid key "
        "exchange runs a classical elliptic curve exchange and a lattice based "
        "one side by side, mixing both secrets."),
    (A, "Look at the gap in the bars. Past sixty percent of client traffic, "
        "about ten percent of origins. And certificates fall to forty seven "
        "day lifetimes by twenty twenty nine, which ends manual issuance."),
]

# --- http -----------------------------------------------------------------
SCRIPT["http"] = [
    (A, "Now H T T P, and the honest way to read those three boxes is as one "
        "bug, fixed twice. Head of line blocking."),
    (A, "One point one gives you keep alive, and one slow response stalls "
        "everything behind it. Two multiplexes streams and fixes that in the "
        "application. But one dropped packet still stalls every stream, since "
        "they share a T C P connection. Three moves onto quick, which recovers "
        "loss per stream."),
    (B, "And for an L L M service, does the version actually matter?"),
    (A, "Less than the semantics do. Methods, status codes, retries, "
        "idempotency. Version independent, and you touch them daily."),
]

SCRIPT["streams"] = [
    (A, "Which brings us to the shape L L M A P Is have, and the one question "
        "that decides it. Who is allowed to speak?"),
    (A, "If only the server talks, that is server sent events. An unending "
        "H T T P response returned as the answer to a post. Token streaming, "
        "and M C P's H T T P transport."),
    (A, "If both sides talk, or the payload is binary, that is WebSockets. "
        "Voice agents live there, and so does cross site WebSocket hijacking, "
        "which neither the same origin policy nor cors prevents."),
]

# --- rpc ------------------------------------------------------------------
SCRIPT["rpc"] = [
    (A, "One layer up, how services call each other. Rest at maturity level "
        "two for public A P Is, because any client with an H T T P library can "
        "consume it. Graph Q L when many different interfaces hit one backend, "
        "which rarely earns it in machine learning serving."),
    (A, "G R P C for internal and inference infrastructure. Protobuf schemas, "
        "four streaming modes, and a deadline set by the caller that "
        "propagates across hops, so downstream services abandon work nobody is "
        "waiting for. Real money when the work is a G P U forward pass."),
    (A, "Its one trap is the right hand column. A G R P C channel is one long "
        "lived H T T P two connection, so a layer four load balancer pins every "
        "call to one backend."),
]

# --- the newest layer -----------------------------------------------------
SCRIPT["mcp"] = [
    (A, "And now the top of the stack, and the layer that matters most here. "
        "The Model Context Protocol. J S O N R P C between a host, a client "
        "per connection, and servers exposing tools, resources and prompts."),
    (A, "July's revision made the core stateless, so a plain gateway can route "
        "and cache a request. What that buys is on the left. Write a server "
        "once, and every harness can use it."),
    (A, "What it costs is on the right, and it is not a bug you can patch. "
        "Every tool result is untrusted text arriving inside the model's "
        "context. That is the whole prompt injection surface."),
    (A, "Beside it, A two A: agent to agent rather than agent to tool."),
]

SCRIPT["paper2agent"] = [
    (A, "And here is the number that says how small a contract M C P really "
        "is. Seventy four of a hundred."),
    (A, "Stanford's Paper two Agent turns a research paper plus its repository "
        "into an agent exposed as M C P tools, one that reproduces the paper's "
        "results. Seventy four of a hundred computational biology papers, no "
        "manual intervention."),
    (B, "So what went wrong in the other twenty six?"),
    (A, "Not the protocol, and not the model. The knowledge needed to actually "
        "run the code was missing from the repository. Issue threads, "
        "undocumented environment assumptions, the authors' heads."),
]

# --- auth -----------------------------------------------------------------
SCRIPT["auth"] = [
    (A, "Which is why auth stopped being somebody else's problem. M C P made "
        "every artificial intelligence engineer an O Auth integrator."),
    (A, "Remote servers authenticate as O Auth two point one resource servers, "
        "holding tokens bound to one audience. The spec bans token passthrough "
        "for the reason on the third line. Forward your inbound token upstream "
        "and you hand an attacker your privileged identity."),
    (A, "The answer is the last line. Credentials outside the runtime cell, so "
        "a compromised context has nothing to steal. Approvals raised as "
        "operating system dialogs, so text arriving over a tool surface cannot "
        "manufacture consent."),
]

# --- the take -------------------------------------------------------------
SCRIPT["close"] = [
    (A, "So what is the stack for? For knowing which layer to suspect. And the "
        "suspect has moved. The bottom is about as solved as networking gets. "
        "The top is four years old and already reaching physical machines, "
        "through Anthropic's Model Hardware Standard."),
    (A, "The failure mode used to be a dropped packet. Now it is a tool result "
        "you did not write, arriving inside your model's context, and at the "
        "far end of it an action nobody can undo."),
]


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    print(f"{len(SCRIPT)} beats, {words} words, about {words / 148 * 60:.0f} seconds")
    for key, turns in SCRIPT.items():
        w = sum(len(line.split()) for _, line in turns)
        print(f"  {key:18s} {len(turns)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
