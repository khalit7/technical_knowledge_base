# The running example: `count_tokens`

One small, real program written four times (Python, C++, Rust, TypeScript). Every tab and the Reading use this program; the Benchmark times it.

## What it does

Read a JSONL chat log (one JSON object per line), count word-ish tokens in each message, add them up per user in a hash map, sort, and print the five heaviest users. Malformed lines are counted and skipped, never fatal. This is the sort of throwaway tool an ML engineer writes every week (usage per user, dataset stats), and it touches every axis of the page: file I/O, JSON parsing, strings and Unicode, a hash map, sorting with a tie-break, error handling, and (in the variants) structs, closures, generics and threads.

## Input

- File: `data/chat.jsonl`, 2000 lines, 391,227 bytes, sha256 `9f4cca1d1c34c38178f39453add264068e30c49ed0d9e168f4fdd72b7445f58f`.
- Made by `data/gen_chat.py` (standard library only): `python3 data/gen_chat.py --lines 2000 --seed 7 > data/chat.jsonl` (these are the defaults). Bigger inputs for benchmarks: same script, `--lines N`, same seed. Do not commit big files; generate them.
- A good line: `{"ts": 1759650000, "user": "u0029", "role": "user", "text": "attention training trained for; ..."}`. Field order is fixed by the generator but programs must not rely on it. Extra fields (`ts`, `role`) are ignored.
- Text contains ASCII words, punctuation, non-ASCII words (`café`, `日本語`, an emoji), written raw as UTF-8 on two lines in three and as `\uXXXX` escapes (including a surrogate pair for the emoji) on the third; about 5% of messages contain `\n`, `\"` and `\\` escapes.
- 8 malformed lines (positions chosen by the seed): a truncated line, a missing comma, `"user": 17` (not a string), no `user` field, `not json at all`, an invalid escape `\x41`, single quotes, `"text": null`.

## Rules (every implementation must follow these exactly)

1. Every newline-terminated line is one record; `lines` counts them all.
2. A line is **ok** if it parses as one JSON value (whitespace around it allowed, nothing after it), that value is an object, and it has a `user` field and a `text` field whose values are both strings. Anything else is **malformed**: count it, remember the 1-based number of the first one, skip it.
3. **Token**: a maximal run of ASCII letters or digits (`[A-Za-z0-9]+`) in the decoded `text`. Every other character (space, punctuation, `_`, `.`, any non-ASCII character such as `é` or `日`) separates tokens. So `x86_64` is 2 tokens, `café` is 1 (`caf`), `日本語` is 0, `v2.1` is 2, `C++` is 1.
4. Add each ok line's token count to its `user`. A user appears in the map only if they have at least one ok line (even with 0 tokens).
5. Sort users by token count descending, ties by user id ascending (byte order). Print the top 5.
6. Exit code 0 on success; if the file cannot be opened print `error: cannot open <path>: <reason>` to stderr and exit 1.

## Exact expected output for `data/chat.jsonl`

```
lines 2000  ok 1992  malformed 8 (first at line 53)
users 176  tokens 44698
top 5 users by tokens:
 1. u0029  9491
 2. u0005  4816
 3. u0042  3499
 4. u0169  2291
 5. u0121  1401
```

(Rank right-aligned to width 2, then `. `, the user id, two spaces, the count. Two spaces between fields on the first two lines. Trailing newline after every line.)

For a benchmark-sized input, `--lines 200000 --seed 7` (38,792,775 bytes) gives:

```
lines 200000  ok 199992  malformed 8 (first at line 6685)
users 200  tokens 4413871
top 5 users by tokens:
 1. u0029  939855
 2. u0005  433400
 3. u0042  279373
 4. u0169  204481
 5. u0082  159042
```

## Implementations

`code/python/count_tokens.py` (reference), `code/cpp/count_tokens.cpp`, `code/rust/` (cargo project, `serde_json`), `code/ts/count_tokens.ts`. `run_all.sh` rebuilds each, checks each output is byte-identical to the expected output above, and stores outputs in `outputs/` and toolchain versions in `outputs/versions.txt`.

Notes for the C++ version: the C++ standard library has no JSON parser, so `count_tokens.cpp` carries a small strict JSON parser (about 120 lines) instead of pulling in nlohmann/json or simdjson; say so wherever speed is compared. Apple clang 14 on this machine has no `std::expected` (it needs libc++ 16+), so the C++23 error-handling variant is shown with the compile error and an equivalent.
