import sys
import threading

counts = {"u0029": 0}


def work() -> None:
    for _ in range(200_000):
        counts["u0029"] += 1  # read, add, write: three steps, not one


threads = [threading.Thread(target=work) for _ in range(4)]
for t in threads:
    t.start()
for t in threads:
    t.join()
gil = sys._is_gil_enabled() if hasattr(sys, "_is_gil_enabled") else True
print(f"GIL enabled: {gil}; expected 800000, got {counts['u0029']}")
