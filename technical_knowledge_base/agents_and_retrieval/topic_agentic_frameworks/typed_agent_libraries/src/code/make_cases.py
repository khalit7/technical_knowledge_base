"""Write ten small buggy modules with one failing unittest each, run them for real, and save
cases.json: code, the real test output, and the ground truth (function, category, failing test).
The modules are written for this page (illustrative); the outputs are real runs of python3 -m unittest."""
import json, os, subprocess, tempfile, textwrap, re

CASES = [
 ("tokenize", "regex", "test_apostrophes_kept", '''
import re

def tokenize(text):
    """Split text into lowercase words. Apostrophes inside words are kept."""
    return re.findall(r"[a-z]+", text.lower())
''', '''
    def test_apostrophes_kept(self):
        self.assertEqual(tokenize("don't stop"), ["don't", "stop"])
'''),
 ("top_words", "sort_order", "test_ties_alphabetical", '''
from collections import Counter

def top_words(words, n=3):
    """The n most common words as (word, count), ties broken alphabetically."""
    counts = Counter(words)
    return sorted(counts.items(), key=lambda kv: -kv[1])[:n]
''', '''
    def test_ties_alphabetical(self):
        self.assertEqual(top_words(["b", "a", "b", "a", "c"], n=2), [("a", 2), ("b", 2)])
'''),
 ("paginate", "off_by_one", "test_second_page", '''
def paginate(items, page, size):
    """Items on a zero-based page of the given size."""
    start = page * size
    return items[start:start + size + 1]
''', '''
    def test_second_page(self):
        self.assertEqual(paginate(list(range(10)), 1, 3), [3, 4, 5])
'''),
 ("is_adult", "wrong_operator", "test_eighteen_is_adult", '''
def is_adult(age):
    """True from the 18th birthday on."""
    return age > 18
''', '''
    def test_eighteen_is_adult(self):
        self.assertTrue(is_adult(18))
'''),
 ("parse_price", "unhandled_input", "test_thousands_separator", '''
def parse_price(text):
    """'$1,200.50' -> 1200.5"""
    return float(text.strip().lstrip("$"))
''', '''
    def test_thousands_separator(self):
        self.assertEqual(parse_price("$1,200.50"), 1200.5)
'''),
 ("slugify", "regex", "test_digits_kept", '''
import re

def slugify(title):
    """'Top 10 Tips' -> 'top-10-tips'"""
    return re.sub(r"[^a-z]+", "-", title.lower()).strip("-")
''', '''
    def test_digits_kept(self):
        self.assertEqual(slugify("Top 10 Tips"), "top-10-tips")
'''),
 ("rank_players", "sort_order", "test_highest_first", '''
def rank_players(scores):
    """Player names, highest score first."""
    return [name for name, s in sorted(scores.items(), key=lambda kv: kv[1])]
''', '''
    def test_highest_first(self):
        self.assertEqual(rank_players({"ana": 7, "bo": 9, "cy": 3}), ["bo", "ana", "cy"])
'''),
 ("safe_div", "unhandled_input", "test_divide_by_zero_is_zero", '''
def safe_div(a, b):
    """a / b, or 0.0 when b is 0."""
    return a / b
''', '''
    def test_divide_by_zero_is_zero(self):
        self.assertEqual(safe_div(5, 0), 0.0)
'''),
 ("last_n", "off_by_one", "test_last_two", '''
def last_n(xs, n):
    """The last n items of xs."""
    return xs[-n - 1:]
''', '''
    def test_last_two(self):
        self.assertEqual(last_n([1, 2, 3, 4], 2), [3, 4])
'''),
 ("in_range", "wrong_operator", "test_bounds_inclusive", '''
def in_range(x, lo, hi):
    """True when lo <= x <= hi (both ends included)."""
    return lo < x < hi
''', '''
    def test_bounds_inclusive(self):
        self.assertTrue(in_range(10, 1, 10))
'''),
]

out = []
for fn, cat, test, src, tst in CASES:
    d = tempfile.mkdtemp()
    src = textwrap.dedent(src).lstrip()
    open(os.path.join(d, "mod.py"), "w").write(src)
    t = "import unittest\nfrom mod import *\n\n\nclass T(unittest.TestCase):\n" + textwrap.dedent(tst).replace("\n", "\n    ").rstrip() + "\n\n\nif __name__ == '__main__':\n    unittest.main()\n"
    t = t.replace("class T(unittest.TestCase):\n\n    ", "class T(unittest.TestCase):\n    ")
    open(os.path.join(d, "test_mod.py"), "w").write(t)
    p = subprocess.run(["python3", "-m", "unittest", "test_mod"], cwd=d, capture_output=True, text=True)
    o = (p.stdout + p.stderr).replace(os.path.realpath(d), "/work").replace(d, "/work")
    o = re.sub(r'File "[^"]*/(lib/python3[^"]*)"', r'File "/usr/\1"', o)
    assert p.returncode != 0, fn
    out.append({"id": fn, "function": fn, "category": cat, "failing_test": test,
                "code": src, "test_code": t, "test_output": o.strip()})
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "cases.json"), "w"), indent=1)
print(len(out), "cases"); print(out[4]["test_output"])
