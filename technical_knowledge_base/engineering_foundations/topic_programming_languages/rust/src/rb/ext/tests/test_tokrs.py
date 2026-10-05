"""pytest for the extension: the Rust results must equal the Python reference, and errors must be Python exceptions."""
import json
import pathlib
import threading

import numpy as np
import pytest
import tokrs

# the root page's 2,000-line log (rosetta/data/chat.jsonl), committed in the repository
CHAT = pathlib.Path(__file__).parents[5] / "src" / "rosetta" / "data" / "chat.jsonl"


def py_tokens(text):
    n, inside = 0, False
    for ch in text:
        t = ch.isascii() and ch.isalnum()
        n += t and not inside
        inside = t
    return n


@pytest.mark.parametrize("text, want", [("x86_64", 2), ("café", 1), ("日本語", 0), ("v2.1", 2), ("C++", 1), ("", 0)])
def test_rule3_examples(text, want):
    assert tokrs.count_tokens(text) == want == py_tokens(text)


def test_matches_python_on_every_message():
    texts = []
    for line in CHAT.read_text(encoding="utf-8").splitlines():
        try:
            rec = json.loads(line)
        except ValueError:
            continue
        if isinstance(rec, dict) and isinstance(rec.get("text"), str):
            texts.append(rec["text"])
    assert tokrs.count_many(texts) == [py_tokens(t) for t in texts]


def test_whole_file_matches_program_md():
    lines, ok, bad, first_bad, per_user = tokrs.tally_file(CHAT)
    assert (lines, ok, bad, first_bad) == (2000, 1992, 8, 53)
    assert sum(per_user.values()) == 44698 and per_user["u0029"] == 9491


@pytest.mark.parametrize("threads", [1, 2, 3, 8, 64])
def test_parallel_split_is_exact(threads):
    data = CHAT.read_bytes()
    assert tokrs.tally_bytes_parallel(data, threads) == tokrs.tally_bytes(data)


def test_errors_are_python_exceptions():
    with pytest.raises(tokrs.MalformedLine, match="expected a string"):
        tokrs.parse_line('{"user": 17, "text": "hi"}')
    with pytest.raises(FileNotFoundError):
        tokrs.tally_file("no/such/file.jsonl")
    with pytest.raises(TypeError):
        tokrs.count_tokens(5)


def test_numpy_zero_copy_and_dtype():
    a = np.linspace(0, 1, 101)
    assert tokrs.sum_sq_array(a) == pytest.approx(float(a @ a))
    with pytest.raises(TypeError):
        tokrs.sum_sq_array(a.astype(np.float32))


def test_threads_share_nothing():
    data = CHAT.read_bytes()
    want = tokrs.tally_bytes(data)
    got = []
    ts = [threading.Thread(target=lambda: got.append(tokrs.tally_bytes_detached(data))) for _ in range(8)]
    for t in ts:
        t.start()
    for t in ts:
        t.join()
    assert got == [want] * 8
