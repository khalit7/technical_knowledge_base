import re
from collections import Counter

WORD_RE = re.compile(r"[a-z]+(?:'[a-z]+)*")


def tokenize(text):
    """Split text into lowercase words. Apostrophes inside words are kept."""
    return WORD_RE.findall(text.lower())


def word_count(text):
    return len(tokenize(text))


def top_words(text, n=3):
    """Return the n most common words as (word, count), ties broken alphabetically."""
    counts = Counter(tokenize(text))
    return sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:n]


def sentence_count(text):
    """Count sentences. A sentence ends with . ! or ?; trailing text without one also counts."""
    parts = [p for p in re.split(r"[.!?]+", text) if p.strip()]
    return len(parts)


def mean_word_length(text):
    """Average number of letters per word; 0.0 when the text has no words."""
    words = tokenize(text)
    if not words:
        return 0.0
    return sum(len(w) for w in words) / len(words)


def char_histogram(text):
    """Count the letters a to z, case-insensitively; everything else is ignored."""
    return dict(Counter(c for c in text.lower() if "a" <= c <= "z"))
