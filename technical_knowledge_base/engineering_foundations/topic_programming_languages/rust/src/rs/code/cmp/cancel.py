# Python: cancelling a task raises CancelledError inside it, at its pending await.
# The coroutine can run cleanup (finally) and could even catch it.
import asyncio, time

async def step(name, ms):
    print(f"   {name}: started, waiting {ms} ms")
    try:
        await asyncio.sleep(ms / 1000)
        print(f"   {name}: finished")
        return name
    except asyncio.CancelledError:
        print(f"   {name}: CancelledError raised at the await")
        raise
    finally:
        print(f"   finally: {name} cleaned up")

async def main():
    t = time.perf_counter()
    print("1. asyncio.timeout(0.25) around a 2000 ms call")
    try:
        async with asyncio.timeout(0.25):
            await step("slow", 2000)
    except TimeoutError:
        print(f"   -> TimeoutError after {round((time.perf_counter() - t) * 1000)} ms")

asyncio.run(main())
