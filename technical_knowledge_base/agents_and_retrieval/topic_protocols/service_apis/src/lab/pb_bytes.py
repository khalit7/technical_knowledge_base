"""Protobuf on the wire, measured: python pb_bytes.py GEN_DIR OUT.json
GEN_DIR holds llm_pb2.py and llm_v2_pb2.py (protoc output). Encodes the root page's running request
(request.json: model wire-lab-1, max_tokens 16, stream true, one user message) as protobuf, annotates
every byte with an independent wire-format walker, compares with the JSON body, and runs the
schema-evolution, varint, zigzag, packed and tensor-size experiments the page quotes."""
import base64, json, struct, sys, time
sys.path.insert(0, sys.argv[1])
import google.protobuf
import llm_pb2 as v1
import llm_v2_pb2 as v2
from google.protobuf import json_format

OUT = {"protobuf_python": google.protobuf.__version__}
WT = {0: "VARINT", 1: "I64", 2: "LEN", 5: "I32"}


def varint(b, i):
    n = s = 0
    start = i
    while True:
        c = b[i]; i += 1
        n |= (c & 0x7F) << s; s += 7
        if c < 0x80:
            return n, i, b[start:i]


def walk(b, names, depth=0, base=0):
    """Annotate a message: one row per tag, length and value. names maps field number to (name, kind, sub)."""
    rows, i = [], 0
    while i < len(b):
        t, j, raw = varint(b, i)
        fn, wt = t >> 3, t & 7
        name, kind, sub = names.get(fn, (f"unknown field {fn}", None, None))
        rows.append(dict(off=base + i, hex=raw.hex(" "), what=f"tag: field {fn} ({name}), wire type {wt} {WT.get(wt, '?')}", d=depth, k="tag"))
        i = j
        if wt == 0:
            v, j, raw = varint(b, i)
            rows.append(dict(off=base + i, hex=raw.hex(" "), what=f"value {v}" + (" (true)" if kind == "bool" and v == 1 else ""), d=depth, k="val"))
            i = j
        elif wt == 2:
            ln, j, raw = varint(b, i)
            rows.append(dict(off=base + i, hex=raw.hex(" "), what=f"length {ln}", d=depth, k="len"))
            i = j
            body = b[i:i + ln]
            if kind == "msg":
                rows += walk(body, sub, depth + 1, base + i)
            elif kind == "packed":
                vals, k = [], 0
                while k < len(body):
                    v, k, _ = varint(body, k); vals.append(v)
                rows.append(dict(off=base + i, hex=body.hex(" "), what=f"{len(vals)} varints {vals}", d=depth, k="val"))
            else:
                rows.append(dict(off=base + i, hex=body.hex(" "), what=f'"{body.decode(errors="replace")}"', d=depth, k="val"))
            i += ln
        elif wt == 5:
            rows.append(dict(off=base + i, hex=b[i:i + 4].hex(" "), what=f"float {struct.unpack('<f', b[i:i+4])[0]}", d=depth, k="val")); i += 4
        elif wt == 1:
            rows.append(dict(off=base + i, hex=b[i:i + 8].hex(" "), what="8 bytes", d=depth, k="val")); i += 8
    return rows


MSG = {1: ("role", "str", None), 2: ("content", "str", None)}
REQ = {1: ("model", "str", None), 2: ("messages", "msg", MSG), 3: ("max_tokens", "uint32", None), 4: ("stream", "bool", None)}
REQ2 = {**REQ, 5: ("temperature", "float", None), 6: ("stop_token_ids", "packed", None)}

# 1. The running request, both ways
req_json = '{"model":"wire-lab-1","max_tokens":16,"stream":true,"messages":[{"role":"user","content":"What colour is the sky?"}]}'
assert len(req_json) == 117, len(req_json)
r = v1.GenerateRequest(model="wire-lab-1", max_tokens=16, stream=True, messages=[v1.Message(role="user", content="What colour is the sky?")])
pb = r.SerializeToString()
OUT["request"] = dict(json=req_json, json_bytes=len(req_json.encode()), pb_hex=pb.hex(" "), pb_bytes=len(pb), rows=walk(pb, REQ),
                      grpc_frame_bytes=5 + len(pb), proto_json=json_format.MessageToJson(r, indent=None))

