"""textstats-gym: tasks = the clean textstats library with planted bugs, an issue statement,
and a hidden verifier (verify.py) that runs in a fresh container with no network."""
import os, shutil, json

HERE = os.path.dirname(os.path.abspath(__file__))
CORE, MAIN = "textstats/core.py", "textstats/__main__.py"

# bug id -> (file, exact text in the clean file, buggy replacement)
BUGS = {
 "apos":   (CORE, "WORD_RE = re.compile(r\"[a-z]+(?:'[a-z]+)*\")", "WORD_RE = re.compile(r\"[a-z]+\")"),
 "ties":   (CORE, "key=lambda kv: (-kv[1], kv[0]))", "key=lambda kv: -kv[1])"),
 "topn":   (CORE, ")[:n]\n", ")[:n - 1]\n"),
 "sent":   (CORE, "parts = [p for p in re.split(r\"[.!?]+\", text) if p.strip()]", "parts = re.split(r\"[.!?]+\", text)"),
 "empty":  (CORE, "    if not words:\n        return 0.0\n", ""),
 "intdiv": (CORE, "/ len(words)", "// len(words)"),
 "case":   (CORE, "c for c in text.lower() if", "c for c in text if"),
 "cli":    (MAIN, "text = f.read()", "text = f.readline()"),
}

SUFFIX = " Fix the code, not the tests. You can run the tests with `python3 tests/test_core.py`."
GENERIC = "The tests in this repository fail. Find out why and fix the code so they pass. Do not edit the tests."

TASKS = {
 "T01": (["apos"], "word_count(\"don't stop\") returns 3 but should return 2: contractions are being split into two words." + SUFFIX),
 "T02": (["ties"], "top_words should break ties alphabetically, but top_words(\"b a b a c\", n=2) returns [('b', 2), ('a', 2)]." + SUFFIX),
 "T03": (["apos", "ties"], GENERIC),
 "T04": (["topn"], "top_words(text, n=4) returns only 3 words even when the text has more than 4 distinct words." + SUFFIX),
 "T05": (["sent"], "sentence_count(\"Hi. Bye.\") returns 3; it should return 2." + SUFFIX),
 "T06": (["empty"], "mean_word_length(\"\") crashes with ZeroDivisionError; it should return 0.0." + SUFFIX),
 "T07": (["intdiv"], "mean_word_length(\"a abcd\") returns 2 instead of 2.5." + SUFFIX),
 "T08": (["case"], "char_histogram ignores capital letters: char_histogram(\"Aa\") returns {'a': 1} instead of {'a': 2}." + SUFFIX),
 "T09": (["cli"], "python3 -m textstats FILE reports the wrong word count for files with more than one line." + SUFFIX),
 "T10": (["sent", "case", "intdiv"], GENERIC),
}


def make_workspace(task_id, dest):
    """Copy the clean repo to dest and plant the task's bugs. Returns the prompt."""
    bugs, prompt = TASKS[task_id]
    if os.path.exists(dest):
        shutil.rmtree(dest)
    shutil.copytree(os.path.join(HERE, "clean"), dest)
    for b in bugs:
        f, old, new = BUGS[b]
        p = os.path.join(dest, f)
        s = open(p).read()
        assert s.count(old) == 1, (task_id, b)
        open(p, "w").write(s.replace(old, new))
    return prompt


if __name__ == "__main__":
    print(json.dumps({k: {"bugs": v[0], "prompt": v[1]} for k, v in TASKS.items()}, indent=1))
