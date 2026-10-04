"""Two more Review lab checks (run from this folder, about 15 s):
  uv run --no-project --python 3.12 --with pydantic --with httpx --with pytest --with mypy python proofs2.py
Adds r3_bool_flag (mypy on the diff) and r11_good_pr (the proposed test) to ../inputs/review_proofs.json."""
import json, pathlib, shutil, subprocess, sys, tempfile
HERE = pathlib.Path(__file__).parent
LLM = HERE.parent / "llmcall"
src = (LLM / "after.py").read_text()
out = json.loads((HERE.parent / "inputs" / "review_proofs.json").read_text())

def patch(s, old, new):
    assert s.count(old) == 1, old
    return s.replace(old, new)

r3 = patch(src, "def summarize_chat(chat_id: str, *, store: ChatStore, model: ChatModel) -> Summary:\n",
           "def summarize_chat(chat_id: str, store: ChatStore, model: ChatModel, force: bool = False) -> Summary:\n")
r3 = patch(r3, "    summary = parse_summary(model.complete(SYSTEM, render_transcript(messages)))\n",
           "    if not force and (cached := store.cached_summary(chat_id)):\n        return cached\n"
           "    summary = parse_summary(model.complete(SYSTEM, render_transcript(messages)))\n")
d = pathlib.Path(tempfile.mkdtemp())
(d / "after.py").write_text(r3)
m = subprocess.run([sys.executable, "-m", "mypy", "--strict", "--ignore-missing-imports", "after.py"], cwd=d, capture_output=True, text=True).stdout
out["r3_bool_flag"] = {"mypy": [l.split(": error: ")[1] for l in m.splitlines() if ": error: " in l]}

r11 = patch(src, '    text = "".join(f"{SPEAKER[m.role]}: {m.content}\\n" for m in messages if m.role in SPEAKER)\n',
            '    text = "".join(f"{SPEAKER[m.role]}: {m.content}\\n" for m in messages\n'
            '                   if m.role in SPEAKER and m.content.strip())\n')
test = (LLM / "test_after.py").read_text() + '''

def test_transcript_skips_empty_messages():
    assert render_transcript([Message("user", "  "), *CHAT]) == render_transcript(CHAT)
'''
d2 = pathlib.Path(tempfile.mkdtemp())
(d2 / "after.py").write_text(src); (d2 / "test_after.py").write_text(test)
before = subprocess.run([sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider", "test_after.py"], cwd=d2, capture_output=True, text=True).stdout.strip().splitlines()[-1]
(d2 / "after.py").write_text(r11)
after = subprocess.run([sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider", "test_after.py"], cwd=d2, capture_output=True, text=True).stdout.strip().splitlines()[-1]
out["r11_good_pr"] = {"new_test_on_old_code": before, "with_the_change": after}
shutil.rmtree(d); shutil.rmtree(d2)
(HERE.parent / "inputs" / "review_proofs.json").write_text(json.dumps(out, indent=1))
print(json.dumps({k: out[k] for k in ("r3_bool_flag", "r11_good_pr")}, indent=1))
