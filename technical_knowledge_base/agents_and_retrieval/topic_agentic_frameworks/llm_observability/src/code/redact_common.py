"""Redaction used before anything enters the repository. Machine-specific strings (home directory, the working
folders, login name, git identity, any e-mail address except the page's fake example ones) are found at run time,
so this file contains none of them."""
import getpass, os, re, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
WORKROOT = os.path.dirname(HERE)            # the experiment folder: replaced by /work
HOME = os.path.expanduser("~")
LOGIN = getpass.getuser()


def _git(k):
    try:
        return subprocess.run(["git", "config", "--global", k], capture_output=True, text=True).stdout.strip()
    except Exception:
        return ""


GIT = [x for x in (_git("user.name"), _git("user.email")) if x]
ALLOWED_EMAILS = {"dana.reyes@example.com", "user@example.invalid", "demo@example.invalid"}
EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")


def scrub(t):
    t = t.replace(WORKROOT, "/work").replace(os.path.realpath(WORKROOT), "/work")
    t = re.sub(r"/private/tmp/claude-[0-9]+/[^/\s\"']+/[0-9a-f-]+/scratchpad/agents/fobs", "/work", t)
    t = t.replace(HOME, "/home/user")
    for g in GIT:
        t = re.sub(re.escape(g), "user", t, flags=re.I)
    t = EMAIL.sub(lambda m: m.group(0) if m.group(0) in ALLOWED_EMAILS else "user@example.invalid", t)
    t = re.sub(re.escape(LOGIN), "user", t, flags=re.I)
    return t.replace("—", ", ")


def leaks(t):
    bad = ["U" + "sers/", "U" + "sers-", LOGIN, "gl" + "pat", "sk-" + "ant", HOME] + GIT
    found = [b for b in bad if b and b.lower() in t.lower()]
    found += [e for e in EMAIL.findall(t) if e not in ALLOWED_EMAILS]
    return found
