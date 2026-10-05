"""'First project in 5 commands' walkthroughs. Outputs are cut from the real transcripts in walk/*.txt
(produced by walk/walk_*.sh on 2026-10-05; scratch paths shown as ~/demo, git author redacted)."""
import os, re
HERE = os.path.dirname(os.path.abspath(__file__))

def _load(name):
    return open(os.path.join(HERE, "walk", name + ".txt")).read()

def blk(name, cmd, keep=None, drop=(), nth=0):
    """Exact output of `$ cmd` in transcript `name`, optionally only lines matching keep / not matching drop."""
    t = _load(name)
    ms = list(re.finditer(r"^\$ " + re.escape(cmd) + r"\n(.*?)^\[exit (\d+)\]$", t, re.S | re.M))
    m = ms[nth] if len(ms) > nth else None
    if not m: raise SystemExit(f"no block {cmd!r} in {name}")
    lines = m.group(1).rstrip("\n").split("\n")
    lines = [l for l in lines if not any(re.search(d, l) for d in drop)]
    if keep: lines = [l for l in lines if any(re.search(k, l) for k in keep)]
    while lines and not lines[0].strip(): lines.pop(0)
    return {"out": "\n".join(lines), "exit": int(m.group(2))}

def sect(name, title):
    """Text after a '## title' marker until the next blank-line-separated marker or command."""
    t = _load(name)
    m = re.search(r"^## " + re.escape(title) + r"\n(.*?)(?=^## |^\$ |\Z)", t, re.S | re.M)
    if not m: raise SystemExit(f"no section {title!r} in {name}")
    return m.group(1).strip("\n")

def step(name, cmd, why, files=None, shown=None, **kw):
    b = blk(name, cmd, **kw)
    return {"cmd": shown or cmd, "out": b["out"], "exit": b["exit"], "why": why, "files": files or []}

