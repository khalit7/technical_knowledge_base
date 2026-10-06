"""The four tool bodies, shared by all six agents so only the framework differs.
Every tool works on the current directory (a fresh copy of the task repo)."""
import os, subprocess

TASK = "The tests in this repository fail. Find out why and fix the code so they pass. Do not edit the tests."
SYSTEM = ("You are a coding agent working in a small Python repository. "
          "Use the tools to look at files, edit code and run the tests. "
          "When the tests pass, reply with one sentence saying what you changed.")


def list_files() -> str:
    """List every file in the repository."""
    out = []
    for root, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if not d.startswith((".", "__"))]
        out += [os.path.join(root, f)[2:] for f in files if not f.endswith(".pyc")]
    return "\n".join(sorted(out))


def read_file(path: str) -> str:
    """Return the text of one file."""
    try:
        return open(path).read()[:20000]
    except OSError as e:
        return f"error: {e}"


def edit_file(path: str, old: str, new: str) -> str:
    """Replace the exact text `old` with `new` in a file; `old` must occur exactly once."""
    try:
        text = open(path).read()
    except OSError as e:
        return f"error: {e}"
    n = text.count(old)
    if n != 1:
        return f"error: old text found {n} times in {path}; it must match exactly once"
    open(path, "w").write(text.replace(old, new))
    return f"edited {path}"


def run_tests() -> str:
    """Run the test suite and return its output."""
    p = subprocess.run(["python3", "tests/test_core.py"], capture_output=True, text=True, timeout=60)
    return (p.stdout + p.stderr)[-4000:] + f"\nexit code {p.returncode}"


def record(message):
    """Append one Claude Agent SDK message to $SDK_LOG as JSON (recording only)."""
    import dataclasses, json
    path = os.environ.get("SDK_LOG")
    if path:
        d = dataclasses.asdict(message) if dataclasses.is_dataclass(message) else {"repr": repr(message)}
        d["_type"] = type(message).__name__
        with open(path, "a") as f:
            f.write(json.dumps(d, default=str) + "\n")
