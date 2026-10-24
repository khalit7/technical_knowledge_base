"""A small HPACK (RFC 7541) decoder that reports HOW each header field was encoded, byte span by byte span.

The hpack library decodes values; it does not say which representation was used. This parser does both, so the page
can show "indexed (1 byte)" against "literal with incremental indexing, Huffman-coded value (n bytes)".
Checked against hpack.Decoder on every block it parses (parse() asserts the decoded list is identical).
"""
from hpack import Decoder
from hpack.huffman import HuffmanEncoder  # noqa: F401  (ensures the package layout is what we expect)
from hpack.huffman_table import decode_huffman
from hpack.table import HeaderTable

STATIC = HeaderTable.STATIC_TABLE  # tuple of (name, value) bytes, index 1..61


def _int(buf, i, prefix):
    mask = (1 << prefix) - 1
    v = buf[i] & mask
    i += 1
    if v < mask:
        return v, i
    m = 0
    while True:
        b = buf[i]; i += 1
        v += (b & 0x7F) << m
        m += 7
        if not b & 0x80:
            return v, i


def _str(buf, i):
    huff = bool(buf[i] & 0x80)
    n, i = _int(buf, i, 7)
    raw = bytes(buf[i:i + n])
    return (decode_huffman(raw) if huff else raw), huff, i + n, n


class Parser:
    def __init__(self, max_size=4096):
        self.dyn = []  # newest first: (name, value)
        self.max = max_size
        self.check = Decoder()

    def _size(self):
        return sum(len(n) + len(v) + 32 for n, v in self.dyn)

    def _add(self, n, v):
        self.dyn.insert(0, (n, v))
        while self._size() > self.max:
            self.dyn.pop()

    def _get(self, idx):
        if idx <= len(STATIC):
            return STATIC[idx - 1], "static"
        return self.dyn[idx - len(STATIC) - 1], "dynamic"

    def parse(self, block):
        out, i, buf = [], 0, bytearray(block)
        while i < len(buf):
            s = i
            b = buf[i]
            if b & 0x80:
                idx, i = _int(buf, i, 7)
                (n, v), where = self._get(idx)
                out.append(dict(kind="indexed", table=where, index=idx, name=n.decode(), value=v.decode(), bytes=i - s))
                continue
            if (b & 0xE0) == 0x20:
                size, i = _int(buf, i, 5)
                self.max = size
                out.append(dict(kind="table_size_update", size=size, bytes=i - s))
                continue
            if b & 0x40:
                kind, prefix = "literal_incremental", 6
            elif b & 0x10:
                kind, prefix = "literal_never_indexed", 4
            else:
                kind, prefix = "literal_without_indexing", 4
            idx, i = _int(buf, i, prefix)
            if idx:
                (n, _), where = self._get(idx)
                name_from = where + " name"
                nh = False
            else:
                n, nh, i, _ = _str(buf, i)
                name_from = "literal name" + (" (Huffman)" if nh else "")
            v, vh, i, vlen = _str(buf, i)
            if kind == "literal_incremental":
                self._add(n, v)
            out.append(dict(kind=kind, name_from=name_from, index=idx, name=n.decode(), value=v.decode(),
                            value_huffman=vh, value_len=vlen, bytes=i - s))
        ref = [(k if isinstance(k, str) else k.decode(), v if isinstance(v, str) else v.decode())
               for k, v in self.check.decode(bytes(block), raw=False)]
        mine = [(o["name"], o["value"]) for o in out if "name" in o]
        assert ref == mine, (ref, mine)
        return out
