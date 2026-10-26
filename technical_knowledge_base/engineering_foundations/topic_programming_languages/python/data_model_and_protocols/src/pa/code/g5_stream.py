"""A generator that streams tokens the way an LLM client does, and what happens
when the consumer stops early: the generator's finally block still runs."""
import time

def fake_model(prompt):
    tokens = ["Py", "thon", " gener", "ators", " stream", " lazily", "."]
    print("[open connection]")
    try:
        for t in tokens:
            time.sleep(0.01)          # stands in for network latency
            yield t
    finally:
        print("[close connection]")   # runs on exhaustion, on close(), and on garbage collection

out = []
for tok in fake_model("hi"):
    out.append(tok)
print(repr("".join(out)))

stream = fake_model("hi")
for i, tok in enumerate(stream):
    if i == 2:
        break                         # stop after three tokens
print("consumer stopped")
stream.close()                        # raises GeneratorExit inside the generator
print("after close")
