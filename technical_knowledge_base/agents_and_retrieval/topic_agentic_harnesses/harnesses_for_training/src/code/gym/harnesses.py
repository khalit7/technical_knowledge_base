"""Two harness definitions shared by every model backend: same task text, a system prompt, tools."""

SYS_BASH = ("You are a coding agent fixing a bug in a small Python repository at /work. "
            "You have one tool, bash, which runs a shell command in the repository and returns its output. "
            "Look at the code, make the fix with shell commands (for example python3 or sed), and run the tests. "
            "When the tests pass, stop calling tools and reply with one sentence saying what you changed. Never use the em-dash character.")

SYS_TOOLS = ("You are a coding agent fixing a bug in a small Python repository. "
             "Use the tools to list and read files, edit code by exact text replacement, and run the tests. "
             "When the tests pass, stop calling tools and reply with one sentence saying what you changed. Never use the em-dash character.")


def fn(name, desc, props, req):
    return {"type": "function", "function": {"name": name, "description": desc,
            "parameters": {"type": "object", "properties": props, "required": req}}}


S = {"type": "string"}
TOOLS_BASH = [fn("bash", "Run a shell command in the repository (working directory /work) and return its output and exit code. No network.",
                 {"command": S}, ["command"])]
TOOLS_TOOLS = [
    fn("list_files", "List every file in the repository.", {}, []),
    fn("read_file", "Return a file's text with line numbers (the numbers are not part of the file).", {"path": S}, ["path"]),
    fn("replace", "Replace the exact text old with new in a file. old must occur exactly once; copy it from read_file without the line numbers.",
       {"path": S, "old": S, "new": S}, ["path", "old", "new"]),
    fn("run_tests", "Run the test suite (python3 tests/test_core.py) and return its output.", {}, []),
]

# "plain": identical to "tools" except that read_file returns the file without line numbers
TOOLS_PLAIN = [
    TOOLS_TOOLS[0],
    fn("read_file", "Return a file's text.", {"path": S}, ["path"]),
    fn("replace", "Replace the exact text old with new in a file. old must occur exactly once; copy it from read_file.",
       {"path": S, "old": S, "new": S}, ["path", "old", "new"]),
    TOOLS_TOOLS[3],
]

HARNESS = {"bash": (SYS_BASH, TOOLS_BASH), "tools": (SYS_TOOLS, TOOLS_TOOLS), "plain": (SYS_TOOLS, TOOLS_PLAIN)}


def execute(env, name, args, plain=False):
    """Run one tool call against the environment. Returns the text the model will see."""
    try:
        if name == "bash":
            return env.sh(args["command"])[0]
        if name == "list_files":
            return env.list_files()
        if name == "read_file":
            return env.read_file(args["path"], numbers=not plain)
        if name == "replace":
            return env.replace(args["path"], args["old"], args["new"], hint=not plain)
        if name == "run_tests":
            return env.run_tests()
        return f"error: unknown tool {name}"
    except KeyError as e:
        return f"error: missing argument {e}"
    except Exception as e:
        return f"error: {type(e).__name__}: {e}"
