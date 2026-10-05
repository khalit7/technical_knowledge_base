big = 2**63 - 1                      # the largest 64-bit signed integer
print("2**63 - 1 + 1 =", big + 1)    # Python ints grow: no overflow
print("-7 // 2 =", -7 // 2, "  -7 % 2 =", -7 % 2)   # floor division
print("0.1 + 0.2 =", 0.1 + 0.2)
s = "café 日本 😀"
print("len:", len(s), " utf-8 bytes:", len(s.encode()), " s[3] =", s[3])
