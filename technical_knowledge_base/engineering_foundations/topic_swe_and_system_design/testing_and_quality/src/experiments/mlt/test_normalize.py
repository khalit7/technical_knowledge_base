import numpy as np
import hypothesis.extra.numpy as hnp
from hypothesis import given, strategies as st

def normalize(x):
    """Min-max scale a feature column to [0, 1]."""
    return (x - x.min()) / (x.max() - x.min())

@given(hnp.arrays(dtype=np.float32, shape=st.integers(1, 1000)))
def test_normalize_bounds(x):          # the old page's example, run as written
    out = normalize(x)
    assert out.shape == x.shape
    assert not np.isnan(out).any()

@given(hnp.arrays(dtype=np.float32, shape=st.integers(1, 1000),
                  elements=st.floats(-1e6, 1e6, width=32)))
def test_normalize_bounds_finite(x):   # finite inputs only: what is left is the real bug
    out = normalize(x)
    assert not np.isnan(out).any()
