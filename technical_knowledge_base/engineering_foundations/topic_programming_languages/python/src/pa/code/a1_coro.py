import asyncio, inspect

async def fetch(name):
    print(f"fetch({name}) starts")
    await asyncio.sleep(0.01)
    return name.upper()

c = fetch("a")                      # nothing runs yet: calling makes a coroutine OBJECT
print(type(c).__name__, inspect.getcoroutinestate(c))
print(asyncio.run(c))               # the event loop drives it to completion

fetch("b")                          # created and never awaited: it never runs
import gc; gc.collect()             # CPython warns when the unused coroutine is destroyed
print("end")
