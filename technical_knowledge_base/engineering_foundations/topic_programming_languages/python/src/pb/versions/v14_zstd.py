from compression import zstd

data = b"token " * 1000
packed = zstd.compress(data)
print(len(data), "->", len(packed), zstd.decompress(packed) == data)
