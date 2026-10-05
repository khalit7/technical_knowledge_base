import asyncio

async def worker(name):
    try:
        print(f"{name}: working")
        await asyncio.sleep(10)
    except asyncio.CancelledError:
        print(f"{name}: cancelled, cleaning up")
        raise                                   # always re-raise CancelledError
    finally:
        print(f"{name}: finally")

async def swallower():
    try:
        await asyncio.sleep(10)
    except asyncio.CancelledError:
        print("swallower: caught CancelledError and returned (a bug)")
        return "pretends to have finished"

async def main():
    t = asyncio.create_task(worker("w1"))
    await asyncio.sleep(0.01)                   # let it start
    t.cancel()                                  # request: CancelledError is raised at its await
    try:
        await t
    except asyncio.CancelledError:
        print("main: w1 is cancelled:", t.cancelled())

    s = asyncio.create_task(swallower())
    await asyncio.sleep(0.01)
    s.cancel()
    print("main: swallower result:", await s, "| cancelled():", s.cancelled())

    try:
        async with asyncio.timeout(0.05):       # a timeout is a cancellation plus a TimeoutError
            await worker("w2")
    except TimeoutError:
        print("main: w2 timed out")

asyncio.run(main())
