s = "café 日本語 🦀"
print("len(s) =", len(s), "code points")
print("utf-8 bytes =", len(s.encode()))
print("s[0:4] =", repr(s[0:4]))
