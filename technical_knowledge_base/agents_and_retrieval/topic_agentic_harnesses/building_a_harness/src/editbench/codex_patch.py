"""A Python port of Codex's apply_patch for single-file updates, for the edit-format bench.

Ported from openai/codex, codex-rs/apply-patch at commit 8b6bb1c77de0be7395c5c0431ad695a70be829bf
(6 Oct 2026; Apache-2.0): parser.rs (lenient boundaries), streaming_parser.rs (update-hunk lines),
file_update.rs (compute_replacements), seek_sequence.rs (exact, then rstrip, then strip, then
Unicode punctuation folded to ASCII), text_file.rs (line endings kept per line; replaced lines get the
file's first line ending; every line ends with one). Add File and Delete File hunks are parsed but not
needed by the bench. Error strings are Codex's own. Not ported: Move to, environment ids, multi-file.
"""

BEGIN, END = "*** Begin Patch", "*** End Patch"
UPDATE, ADD, DELETE, MOVE, EOFM = "*** Update File: ", "*** Add File: ", "*** Delete File: ", "*** Move to: ", "*** End of File"
UNEXPECTED = ("Unexpected line found in update hunk: '{}'. Every line should start with ' ' (context line), "
              "'+' (added line), or '-' (removed line)")


class PatchError(Exception):
    pass


def _boundaries(lines):
    def strict(ls):
        if not ls or ls[0].strip() != BEGIN:
            raise PatchError("invalid patch: The first line of the patch must be '*** Begin Patch'")
        if ls[-1].strip() != END:
            raise PatchError("invalid patch: The last line of the patch must be '*** End Patch'")
        return ls
    try:
        return strict(lines)
    except PatchError as e:  # lenient mode: a heredoc wrapper around the patch
        if len(lines) >= 4 and lines[0] in ("<<EOF", "<<'EOF'", '<<"EOF"') and lines[-1].endswith("EOF"):
            return strict(lines[1:-1])
        raise e


def parse(patch):
    """Returns [(path, chunks)], chunk = dict(ctx, old, new, ctx_idx, eof)."""
    lines = _boundaries(patch.strip().splitlines())
    files, mode = [], "start"
    for n, line in enumerate(lines[1:-1], start=2):
        t = line.strip()
        if t.startswith(UPDATE):
            files.append([t[len(UPDATE):], []]); mode = "update"; continue
        if t.startswith(ADD) or t.startswith(DELETE):
            files.append([None, []]); mode = "other"; continue
        if mode == "start":
            raise PatchError(f"invalid hunk at line {n}, '{t}' is not a valid hunk header. Valid hunk headers: "
                             "'*** Add File: {path}', '*** Delete File: {path}', '*** Update File: {path}'")
        if mode == "other":
            continue
        chunks = files[-1][1]
        u = line.rstrip()
        if chunks and chunks[-1]["eof"] and u and not (u == "@@" or u.startswith("@@ ")):
            raise PatchError(f"invalid hunk at line {n}, Expected update hunk to start with a @@ context marker, got: '{line}'")
        if not chunks and u.startswith(MOVE):
            continue
        if (u == "@@" or u.startswith("@@ ")) and chunks and not chunks[-1]["old"] and not chunks[-1]["new"]:
            raise PatchError(f"invalid hunk at line {n}, " + UNEXPECTED.format(line))
        if u == "@@":
            chunks.append(dict(ctx=None, old=[], new=[], ctx_idx=[], eof=False)); continue
        if u.startswith("@@ "):
            chunks.append(dict(ctx=u[3:], old=[], new=[], ctx_idx=[], eof=False)); continue
        if u == EOFM:
            if not chunks or (not chunks[-1]["old"] and not chunks[-1]["new"]):
                raise PatchError(f"invalid hunk at line {n}, Update hunk does not contain any lines")
            chunks[-1]["eof"] = True; continue
        if not chunks:
            chunks.append(dict(ctx=None, old=[], new=[], ctx_idx=[], eof=False))
        c = chunks[-1]
        if line == "" or line[0] == " ":
            text = line[1:] if line else ""
            c["ctx_idx"].append((len(c["old"]), len(c["new"]))); c["old"].append(text); c["new"].append(text)
        elif line[0] == "+":
            c["new"].append(line[1:])
        elif line[0] == "-":
            c["old"].append(line[1:])
        elif c["old"] or c["new"]:
            raise PatchError(f"invalid hunk at line {n}, Expected update hunk to start with a @@ context marker, got: '{line}'")
        else:
            raise PatchError(f"invalid hunk at line {n}, " + UNEXPECTED.format(line))
    for path, chunks in files:
        if path is not None and not chunks:
            raise PatchError(f"invalid hunk, Update file hunk for path '{path}' is empty")
    return [(p, c) for p, c in files if p is not None]


