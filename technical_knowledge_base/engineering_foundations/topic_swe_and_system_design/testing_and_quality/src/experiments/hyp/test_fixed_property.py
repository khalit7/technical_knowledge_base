from hypothesis import given, settings, strategies as st
import chunking_fixed as cf
from test_chunking_property import chunk_args

@settings(max_examples=5000)
@given(text=st.text(), args=chunk_args())
def test_round_trip_fixed(text, args):
    size, overlap = args
    assert cf.unchunk(cf.chunk(text, size, overlap), overlap) == text

def test_examples_fixed():
    assert cf.chunk("abcdefghij", 4, 1) == ["abcd", "defg", "ghij"]
    assert cf.chunk("abcdef", 2, 0) == ["ab", "cd", "ef"]