# 2. The five streamed tokens: protobuf Token messages against the root's SSE events
toks = ["The", " sky", " is", " blue", "."]
tk = [v1.Token(text=t, index=i).SerializeToString() for i, t in enumerate(toks)]
OUT["tokens"] = dict(texts=toks, pb_hex=[x.hex(" ") for x in tk], pb_bytes=[len(x) for x in tk], grpc_msg_bytes=[5 + len(x) for x in tk],
                     rows0=walk(tk[1], {1: ("text", "str", None), 2: ("index", "uint32", None)}))

# 3. Varints and zigzag
vt = []
for v in [1, 127, 128, 150, 300, 16384, 2**31 - 1]:
    b = v1.Token(index=v).SerializeToString()
    vt.append(dict(v=v, hex=b[1:].hex(" "), n=len(b) - 1))
OUT["varints"] = vt
# int32 -1 against sint32 -1, built by hand from the encoding guide's rules and checked against the library
# (int32 negative values are sign-extended to 64 bits: 10 bytes; sint32 uses zigzag: -1 -> 1)
from google.protobuf import descriptor_pb2, descriptor_pool, message_factory
fd = descriptor_pb2.FileDescriptorProto(name="zz.proto", package="zz", syntax="proto3")
m = fd.message_type.add(name="Z")
m.field.add(name="a", number=1, type=descriptor_pb2.FieldDescriptorProto.TYPE_INT32, label=1)
m.field.add(name="b", number=2, type=descriptor_pb2.FieldDescriptorProto.TYPE_SINT32, label=1)
pool = descriptor_pool.DescriptorPool(); pool.Add(fd)
Z = message_factory.GetMessageClass(pool.FindMessageTypeByName("zz.Z"))
OUT["zigzag"] = dict(int32_minus1=Z(a=-1).SerializeToString().hex(" "), sint32_minus1=Z(b=-1).SerializeToString().hex(" "),
                     int32_minus1_bytes=len(Z(a=-1).SerializeToString()), sint32_minus1_bytes=len(Z(b=-1).SerializeToString()))

# 4. Schema evolution: a v2 writer, a v1 reader
r2 = v2.GenerateRequest(model="wire-lab-1", max_tokens=16, stream=True, temperature=0.5, stop_token_ids=[13, 198],
                        messages=[v2.Message(role="user", content="What colour is the sky?")])
b2 = r2.SerializeToString()
old = v1.GenerateRequest(); old.ParseFromString(b2)
back = old.SerializeToString()
OUT["evolve_add"] = dict(v2_hex=b2.hex(" "), v2_bytes=len(b2), rows=walk(b2, REQ2),
                         v1_sees=json_format.MessageToDict(old), v1_reserialised_equal=(back == b2),
                         unknown_tail_hex=b2[len(pb):].hex(" "))
# The mistake: field 3 reused as a string
bad = v2.GenerateRequestBad(model="wire-lab-1", stream=True, max_tokens_note="sixteen",
                            messages=[v2.Message(role="user", content="What colour is the sky?")]).SerializeToString()
o = v1.GenerateRequest(); err = None
try:
    o.ParseFromString(bad)
    seen = json_format.MessageToDict(o)
except Exception as e:  # what an old reader does with a reused number of another wire type
    seen = None; err = f"{type(e).__name__}: {e}"
OUT["evolve_reuse"] = dict(bad_hex=bad.hex(" "), old_reader_sees=seen, old_reader_error=err,
                           note="field 3 arrives with wire type LEN where the old schema expects VARINT")
