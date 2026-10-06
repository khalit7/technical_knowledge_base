import os, subprocess, sys, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from textstats import (word_count, top_words, sentence_count, mean_word_length,
                       char_histogram)


def test_word_count_simple():
    assert word_count("the cat sat") == 3


def test_apostrophes_kept():
    assert word_count("don't stop") == 2


def test_top_words_ties_alphabetical():
    assert top_words("b a b a c", n=2) == [("a", 2), ("b", 2)]


def test_top_words_n():
    assert len(top_words("a b c d e", n=4)) == 4


def test_sentence_count():
    assert sentence_count("Hi. Bye.") == 2


def test_mean_word_length():
    assert mean_word_length("a abcd") == 2.5


def test_mean_word_length_empty():
    assert mean_word_length("") == 0.0


def test_char_histogram_case():
    assert char_histogram("Aa b!") == {"a": 2, "b": 1}


def test_cli():
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as f:
        f.write("one two\nthree\n")
    out = subprocess.run([sys.executable, "-m", "textstats", f.name], cwd=ROOT,
                         capture_output=True, text=True).stdout
    os.unlink(f.name)
    assert "words: 3" in out, out


if __name__ == "__main__":
    failed = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print("PASS", name)
            except Exception as e:
                failed += 1
                print("FAIL", name, type(e).__name__, e)
    print(f"{failed} failed")
    sys.exit(1 if failed else 0)