WALKS = [
 {"lang": "py", "title": "Python with uv", "pre": "uv itself is one binary (install line in the Install row). One command makes the project; you then write the code by hand.",
  "steps": [
   step("py", "uv init hello-tokens --python 3.14",
        "Creates the project folder. In uv 0.12 the default layout is a package under src/ with a console script, built by uv's own backend uv_build; it also runs git init.",
        files=[[".python-version", "the interpreter version uv will use (3.14)"], ["pyproject.toml", "the project file (PEP 621): name, version, requires-python, dependencies, the hello-tokens script, the build backend"], ["src/hello_tokens/__init__.py", "your code; generated with a main() that prints a greeting"], ["README.md, .gitignore, .git/", "the usual"]]),
   step("py", "uv add --dev pytest ruff",
        "Downloads CPython if needed, creates .venv, resolves, writes the lockfile and installs your own package in editable mode. --dev puts the tools in a dependency group, not in what users of your package install.",
        files=[[".venv/", "the virtual environment (never committed)"], ["uv.lock", "every resolved package with exact version, source URL and sha256 (108 lines here)"], ["pyproject.toml", "gains [dependency-groups] dev = [\"pytest>=9.1.1\", \"ruff>=0.16.10\"]"]]),
   step("py", "uv run hello-tokens",
        "Runs the console script inside the project's environment, syncing it first if the lockfile changed. No activate step. The code counts runs of ASCII letters and digits: Hello, from, hello, tokens, x86, 64, caf (the é splits café)."),
   step("py", "uv run ruff check && uv run ruff format --check",
        "Linter, then formatter in check-only mode (drop --check to rewrite files). Both are the same Rust binary, ruff."),
   step("py", "uv run pytest -q", "pytest finds tests/test_tokens.py by its name and runs every function starting with test_.", files=[["tests/test_tokens.py", "written by hand: from hello_tokens import count_tokens; assert count_tokens(\"x86_64 café\") == 3"]]),
  ],
  "after": "Bonus run: uv format exists too (it calls ruff format), and uv audit checks the lockfile against vulnerability databases (both listed by uv help on 0.12.23)."},
 {"lang": "cpp", "title": "C++ with CMake and Ninja", "pre": "There is no 'new project' command in the C++ toolchain: you write CMakeLists.txt, the sources and the test by hand (7 files, listed in the transcript). CMake 4.4.4 and Ninja 1.13.2 came from PyPI via uv tool install, so they needed no admin rights.",
  "steps": [
   step("cpp", "cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Debug",
        "Configure: CMake reads CMakeLists.txt, finds a compiler and writes a Ninja build into build/. -S is the source folder, -B the build folder, -G the generator. Nothing is compiled yet.",
        files=[["CMakeLists.txt", "written by hand: C++20, a library target, the program, a test registered with add_test, and CMAKE_EXPORT_COMPILE_COMMANDS for editors and clang-tidy"], ["build/build.ninja", "the generated build graph"], ["build/compile_commands.json", "the exact compiler command per file"]]),
   step("cpp", "cmake --build build", "Build: Ninja compiles each .cpp to an object file and links a static library and two executables, in parallel.",
        files=[["build/libtokens.a", "the static library"], ["build/hello_tokens, build/test_tokens", "the program and the test executable"]]),
   step("cpp", "./build/hello_tokens", "Run the native executable. Same answer as Python: 7."),
   step("cpp", "ctest --test-dir build", "CTest runs every test registered with add_test. The test here is a plain main() that returns 1 on failure; real projects use GoogleTest or Catch2 behind the same command."),
   step("cpp", "clang-format --style=LLVM --dry-run src/*.cpp src/*.hpp tests/*.cpp 2>&1 | head -12",
        "Formatter in check mode against the LLVM style; it flags include order and line length. -i would rewrite the files. A real project commits a .clang-format file instead of --style.", shown="clang-format --style=LLVM --dry-run src/*.cpp src/*.hpp tests/*.cpp"),
  ],
  "after": "Apple's clang is old on this machine (14.0.0, from Xcode 14) and, measured, defaults to C++98 when no -std is given; CMAKE_CXX_STANDARD 20 is what makes the build C++20. Always set the standard explicitly."},
 {"lang": "rs", "title": "Rust with cargo", "pre": "rustup installed the toolchain (rustc, cargo, std; clippy and rustfmt are components added with rustup component add clippy rustfmt).",
  "steps": [
   step("rs", "cargo new hello_tokens", "Creates the package: a binary crate with a manifest and a hello-world. It also runs git init.",
        files=[["Cargo.toml", "the manifest: name, version, edition = \"2024\", [dependencies]"], ["src/main.rs", "fn main() { println!(\"Hello, world!\"); }"], [".gitignore", "ignores /target"]]),
   step("rs", "cargo run", "Compiles in the debug profile (fast to build, slow to run, with debug info) and runs. Writes Cargo.lock and target/.",
        files=[["Cargo.lock", "the exact resolved versions (just this crate here: no dependencies)"], ["target/debug/", "build output"]]),
   step("rs", "cargo test", "Compiles a test binary from every #[test] function, here in a #[cfg(test)] module inside src/main.rs, and runs them in parallel."),
   step("rs", "cargo clippy && cargo fmt --check", "Clippy, the linter, found nothing to say about this code; rustfmt in check mode found it already formatted (silence means success)."),
   step("rs", "cargo build --release && ls -la target/release/hello_tokens | awk '{print $5, $9}'", "The optimised build. The result is one self-contained native binary of 431,584 bytes; nothing to install on the machine that runs it.",
        shown="cargo build --release", files=[["target/release/hello_tokens", "the optimised executable"]]),
  ],
  "after": "Adding a library is one more command, cargo add serde, which edits Cargo.toml and fetches from crates.io on the next build."},
 {"lang": "ts", "title": "TypeScript with Node and npm", "pre": "Node 22.22.2 (an LTS line) with its bundled npm 10.9.7. Node 22.18 and later run .ts files directly by stripping the types.",
  "steps": [
   step("ts", "npm init -y", "Writes package.json with defaults. Note what it does not write: \"type\": \"module\", so Node treats the folder as old CommonJS; this bites in step 4.",
        files=[["package.json", "name, version, scripts, and later devDependencies"]], keep=[r"^Wrote to"]),
   step("ts", "npm install --save-dev typescript @types/node vitest", "Installs the compiler (7.0.2, the Go port), Node's type declarations and the test runner into node_modules/ (39 packages, 68 MB) and writes package-lock.json.",
        files=[["node_modules/", "every installed package (never committed)"], ["package-lock.json", "the lockfile: exact version, tarball URL and integrity hash of every package"]], drop=[r"^\s*$", r"npm fund", r"looking for funding"]),
   step("ts", "npx tsc --init", "Writes tsconfig.json. With TypeScript 7 it already has strict: true, module nodenext, target esnext and types: [] (so even Node's types are not loaded until you list them).",
        files=[["tsconfig.json", "compiler options; the generated file is mostly comments"]], drop=[r"^\s*$"]),
   step("ts", "node src/main.ts", "Node strips the types and runs: 7. It works, with a warning: package.json has no \"type\": \"module\", so Node had to re-parse the file as an ES module.",
        files=[["src/tokens.ts, src/main.ts, src/tokens.test.ts", "written by hand; imports end in .ts so Node can find the files"]]),
   step("ts", "npx tsc --noEmit", "The type check fails on a brand-new project: the same missing \"type\": \"module\", plus .ts import paths that tsc refuses unless allowed. This is the real first-hour experience, not a contrived error."),
  ],
  "fix": [
   step("ts_fix", "npm pkg set type=module", "Declares the package an ES module. Then two lines in tsconfig.json by hand: \"allowImportingTsExtensions\": true with \"noEmit\": true (tsc only checks; Node runs the .ts files), and \"types\": [\"node\"]."),
   step("ts_fix", "node src/main.ts", "No warning now."),
   step("ts_fix", "npx tsc", "Silence: no type errors."),
   step("ts", "npx vitest run", "Vitest 5 runs src/tokens.test.ts.", drop=[r"^\s*$"]),
  ],
  "after": "Why both node and tsc: Node runs code without checking types. A file passing a number to countTokens ran under Node and crashed at run time with 'TypeError: text.match is not a function'; tsc rejected it before running with 'error TS2345: Argument of type 'number' is not assignable to parameter of type 'string''. Keep tsc in CI."},
]

