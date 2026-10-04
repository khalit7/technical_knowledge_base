"""A minimal reader for Thrift's compact protocol, enough to decode a Parquet footer (FileMetaData) and page headers
byte by byte. Field ids and enum values from parquet.thrift (github.com/apache/parquet-format/blob/master/src/main/thrift/parquet.thrift).
read_struct returns {field_id: value} plus the byte span of every field, so the page can show where each value sits."""
import struct
class R:
    def __init__(s, buf, pos=0): s.b = buf; s.p = pos
    def byte(s):
        v = s.b[s.p]; s.p += 1; return v
    def varint(s):
        sh = v = 0
        while True:
            x = s.byte(); v |= (x & 0x7f) << sh; sh += 7
            if not x & 0x80: return v
    def zz(s):
        v = s.varint(); return (v >> 1) ^ -(v & 1)
    def binary(s):
        n = s.varint(); v = s.b[s.p:s.p + n]; s.p += n; return bytes(v)
    def value(s, t):
        if t in (1, 2): return t == 1
        if t == 3: v = s.b[s.p]; s.p += 1; return v
        if t in (4, 5, 6): return s.zz()
        if t == 7: v = struct.unpack('<d', s.b[s.p:s.p + 8])[0]; s.p += 8; return v
        if t == 8: return s.binary()
        if t in (9, 10):
            h = s.byte(); n = h >> 4; et = h & 15
            if n == 15: n = s.varint()
            if et in (1, 2): return [s.byte() == 1 for _ in range(n)]
            return [s.value(et) for _ in range(n)]
        if t == 11:
            n = s.varint()
            if not n: return {}
            kv = s.byte(); return {s.value(kv >> 4): s.value(kv & 15) for _ in range(n)}
        if t == 12: return s.struct()
        raise ValueError(f'type {t} at {s.p}')
    def struct(s):
        out = {}; last = 0; spans = {}
        while True:
            start = s.p; h = s.byte()
            if h == 0: break
            d = h >> 4; t = h & 15
            fid = last + d if d else s.zz()
            out[fid] = s.value(t); spans[fid] = (start, s.p); last = fid
        out['_spans'] = spans
        return out
TYPES = ['BOOLEAN', 'INT32', 'INT64', 'INT96', 'FLOAT', 'DOUBLE', 'BYTE_ARRAY', 'FIXED_LEN_BYTE_ARRAY']
ENC = {0: 'PLAIN', 2: 'PLAIN_DICTIONARY', 3: 'RLE', 4: 'BIT_PACKED', 5: 'DELTA_BINARY_PACKED', 6: 'DELTA_LENGTH_BYTE_ARRAY',
       7: 'DELTA_BYTE_ARRAY', 8: 'RLE_DICTIONARY', 9: 'BYTE_STREAM_SPLIT'}
CODEC = ['UNCOMPRESSED', 'SNAPPY', 'GZIP', 'LZO', 'BROTLI', 'LZ4', 'ZSTD', 'LZ4_RAW']
PAGE = ['DATA_PAGE', 'INDEX_PAGE', 'DICTIONARY_PAGE', 'DATA_PAGE_V2']
