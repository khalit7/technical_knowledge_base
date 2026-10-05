import asyncio
async def count_tokens(text: str) -> int:
    return len(text.split())
async def main():
    n = count_tokens("one two three")       # forgot await
    print(n, flush=True)
asyncio.run(main())
