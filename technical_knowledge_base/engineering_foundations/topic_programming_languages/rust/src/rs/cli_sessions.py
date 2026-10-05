"""The CLI replay tab's script: recorded sessions of tokcount (out/cli_*.txt), in order,
each with a predict-the-exit-code question. Used by gen.py."""
import re

STEPS = [
    ("cli_count", "The happy path: the root page's chat log.", "0 means success; the report matches the root page's reference output byte for byte."),
    ("cli_help", "Ask for help. Who wrote this text?", "clap generated all of it from the struct and its doc comments; --help exits 0."),
    ("cli_missing", "Forget the file argument.", "A usage error: clap prints what is missing, a usage line, and exits 2 before your code runs."),
    ("cli_bad_n", "Ask for the top 0 users.", "value_parser!(u16).range(1..=1000) rejects it at parse time, again exit 2."),
    ("cli_typo", "Mistype the subcommand.", "Unknown subcommand: exit 2."),
    ("cli_nofile", "A file that does not exist.", "This one reaches our code: anyhow's context(\"cannot open ...\") wraps the OS error, main prints it and returns ExitCode 1."),
    ("cli_strict", "--strict on a log with 8 malformed lines.", "Our own exit code: 3 tells a calling script \"it ran, but the data was dirty\"."),
    ("cli_stdin_json", "Read stdin (\"-\") and print JSON.", "serde_json::to_string_pretty of the same Report struct the service returns."),
    ("cli_text", "The other subcommand.", "x86, 64, and, v2, 1: five tokens under the root page's rules."),
    ("cli_pipe_naive", "A naive program printing 100,000 lines with println!, piped to head -1.", "head exits after one line; the next println! fails with EPIPE and println! panics: exit 101, a backtrace hint on stderr."),
    ("cli_pipe_ok", "tokcount piped to head -1.", "tokcount writes through a locked stdout and treats BrokenPipe as success: exit 0, no noise."),
]


def sessions(read_out):
    out = []
    for name, title, why in STEPS:
        t = read_out(name).rstrip("\n").split("\n")
        cmd = t[0][2:] if t[0].startswith("$ ") else ""
        body = [l for l in t[1:] if not l.startswith("[exit ")]
        codes = [int(m.group(1)) for l in t for m in [re.match(r"\[exit (\d+)\]", l)] if m]
        side = [int(m.group(1)) for l in t for m in [re.match(r"\[left side exit (\d+)\]", l)] if m]
        code = side[0] if side else (codes[-1] if codes else 0)
        out.append({"id": name, "title": title, "why": why, "cmd": cmd,
                    "out": "\n".join(l for l in body if not l.startswith("[left side exit")), "code": code})
    return out
