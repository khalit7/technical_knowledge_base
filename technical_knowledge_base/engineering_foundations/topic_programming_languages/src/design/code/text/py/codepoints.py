s = "héllo👍"
print(len(s), s[1], s[-1])        # code points: 6 of them
print(len(s.encode("utf-8")))     # bytes on the wire: 10
print(s[::-1])
