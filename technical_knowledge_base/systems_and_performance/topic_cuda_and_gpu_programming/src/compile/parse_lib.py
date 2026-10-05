# Parsers for the compiler outputs (ptxas -v, PTX with .loc, nvdisasm -g -c).
import re

def parse_ptxas(txt, func=None):
    """Return dict of resources for the (first or named) function, or None."""
    res = {}
    cur = None
    for line in txt.splitlines():
        m = re.search(r"Compiling entry function '([^']+)' for '([^']+)'", line)
        if m:
            cur = m.group(1)
            continue
        if func and cur != func:
            continue
        m = re.search(r"Function properties for (\S+)", line)
        if m:
            cur = m.group(1)
            continue
        m = re.search(r"(\d+) bytes stack frame, (\d+) bytes spill stores, (\d+) bytes spill loads", line)
        if m and cur:
            r = res.setdefault(cur, {})
            r["stack"], r["spillSt"], r["spillLd"] = map(int, m.groups())
        m = re.search(r"Used (\d+) registers", line)
        if m and cur:
            r = res.setdefault(cur, {})
            r["regs"] = int(m.group(1))
            ms = re.search(r"(\d+) bytes smem", line)
            r["smem"] = int(ms.group(1)) if ms else 0
            mc = re.search(r"(\d+) bytes cmem\[0\]", line)
            r["cmem0"] = int(mc.group(1)) if mc else 0
            mb = re.search(r"used (\d+) barriers", line)
            r["barriers"] = int(mb.group(1)) if mb else 0
    return res


def parse_ptx(txt, fileidx=None):
    """Lines of the PTX body for each .entry, each with the source lines (direct and inlined-at) from .loc."""
    out = {}
    cur = None
    cur_lines = []
    loc = []
    depth = 0
    header = []
    for line in txt.splitlines():
        if cur is None:
            m = re.match(r"\s*\.visible \.entry (\w+)\(", line) or re.match(r"\s*\.entry (\w+)\(", line)
            if m:
                cur = m.group(1)
                cur_lines = [[line.rstrip(), []]]
                depth = 0
                continue
            if line.startswith(".version") or line.startswith(".target") or line.startswith(".address_size"):
                header.append(line.strip())
            continue
        s = line.rstrip()
        m = re.match(r"\s*\.loc\s+(\d+)\s+(\d+)\s+(\d+)(.*)", s)
        if m:
            loc = [int(m.group(2))]
            mi = re.search(r"inlined_at\s+(\d+)\s+(\d+)\s+(\d+)", m.group(4))
            if mi:
                loc.append(int(mi.group(2)))
            continue
        if re.match(r"\s*(\$L__func_begin|\$L__tmp|\$L__func_end)\d*:", s):
            continue
        cur_lines.append([s, [l for l in loc if l > 0]])
        depth += s.count("{") - s.count("}")
        if s.strip() == "}" and depth <= 0:
            out[cur] = cur_lines
            cur = None
    return header, out


def parse_sass_lines(txt):
    """nvdisasm -g -c: per function, list of [instruction text, [source lines]]."""
    out = {}
    cur = None
    loc = []
    for line in txt.splitlines():
        m = re.match(r"\s*\.text\.(\w+):", line)
        if m:
            cur = m.group(1)
            out[cur] = []
            loc = []
            continue
        m = re.search(r'//## File "[^"]*", line (\d+)(?: inlined at "[^"]*", line (\d+))?', line)
        if m:
            loc = [int(m.group(1))] + ([int(m.group(2))] if m.group(2) else [])
            continue
        m = re.match(r"\s*/\*([0-9a-f]{4,})\*/\s+(.*?)\s*;?\s*(/\*.*\*/)?\s*$", line)
        if m and cur:
            ins = m.group(2).strip().rstrip(";").strip()
            ins = re.sub(r"\s+", " ", ins)
            out[cur].append([ins, list(loc)])
            continue
        m = re.match(r"\s*\.(L_x_\d+):", line)
        if m and cur:
            out[cur].append([m.group(1) + ":", []])
    return out


def strip_padding(lines):
    """Drop the self-branch and NOP padding after the last EXIT."""
    last = max((i for i, l in enumerate(lines) if l[0].startswith("EXIT") or " EXIT" in l[0]), default=len(lines) - 1)
    tail = lines[last + 1:]
    keep = []
    for l in tail:
        t = l[0]
        if t.startswith("NOP") or re.match(r"BRA `?\(?\.L_x_\d+\)?", t) or re.match(r"\.L_x_\d+:", t):
            continue
        keep.append(l)
    return lines[: last + 1] + keep
