"""Every panel kind on screen once, so the vocabulary is tested before forty
episodes depend on it. Not an episode anyone watches."""

A = "A"
FORMAT = "overview"
TITLE = "Panel test"
SUBTITLE = "every panel kind, once"
UPDATED = "22 September 2026"

SCRIPT = {
    "ident": [(A, "This is the panel test. It exists so the vocabulary is "
                  "checked by a renderer rather than by reading the code.")],
    "map": [(A, "First the map, built one column at a time, then parked at the "
                "corner where it stays available to point at.")],
    "points": [(A, "Then a short list, revealed a line at a time, which is the "
                   "commonest beat in any of these videos.")],
    "stack": [(A, "Then layers, where the order top to bottom is the argument "
                  "being made rather than decoration.")],
    "flow": [(A, "Then a pipeline, left to right, with the arrows drawn "
                 "alongside the boxes.")],
    "bars": [(A, "Then a comparison, where the length of the bar is the point "
                 "and the widths are worked out from the values.")],
    "stat": [(A, "Then a single number, large, with its caption underneath and "
                 "a note below that.")],
    "compare": [(A, "Then two positions side by side, so that the difference "
                    "between them is spatial rather than remembered.")],
    "table": [(A, "Then a table, for the case where the grid itself is the "
                  "content and prose would be worse.")],
    "claim": [(A, "Then the take, alone on screen, which is the one sentence "
                  "worth carrying away from the whole thing.")],
    "resources": [(A, "And last, where to go next, which every deep dive owes "
                      "the viewer at the end.")],
}

VISUALS = {
    "ident": {"kind": "title"},
    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "closed frontier", "tone": "subject",
         "items": ["OpenAI", "Anthropic", "Google"]},
        {"head": "open weights", "tone": "verified",
         "items": ["DeepSeek", "Qwen", "Moonshot"]},
        {"head": "fully open", "tone": "machinery", "items": ["Ai2", "IFM"]},
    ]},
    "points": {"kind": "points", "head": "what they agree on", "items": [
        "sparse mixture of experts at every scale",
        "a reasoning mode with an adjustable budget",
        "some form of trainable sparse attention",
    ]},
    "stack": {"kind": "stack", "layers": [
        ("registers", "per thread, fastest"),
        ("shared memory", "per block"),
        ("L2 cache", "per device"),
        ("HBM", "1.79 TB/s, and still the bottleneck"),
    ]},
    "flow": {"kind": "flow", "tone": "machinery",
             "steps": ["outline", "revise", "script", "critique", "humanise"]},
    "bars": {"kind": "bars", "head": "active parameters", "bars": [
        {"label": "Kimi K3", "text": "104B", "value": 104},
        {"label": "DeepSeek V4 Pro", "text": "49B", "value": 49},
        {"label": "Step 5", "text": "27B", "value": 27, "tone": "verified"},
    ]},
    "stat": {"kind": "stat", "big": "59", "caption": "operations per byte",
             "note": "below this, the maths units are idle"},
    "compare": {"kind": "compare", "sides": [
        {"head": "hidden budget", "items": ["a router decides",
                                            "two identical prompts differ",
                                            "evaluation gets harder"]},
        {"head": "exposed budget", "items": ["the caller decides",
                                             "cost is predictable",
                                             "the trace is readable"]},
    ]},
    "table": {"kind": "table",
              "head": ["model", "total", "active"],
              "rows": [["Kimi K3", "2.8T", "104B"],
                       ["DeepSeek V4 Pro", "1.6T", "49B"],
                       ["Step 5 Preview", "600B", "27B"]]},
    "claim": {"kind": "claim",
              "text": "The constraint moved from capability to verification.",
              "note": "which is a design choice, not a capability difference"},
    "resources": {"kind": "resources", "items": [
        {"name": "Horace He, on first principles", "gloss": "the canonical explanation"},
        {"name": "Simon Boehm's matmul worklog", "gloss": "measured at every step"},
        {"name": "PMPP, chapters 5 and 6", "gloss": "the textbook derivation"},
    ]},
}
