"""One rollout's environment: a workspace directory plus a container (no network) that runs commands."""
import os, subprocess, uuid

IMAGE = "python:3.13-slim"
MAX_OUT = 3000


def clip(s, n=MAX_OUT):
    if len(s) <= n:
        return s
    h = n // 2
    return s[:h] + f"\n[... {len(s) - n} characters cut ...]\n" + s[-h:]


class Env:
    def __init__(self, ws):
        self.ws = os.path.abspath(ws)
        self.name = "htrain-r-" + uuid.uuid4().hex[:8]
        subprocess.run(["docker", "run", "-d", "--rm", "--name", self.name, "--network", "none",
                        "--memory", "512m", "-v", self.ws + ":/work", "-w", "/work",
                        "-e", "PYTHONDONTWRITEBYTECODE=1", IMAGE, "sleep", "3600"],
                       check=True, capture_output=True)

    def sh(self, cmd, timeout=30):
        try:
            p = subprocess.run(["docker", "exec", self.name, "bash", "-c", cmd],
                               capture_output=True, text=True, timeout=timeout)
            out = (p.stdout + p.stderr)
            return clip(out) + f"\n[exit code {p.returncode}]", p.returncode
        except subprocess.TimeoutExpired:
            return f"[command timed out after {timeout} s]", 124

    def close(self):
        subprocess.run(["docker", "rm", "-f", self.name], capture_output=True)

    # file tools for the "tools" harness: paths are relative to the repository root
    def _path(self, p):
        p = p.lstrip("/")
        if p.startswith("work/"):
            p = p[5:]
        full = os.path.normpath(os.path.join(self.ws, p))
        if not full.startswith(self.ws):
            raise ValueError("path outside the repository")
        return full

    def list_files(self):
        out = []
        for root, dirs, files in os.walk(self.ws):
            dirs[:] = [d for d in dirs if not d.startswith((".", "__"))]
            out += [os.path.relpath(os.path.join(root, f), self.ws) for f in files if not f.endswith(".pyc")]
        return "\n".join(sorted(out))

    def read_file(self, path, numbers=True):
        try:
            lines = open(self._path(path)).read().splitlines()
        except Exception as e:
            return f"error: {e}"
        if not numbers:
            return clip("\n".join(lines))
        return clip("\n".join(f"{i + 1:4d}  {l}" for i, l in enumerate(lines)))

    def replace(self, path, old, new, hint=True):
        try:
            full = self._path(path)
            text = open(full).read()
        except Exception as e:
            return f"error: {e}"
        n = text.count(old) if old else 0
        if n != 1:
            return f"error: old text found {n} times in {path}; it must match exactly once" + (" (copy it from read_file, without the line numbers)" if hint else "")
        open(full, "w").write(text.replace(old, new))
        return f"edited {path}: replaced {len(old.splitlines()) or 1} line(s)"

    def run_tests(self):
        out, _ = self.sh("python3 tests/test_core.py", timeout=60)
        return out