_FOLD = {**{chr(c): "-" for c in (0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2015, 0x2212)},
         **{chr(c): "'" for c in (0x2018, 0x2019, 0x201A, 0x201B)},
         **{chr(c): '"' for c in (0x201C, 0x201D, 0x201E, 0x201F)},
         **{chr(c): " " for c in (0x00A0, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009,
                                  0x200A, 0x202F, 0x205F, 0x3000)}}


def seek(lines, pattern, start, eof):
    if not pattern:
        return start
    if len(pattern) > len(lines):
        return None
    s = max(len(lines) - len(pattern), start) if eof else start
    rng = range(s, len(lines) - len(pattern) + 1)
    for norm in (lambda x: x, str.rstrip, str.strip, lambda x: "".join(_FOLD.get(ch, ch) for ch in x.strip())):
        for i in rng:
            if all(norm(lines[i + k]) == norm(p) for k, p in enumerate(pattern)):
                return i
    return None


def _split(content):
    """text_file.rs SourceFile::parse: [(text, ending or None)], first ending seen is preferred."""
    out, pref, i, start = [], None, 0, 0
    while i < len(content):
        ch = content[i]
        if ch == "\r" and content[i + 1:i + 2] == "\n":
            end, k = "\r\n", 2
        elif ch in "\r\n":
            end, k = ch, 1
        else:
            i += 1; continue
        pref = pref or end
        out.append([content[start:i], end]); i += k; start = i
    if start < len(content):
        out.append([content[start:], None])
    return out, pref or "\n"


def apply(content, chunks, path="file"):
    src, pref = _split(content)
    lines = [t for t, _ in src]
    reps, idx = [], 0
    for c in chunks:
        if c["ctx"] is not None:
            j = seek(lines, [c["ctx"]], idx, False)
            if j is None:
                raise PatchError(f"Failed to find context '{c['ctx']}' in {path}")
            idx = j + 1
        if not c["old"]:
            reps.append((len(lines), 0, c["new"])); continue
        pat, new = c["old"], c["new"]
        found = seek(lines, pat, idx, c["eof"])
        if found is None and pat and pat[-1] == "":
            pat = pat[:-1]
            if new and new[-1] == "":
                new = new[:-1]
            found = seek(lines, pat, idx, c["eof"])
        if found is None:
            raise PatchError(f"Failed to find expected lines in {path}:\n" + "\n".join(c["old"]))
        os_, ns_ = 0, 0
        for oc, nc in c["ctx_idx"]:
            if oc >= len(pat) or nc >= len(new):
                break
            if os_ != oc or ns_ != nc:
                reps.append((found + os_, oc - os_, new[ns_:nc]))
            os_, ns_ = oc + 1, nc + 1
        if os_ != len(pat) or ns_ != len(new):
            reps.append((found + os_, len(pat) - os_, new[ns_:]))
        idx = found + len(pat)
    reps.sort(key=lambda r: r[0])
    out, pos = [], 0
    for start, n, seg in reps:
        out.extend(src[pos:start]); pos = start + n
        out.extend([[t, pref] for t in seg])
    out.extend(src[pos:])
    return "".join(t + (e or pref) for t, e in out)
