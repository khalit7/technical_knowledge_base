"""Free-threaded Python: 8 threads share ONE Counter and call add() at the same time.
A #[pyclass] method taking &mut self is guarded by PyO3's run-time borrow check."""
import sys
import threading

import tokrs

print("GIL enabled:", sys._is_gil_enabled())


def work(c, k, failed, message):
    for _ in range(20000):
        try:
            c.add("u1", "one two three")
        except RuntimeError as e:
            failed[k] += 1
            message.add(str(e))


for cls in (tokrs.Counter, tokrs.SharedCounter):
    c, failed, message = cls(), [0] * 8, set()   # one slot per thread: no shared Python counter to race on
    ts = [threading.Thread(target=work, args=(c, k, failed, message)) for k in range(8)]
    for t in ts:
        t.start()
    for t in ts:
        t.join()
    print(f"{cls.__name__}: {8 * 20000} calls, added {c.total // 3}, raised {sum(failed)}", *message)
