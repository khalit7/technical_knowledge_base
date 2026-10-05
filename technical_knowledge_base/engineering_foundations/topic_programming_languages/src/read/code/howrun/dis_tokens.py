# Show CPython's bytecode for count_tokens before and after it has run (specialised, PEP 659).
import dis, sys
from tokens import count_tokens
print(sys.version.split()[0])
print("=== before running ===")
dis.dis(count_tokens)
for _ in range(1000):
    count_tokens("attention training trained for; x86_64 café v2.1 C++")
print("=== after 1000 calls (adaptive=True shows specialised instructions) ===")
dis.dis(count_tokens, adaptive=True)
