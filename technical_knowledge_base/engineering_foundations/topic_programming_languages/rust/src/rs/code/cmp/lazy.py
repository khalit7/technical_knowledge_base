# Python: calling an async def also builds a coroutine object and runs nothing.
import asyncio

async def hello(tag):
    print(f"   {tag}: body runs")
    return 42

async def main():
    print('1. calling hello("a")')
    co = hello("a")
    print(f"2. holding a {type(co).__name__}; its body has not run")
    print("3. awaited it:", await co)
    hello("b")          # never awaited
    print("4. end of main")

asyncio.run(main())
