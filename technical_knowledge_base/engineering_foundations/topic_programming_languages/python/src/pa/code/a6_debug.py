import asyncio, time

async def handler():
    time.sleep(0.2)                    # a blocking call hiding in async code
    await asyncio.sleep(0)

asyncio.run(handler(), debug=True)     # or PYTHONASYNCIODEBUG=1, or python -X dev
