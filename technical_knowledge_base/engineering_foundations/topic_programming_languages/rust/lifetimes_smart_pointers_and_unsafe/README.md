# Rust: lifetimes, smart pointers, threads and unsafe

Notion id `4055c17b0d0d8160aa32df9cda0aef03`. A child of Rust: the essentials (`..`), under Topic: programming-languages.

How Rust's one aliasing rule is checked: by lifetimes for references (elision, `'static` bounds), across threads by `Send` and `Sync`, at run time by `RefCell`, `Mutex` and reference counts, and inside `unsafe` by the programmer, with Miri to check it in tests. Owns Send and Sync, and Miri. Status: built 2026-10-26 from the Rust page's Part 1 sections 6 and 15 to 17; see `src/README.md`.
