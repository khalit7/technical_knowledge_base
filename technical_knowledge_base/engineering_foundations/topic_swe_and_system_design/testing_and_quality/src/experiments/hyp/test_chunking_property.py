from hypothesis import given, strategies as st
from chunking import chunk, unchunk

@st.composite
def chunk_args(draw):
    size = draw(st.integers(min_value=1, max_value=50))
    overlap = draw(st.integers(min_value=0, max_value=size - 1))
    return size, overlap

@given(text=st.text(), args=chunk_args())
def test_round_trip_loses_nothing(text, args):
    size, overlap = args
    assert unchunk(chunk(text, size, overlap), overlap) == text
