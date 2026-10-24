"""permessage-deflate (RFC 7692) on token streams, with the `websockets` library's own encoder.

Usage: python ws_deflate.py <text file for the long answer>
Two answers: the running one (7 messages) and a long one (each word of RFC 6455 section 1.1 sent as one
content_block_delta message, the JSON shape of the running example). For each setting, the bytes on the
wire from server to client: frame header plus (compressed) payload. Server frames are not masked.
"""
import json, re, sys
from websockets.extensions.permessage_deflate import PerMessageDeflate
from websockets.frames import Frame, Opcode

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from lab_server import schedule, ev_json

text = open(sys.argv[1]).read().split("\n", 2)[2]  # skip the provenance line
words = re.findall(r"\S+", text)
LONG = [ev_json("message_start")] + [ev_json("content_block_delta", text=(" " if i else "") + w) for i, w in enumerate(words)] + [ev_json("message_stop")]
SHORT = [d for _, _, d in schedule()]


def hdr(n):
    return 2 if n < 126 else 4 if n < 65536 else 10


SETTINGS = {
    "no compression": None,
    "deflate, zlib defaults (window 2^15, memLevel 8), context kept": dict(nct=False, wb=15, ml=8),
    "deflate, websockets defaults (window 2^12, memLevel 5), context kept": dict(nct=False, wb=12, ml=5),
    "deflate, no context takeover (each message compressed alone)": dict(nct=True, wb=15, ml=8),
}


def wire(msgs, s):
    if s is None:
        return sum(hdr(len(m.encode())) + len(m.encode()) for m in msgs), len(msgs)
    ext = PerMessageDeflate(False, s["nct"], 15, s["wb"], {"memLevel": s["ml"]})
    tot = 0
    for m in msgs:
        f = ext.encode(Frame(Opcode.TEXT, m.encode()))
        tot += hdr(len(f.data)) + len(f.data)
    return tot, len(msgs)


out = {"long_answer_words": len(words), "payload_bytes": {"short": sum(len(m.encode()) for m in SHORT),
                                                          "long": sum(len(m.encode()) for m in LONG)}, "settings": {}}
for name, s in SETTINGS.items():
    out["settings"][name] = {"short": wire(SHORT, s)[0], "long": wire(LONG, s)[0]}
print(json.dumps(out, indent=1))
