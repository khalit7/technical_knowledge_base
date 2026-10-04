import pandas as pd
import pandas.testing as pdt

def clean_chats(df: pd.DataFrame) -> pd.DataFrame:
    """Prepare chat logs for analysis: drop duplicate chat ids (keep the latest), strip whitespace, drop empty messages."""
    out = (df.sort_values("ts").drop_duplicates("chat_id", keep="last")
             .assign(text=lambda d: d["text"].str.strip()))
    return out[out["text"] != ""].sort_values("chat_id").reset_index(drop=True)

def test_keeps_latest_duplicate_and_drops_blank():
    df = pd.DataFrame({"chat_id": ["a", "a", "b", "c"], "ts": [1, 2, 1, 1],
                       "text": ["old", " new ", "hi", "   "]})
    want = pd.DataFrame({"chat_id": ["a", "b"], "ts": [2, 1], "text": ["new", "hi"]})
    pdt.assert_frame_equal(clean_chats(df), want)

def test_empty_frame_stays_empty_with_same_columns():
    df = pd.DataFrame({"chat_id": pd.Series(dtype=str), "ts": pd.Series(dtype=int), "text": pd.Series(dtype=str)})
    out = clean_chats(df)
    assert out.empty and list(out.columns) == ["chat_id", "ts", "text"]

def test_never_adds_rows_or_nulls():
    df = pd.DataFrame({"chat_id": ["x", "y"], "ts": [5, 6], "text": ["é", "你好"]})
    out = clean_chats(df)
    assert len(out) <= len(df) and not out.isna().any().any()
