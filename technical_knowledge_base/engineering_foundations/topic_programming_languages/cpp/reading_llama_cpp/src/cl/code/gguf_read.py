# Read a GGUF file's header with nothing but the standard library (format: ggml/include/gguf.h).
import struct, sys
SCALAR = {0: "<B", 1: "<b", 2: "<H", 3: "<h", 4: "<I", 5: "<i", 6: "<f", 7: "<?", 10: "<Q", 11: "<q", 12: "<d"}
TYPE_NAME = {0: "F32", 1: "F16", 2: "Q4_0", 8: "Q8_0", 12: "Q4_K", 14: "Q6_K"}   # a few ggml_type values
BLOCK = {0: (1, 4), 1: (1, 2), 2: (32, 18), 8: (32, 34)}                         # (elements, bytes) per block

def main(path, show_t=6):
    f = open(path, "rb")
    rd = lambda fmt: struct.unpack(fmt, f.read(struct.calcsize(fmt)))[0]
    rstr = lambda: f.read(rd("<Q")).decode("utf-8")
    def value(t):
        if t == 8: return rstr()                                     # string
        if t == 9:                                                   # array: element type, count, elements
            et, n = rd("<I"), rd("<Q")
            return [value(et) for _ in range(n)]
        return rd(SCALAR[t])
    magic, version, n_tensors, n_kv = f.read(4), rd("<I"), rd("<q"), rd("<q")
    print(f"magic={magic!r} version={version} tensors={n_tensors} kv={n_kv}")
    kv = {}
    for i in range(n_kv):
        key = rstr(); kv[key] = value(rd("<I"))
        if i < 2 or key.startswith("llama.") or key == "tokenizer.ggml.tokens":
            v = kv[key]; print(f"  kv {key} = {v if not isinstance(v, list) else f'[{len(v)} items] {v[:3]}'}")
    tensors = []
    for i in range(n_tensors):
        name = rstr(); nd = rd("<I"); ne = [rd("<q") for _ in range(nd)]
        typ, off = rd("<I"), rd("<Q")
        tensors.append((name, ne, typ, off))
    align = kv.get("general.alignment", 32)
    data_start = (f.tell() + align - 1) // align * align              # GGML_PAD: round up to the alignment
    print(f"header ends at byte {f.tell()}, tensor data starts at byte {data_start} (alignment {align})")
    for name, ne, typ, off in tensors[:show_t]:
        n = 1
        for d in ne: n *= d
        el, by = BLOCK.get(typ, (None, None))
        size = n // el * by if el else "?"
        print(f"  {name:28s} ne={ne} type={TYPE_NAME.get(typ, typ)} offset={off} bytes={size}")
    return kv, tensors, data_start

if __name__ == "__main__":
    main(sys.argv[1])
