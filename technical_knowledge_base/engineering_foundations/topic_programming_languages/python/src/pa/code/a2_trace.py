"""Three coroutines, four ways of running them. Every event is stamped with the event
loop's clock (ms since the run started); the Event loop tab replays these traces."""
import asyncio, json, sys, time

EV = []
def ev(who, what, note=""):
    EV.append([who, what, round((time.perf_counter() - T0) * 1000, 1), note])

async def fetch(name, secs):
    ev(name, "start")
    ev(name, "await", f"asyncio.sleep({secs})")
    await asyncio.sleep(secs)                  # suspends: control goes back to the loop
    ev(name, "resume")
    ev(name, "done")
    return name

async def fetch_blocking(name, secs):
    ev(name, "start")
    ev(name, "block", f"time.sleep({secs})")
    time.sleep(secs)                           # blocks the whole thread: no other coroutine can run
    ev(name, "done")
    return name

async def fetch_thread(name, secs):
    ev(name, "start")
    ev(name, "await", f"asyncio.to_thread(time.sleep, {secs})")
    await asyncio.to_thread(time.sleep, secs)  # the blocking call runs in a worker thread
    ev(name, "resume")
    ev(name, "done")
    return name

JOBS = [("A", 0.10), ("B", 0.20), ("C", 0.30)]

async def sequential():
    return [await fetch(n, s) for n, s in JOBS]

async def gathered():
    return await asyncio.gather(*(fetch(n, s) for n, s in JOBS))

async def gathered_blocking():
    return await asyncio.gather(fetch("A", 0.10), fetch_blocking("B", 0.20), fetch("C", 0.30))

async def gathered_thread():
    return await asyncio.gather(fetch("A", 0.10), fetch_thread("B", 0.20), fetch("C", 0.30))

out = {}
for mode in (sequential, gathered, gathered_blocking, gathered_thread):
    EV.clear()
    T0 = time.perf_counter()
    res = asyncio.run(mode())
    total = round((time.perf_counter() - T0) * 1000, 1)
    out[mode.__name__] = {"events": list(EV), "total_ms": total, "result": res}
    print(f"{mode.__name__:18} {total:6.1f} ms  order of events: " +
          " ".join(f"{w}:{e}" for w, e, _, _ in EV))
with open(sys.argv[1] if len(sys.argv) > 1 else "/dev/null", "w") as f:
    json.dump(out, f)
