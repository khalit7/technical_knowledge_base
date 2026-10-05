"""Lines of code of each implementation: non-blank lines that are not only a comment
(Python: '#' lines and docstrings; C++, Rust, TypeScript: '//' lines and /* */ blocks).
usage: loc.py <rosetta/code> <src/bench>; prints JSON."""
import json
import sys
from pathlib import Path


def count(path):
    lines = Path(path).read_text(encoding="utf-8").splitlines()
    py = str(path).endswith(".py")
    n, in_block, in_doc = 0, False, False
    for raw in lines:
        s = raw.strip()
        if not s:
            continue
        if py:
            if in_doc:
                in_doc = '"""' not in s
                continue
            if s.startswith('"""'):
                in_doc = s.count('"""') == 1
                continue
            if s.startswith("#"):
                continue
        else:
            if in_block:
                in_block = "*/" not in s
                continue
            if s.startswith("/*"):
                in_block = "*/" not in s
                continue
            if s.startswith("//"):
                continue
        n += 1
    return n


def main(ro, bench):
    ro, bench = Path(ro), Path(bench)
    out = {
        "python": {"files": {"count_tokens.py": count(ro / "python/count_tokens.py")}},
        "cpp": {"files": {"count_tokens.cpp": count(ro / "cpp/count_tokens.cpp"),
                          "json_lite.hpp": count(ro / "cpp/json_lite.hpp")}},
        "rust": {"files": {"src/main.rs": count(ro / "rust/src/main.rs"), "Cargo.toml": count(ro / "rust/Cargo.toml")}},
        "ts": {"files": {"count_tokens.ts": count(ro / "ts/count_tokens.ts")}},
        "python_re": {"files": {"count_re.py": count(bench / "py/count_re.py"), "common.py": count(bench / "py/common.py")}},
        "ext_pyo3": {"files": {"src/lib.rs": count(bench / "ext_rust/src/lib.rs"), "Cargo.toml": count(bench / "ext_rust/Cargo.toml"),
                               "pyproject.toml": count(bench / "ext_rust/pyproject.toml")}},
        "ext_pybind11": {"files": {"ct_pb.cpp": count(bench / "ext_cpp/ct_pb.cpp"), "tokens.h": count(bench / "ext_cpp/tokens.h"),
                                   "file_count.h": count(bench / "ext_cpp/file_count.h")}},
        "ext_nanobind": {"files": {"ct_nb.cpp": count(bench / "ext_cpp/ct_nb.cpp"), "tokens.h": count(bench / "ext_cpp/tokens.h"),
                                   "file_count.h": count(bench / "ext_cpp/file_count.h")}},
    }
    for v in out.values():
        v["total"] = sum(v["files"].values())
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
