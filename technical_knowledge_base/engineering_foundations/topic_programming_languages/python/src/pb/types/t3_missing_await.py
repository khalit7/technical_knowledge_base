import asyncio


async def fetch_reply() -> str:
    await asyncio.sleep(0)
    return "hello"


async def main() -> None:
    reply = fetch_reply()
    print(reply.upper())
