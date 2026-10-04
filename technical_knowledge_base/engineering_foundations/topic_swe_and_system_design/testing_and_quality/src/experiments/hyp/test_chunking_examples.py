from chunking import chunk, unchunk

def test_splits_into_overlapping_windows():
    assert chunk("abcdefghij", size=4, overlap=1) == ["abcd", "defg", "ghij"]

def test_no_overlap():
    assert chunk("abcdef", size=2, overlap=0) == ["ab", "cd", "ef"]

def test_round_trip():
    text = "the quick brown fox jumps over the lazy dog!!"   # 45 characters
    assert unchunk(chunk(text, size=10, overlap=5), overlap=5) == text
