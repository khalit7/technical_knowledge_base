"""Async generators: how LLM SDKs stream tokens. The consumer uses `async for`."""
import asyncio, time

async def stream_tokens(text, delay=0.02):
    try:
        for tok in text.split(" "):
            await asyncio.sleep(delay)          # waiting for the next chunk from the network
            yield tok + " "
    finally:
        print("\n[stream closed]")

async def ticker(stop):
    n = 0
    while not stop.is_set():
        await asyncio.sleep(0.02)
        n += 1
    return n

async def main():
    stop = asyncio.Event()
    tick = asyncio.create_task(ticker(stop))    # other work keeps running while we stream
    t0 = time.perf_counter()
    async for tok in stream_tokens("the event loop interleaves waiting, never computing"):
        print(tok, end="", flush=True)
    stop.set()
    print(f"streamed in {time.perf_counter() - t0:.2f} s; the ticker ran {await tick} times meanwhile")

    agen = stream_tokens("stop me after two tokens please")
    got = []
    async for tok in agen:
        got.append(tok)
        if len(got) == 2:
            break                               # leaves the generator suspended
    await agen.aclose()                         # run the generator's finally now, not at GC
    print("got", got)

asyncio.run(main())