# Same wire type reused: int field 3 reinterpreted silently
fd2 = descriptor_pb2.FileDescriptorProto(name="re.proto", package="re", syntax="proto3")
m2 = fd2.message_type.add(name="R")
m2.field.add(name="priority", number=3, type=descriptor_pb2.FieldDescriptorProto.TYPE_UINT32, label=1)
pool2 = descriptor_pool.DescriptorPool(); pool2.Add(fd2)
R = message_factory.GetMessageClass(pool2.FindMessageTypeByName("re.R"))
o2 = v1.GenerateRequest(); o2.ParseFromString(R(priority=9).SerializeToString())
OUT["evolve_silent"] = dict(writer="field 3 = priority 9 (uint32)", old_reader_sees=json_format.MessageToDict(o2))

# 5. Packed repeated
tokens_ids = [791, 13180, 374, 6437, 13]
pk = v2.GenerateRequest(stop_token_ids=tokens_ids).SerializeToString()
OUT["packed"] = dict(ids=tokens_ids, packed_hex=pk.hex(" "), packed_bytes=len(pk),
                     unpacked_bytes=sum(1 + len(v1.Token(index=v).SerializeToString()) - 1 for v in tokens_ids))

# 6. A tensor: 1,000,000 float32 values as JSON numbers, as base64 in JSON, and as protobuf packed floats
import random
random.seed(7)
vals = [random.gauss(0, 1) for _ in range(1_000_000)]
f32 = struct.pack(f"<{len(vals)}f", *vals)
vals32 = list(struct.unpack(f"<{len(vals)}f", f32))
fdt = descriptor_pb2.FileDescriptorProto(name="t.proto", package="t", syntax="proto3")
mt = fdt.message_type.add(name="T")
mt.field.add(name="data", number=1, type=descriptor_pb2.FieldDescriptorProto.TYPE_FLOAT, label=3)
mt.field.add(name="raw", number=2, type=descriptor_pb2.FieldDescriptorProto.TYPE_BYTES, label=1)
pool3 = descriptor_pool.DescriptorPool(); pool3.Add(fdt)
T = message_factory.GetMessageClass(pool3.FindMessageTypeByName("t.T"))


def timed(fn, reps=3):
    best = 1e9
    for _ in range(reps):
        t = time.perf_counter(); res = fn(); best = min(best, time.perf_counter() - t)
    return res, best


js, t_js_enc = timed(lambda: json.dumps(vals32).encode())
_, t_js_dec = timed(lambda: json.loads(js))
b64, t_b64_enc = timed(lambda: json.dumps({"data": base64.b64encode(f32).decode()}).encode())
_, t_b64_dec = timed(lambda: base64.b64decode(json.loads(b64)["data"]))
pbt, t_pb_enc = timed(lambda: T(data=vals32).SerializeToString())
_, t_pb_dec = timed(lambda: T.FromString(pbt).data[0])
pbr, t_pbr_enc = timed(lambda: T(raw=f32).SerializeToString())
_, t_pbr_dec = timed(lambda: T.FromString(pbr).raw)
ms = lambda s: round(s * 1000, 1)
OUT["tensor"] = dict(n=len(vals), raw_bytes=len(f32), rows=[
    dict(fmt="JSON list of numbers", bytes=len(js), enc_ms=ms(t_js_enc), dec_ms=ms(t_js_dec)),
    dict(fmt="JSON with base64 string", bytes=len(b64), enc_ms=ms(t_b64_enc), dec_ms=ms(t_b64_dec)),
    dict(fmt="protobuf repeated float (packed)", bytes=len(pbt), enc_ms=ms(t_pb_enc), dec_ms=ms(t_pb_dec)),
    dict(fmt="protobuf bytes field (raw float32)", bytes=len(pbr), enc_ms=ms(t_pbr_enc), dec_ms=ms(t_pbr_dec)),
], note="best of 3 runs each, Python 3.13 stdlib json and the protobuf upb backend, one M1 Pro core; 1,000,000 float32 values drawn from N(0,1) with seed 7")
OUT["recorded"] = time.strftime("%Y-%m-%d %H:%M %Z")
json.dump(OUT, open(sys.argv[2], "w"), indent=1)
print("request pb", len(pb), "json", len(req_json), "| tensor", [(x["fmt"], x["bytes"]) for x in OUT["tensor"]["rows"]])
