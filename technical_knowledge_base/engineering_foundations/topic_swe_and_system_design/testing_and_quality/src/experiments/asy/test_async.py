import asyncio
import pytest

async def first_token(stream, timeout):
    """Wait for the first token of a streamed reply, give up after `timeout` seconds."""
    return await asyncio.wait_for(anext(stream), timeout)

async def slow_stream(delay):
    await asyncio.sleep(delay)
    yield "Hello"

async def test_no_marker():                       # forgot the marker
    assert await first_token(slow_stream(0), 1) == "WRONG"

@pytest.mark.asyncio
async def test_first_token_arrives():
    assert await first_token(slow_stream(0.01), timeout=1) == "Hello"

@pytest.mark.asyncio
async def test_slow_model_times_out():
    with pytest.raises(TimeoutError):
        await first_token(slow_stream(10), timeout=0.05)