# Small extra runs used inside atlas cells.
EXTRA = {
 "bun_init": blk("extra", "bun init -y", drop=[r"^\s*$"]),
 "ty": blk("extra", "uvx ty@0.0.84 check oops.py 2>&1", drop=[r"^Installed"]),
 "mypy": blk("extra", "uvx mypy@2.4.0 oops.py 2>&1", drop=[r"Download", r"^Installed"]),
 "pyright": blk("extra", "uvx --from pyright@1.1.414 pyright oops.py 2>&1 | tail -4"),
 "pyrun": blk("extra", "uv run --no-project --python 3.14 python oops.py 2>&1 | tail -3"),
 "ubsan": blk("cpp_san", "clang++ -std=c++20 -g -fsanitize=undefined overflow.cpp -o ov_ub && ./ov_ub"),
 "noubsan": blk("cpp_san", "clang++ -std=c++20 -g overflow.cpp -o ov && ./ov"),
 "oops_node": blk("ts_fix", "node src/oops.ts"),
 "oops_tsc": blk("ts_fix", "npx tsc", nth=1),
}
for w in WALKS:
    w["ncmd"] = len(w["steps"])

EXTRA.update({
 "rs_borrow": blk("miri", "cargo build -q 2>&1 | head -14"),
 "rs_unsafe_run": blk("miri", "cargo run -q"),
 "rs_miri": blk("miri", "cargo +nightly miri run -q 2>&1 | head -16"),
 "pyo3_new": blk("pyo3", "uvx maturin@1.15.0 new --bindings pyo3 tokrs", drop=[r"^Installed"]),
 "pyo3_dev": blk("pyo3", "uv venv -q --python 3.14 && uvx maturin@1.15.0 develop --uv --release 2>&1 | tail -4"),
 "pyo3_run": blk("pyo3", "uv run --no-project python -c 'import tokrs; print(tokrs.count_tokens(\"Hello from hello-tokens, x86_64 café!\"))'"),
})
# Labels shown above each extra output.
EXTRA_LABEL = {
 "pyrun": "python oops.py (runs, then fails)", "ty": "uvx ty check oops.py", "mypy": "uvx mypy oops.py", "pyright": "uvx pyright oops.py",
 "noubsan": "clang++ -std=c++20 -g overflow.cpp -o ov && ./ov", "ubsan": "clang++ -std=c++20 -g -fsanitize=undefined overflow.cpp -o ov_ub && ./ov_ub",
 "oops_node": "node src/oops.ts", "oops_tsc": "npx tsc",
 "rs_borrow": "cargo build   (with a reference: let first = &v[0];)", "rs_unsafe_run": "cargo run   (with a raw pointer read in unsafe)", "rs_miri": "cargo +nightly miri run",
 "pyo3_new": "uvx maturin new --bindings pyo3 tokrs", "pyo3_dev": "uv venv && uvx maturin develop --uv --release",
 "pyo3_run": "uv run python -c 'import tokrs; print(tokrs.count_tokens(...))'",
 "bun_init": "bun init -y",
}
for k in EXTRA: EXTRA[k]["label"] = EXTRA_LABEL.get(k, k)

