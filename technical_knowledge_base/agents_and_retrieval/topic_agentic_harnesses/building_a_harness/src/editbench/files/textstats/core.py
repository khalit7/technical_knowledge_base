import re
from collections import Counter


def tokenize(text):
    """Split text into lowercase words. Apostrophes inside words are kept."""
    return re.findall(r"[a-z]+", text.lower())


def word_count(text):
    return len(tokenize(text))


def top_words(text, n=3):
    """Return the n most common words as (word, count), ties broken alphabetically."""
    counts = Counter(tokenize(text))
    return sorted(counts.items(), key=lambda kv: -kv[1])[:n]
