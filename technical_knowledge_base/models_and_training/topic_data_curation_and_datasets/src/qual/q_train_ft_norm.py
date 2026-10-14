"""Text normalisation for our own fastText classifier (shared by q_train_ft.py and q_make_data.py)."""
import re

TOK = re.compile(r"\w+|[^\w\s]")


def norm(t):
    return " ".join(TOK.findall(" ".join(t.strip().splitlines()).lower()))
