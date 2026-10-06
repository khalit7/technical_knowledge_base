"""Hidden verifier tests for textstats-gym. Usage: python3 hidden_tests.py /path/to/workspace
Copies only textstats/ from the workspace (the workspace's own tests are ignored), runs every
check with a time limit, prints one JSON object {test name: true/false}."""
import json, os, shutil, subprocess, sys, tempfile

ws = sys.argv[1]
tmp = tempfile.mkdtemp()
shutil.copytree(os.path.join(ws, "textstats"), os.path.join(tmp, "textstats"),
                ignore=shutil.ignore_patterns("__pycache__"))
sys.path.insert(0, tmp)

# (name, area, expression that must be True). v_ = the visible test, h_ = held out.
CHECKS = [
 ("v_word_count_simple", "base", "word_count('the cat sat') == 3"),
 ("v_apostrophes_kept", "apos", "word_count(\"don't stop\") == 2"),
 ("h_apos_many", "apos", "word_count(\"rock'n'roll isn't dead\") == 3"),
 ("h_apos_quotes", "apos", "tokenize(\"'quoted' it's\") == ['quoted', \"it's\"]"),
 ("v_top_words_ties_alphabetical", "ties", "top_words('b a b a c', n=2) == [('a', 2), ('b', 2)]"),
 ("h_ties_three", "ties", "top_words('c c b b a a', n=3) == [('a', 2), ('b', 2), ('c', 2)]"),
 ("h_ties_count_first", "ties", "top_words('x y y', n=1) == [('y', 2)]"),
 ("v_top_words_n", "topn", "len(top_words('a b c d e', n=4)) == 4"),
 ("h_topn_short", "topn", "len(top_words('a b', n=5)) == 2 and len(top_words('a b', n=1)) == 1"),
 ("v_sentence_count", "sent", "sentence_count('Hi. Bye.') == 2"),
 ("h_sent_mixed", "sent", "sentence_count('Wait... what?!') == 2 and sentence_count('no end') == 1"),
 ("h_sent_empty", "sent", "sentence_count('') == 0"),
 ("v_mean_word_length", "intdiv", "mean_word_length('a abcd') == 2.5"),
 ("h_mean_more", "intdiv", "mean_word_length('a bb') == 1.5 and mean_word_length('hello') == 5.0"),
 ("v_mean_word_length_empty", "empty", "mean_word_length('') == 0.0"),
 ("h_mean_blank", "empty", "mean_word_length('   !!! ') == 0.0"),
 ("v_char_histogram_case", "case", "char_histogram('Aa b!') == {'a': 2, 'b': 1}"),
 ("h_case_more", "case", "char_histogram('ABC abc 123') == {'a': 2, 'b': 2, 'c': 2} and char_histogram('') == {}"),
 ("v_cli", "cli", "cli('one two\\nthree\\n')[0] == 'words: 3'"),
 ("h_cli_top", "cli", "cli('b a\\nb a\\nc\\n') == ['words: 5', 'top: a=2, b=2, c=1']"),
]


def cli(text):
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as f:
        f.write(text)
    p = subprocess.run([sys.executable, "-m", "textstats", f.name], cwd=tmp,
                       capture_output=True, text=True, timeout=20)
    return p.stdout.strip().splitlines()


res = {}
try:
    import textstats
    env = dict(vars(textstats), cli=cli)
except Exception as e:                       # the package does not even import
    env = None
for name, area, expr in CHECKS:
    ok = False
    if env is not None:
        try:
            ok = bool(eval(expr, env))
        except Exception:
            ok = False
    res[name] = ok
print(json.dumps({"results": res, "areas": {n: a for n, a, _ in CHECKS}}))