WALKS.append({"lang": "rs", "key": "pyo3", "title": "Rust inside Python (PyO3 + maturin)", "pre": "The reason to learn Rust named on this page: speed up a Python hot loop. Three commands on top of uv and rustup.",
  "steps": [
   step("pyo3", "uvx maturin@1.15.0 new --bindings pyo3 tokrs", "maturin makes a mixed project: a Rust crate built as a shared library (crate-type cdylib) plus a pyproject.toml whose build backend is maturin, and a GitHub Actions workflow that builds wheels.",
        shown="uvx maturin new --bindings pyo3 tokrs", drop=[r"^Installed"],
        files=[["Cargo.toml", "pyo3 = \"0.29.0\" as the only dependency; crate-type = [\"cdylib\"]"], ["pyproject.toml", "build-backend = \"maturin\""], ["src/lib.rs", "a #[pymodule] with an example #[pyfunction]; replaced by hand with count_tokens"], [".github/workflows/CI.yml", "wheel builds for Linux, macOS and Windows"]]),
   step("pyo3", "uv venv -q --python 3.14 && uvx maturin@1.15.0 develop --uv --release 2>&1 | tail -4", "Compiles the crate with optimisation, packs it into a wheel for CPython 3.14 on this platform, and installs it into .venv in editable mode.", shown="uv venv && uvx maturin develop --uv --release"),
   step("pyo3", "uv run --no-project python -c 'import tokrs; print(tokrs.count_tokens(\"Hello from hello-tokens, x86_64 café!\"))'", "Python imports the Rust function like any module and gets the same 7. Whether it is faster, and by how much once the call overhead counts, is the Benchmark tab's question.", shown="uv run python -c 'import tokrs; print(tokrs.count_tokens(\"...\"))'"),
  ],
  "after": "To ship it: maturin build --release makes the wheel, and maturin publish (or the generated CI workflow) uploads wheels to PyPI."})
for w in WALKS:
    w["ncmd"] = len(w["steps"])
    w.setdefault("key", w["lang"])
