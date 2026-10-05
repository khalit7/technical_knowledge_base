import asyncio

async def call(name, fail):
    await asyncio.sleep(0.01)
    if fail:
        raise fail(f"{name} failed")
    return name

async def main():
    try:
        async with asyncio.TaskGroup() as tg:            # 3.11+: structured concurrency
            tg.create_task(call("search", None))
            tg.create_task(call("rerank", TimeoutError))
            tg.create_task(call("embed", ValueError))
    except* TimeoutError as eg:                          # handles the TimeoutError part
        print("timeouts:", [str(e) for e in eg.exceptions])
    except* ValueError as eg:                            # and, separately, the ValueError part
        print("bad values:", [str(e) for e in eg.exceptions])

asyncio.run(main())

eg = ExceptionGroup("batch failed", [KeyError("a"), ValueError("b"), KeyError("c")])
match, rest = eg.split(KeyError)
print(repr(match), repr(rest), sep="\n")

try:
    try:
        {}["model"]
    except KeyError as e:
        e.add_note("while reading config.yaml, section 'llm'")   # 3.11+
        raise
except KeyError as e:
    print(repr(e), e.__notes__)
