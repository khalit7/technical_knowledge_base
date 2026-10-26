from _typeshed import Incomplete
from collections.abc import Sequence
from os import PathLike
from typing import final

@final
class Counter:
    """
    A running per-user counter that lives across calls.
    """
    def __len__(self, /) -> int: ...
    def __new__(cls, /) -> Counter: ...
    def __repr__(self, /) -> str: ...
    def add(self, /, user: str, text: str) -> None:
        """
        Add one message. `&mut self`: PyO3 checks at run time that nobody else holds it.
        """
    def top(self, /, n: int = 5) -> list[tuple[str, int]]:
        """
        The n heaviest users, ties by id (rule 5).
        """
    @property
    def total(self, /) -> int: ...

@final
class SharedCounter:
    """
    The thread-safe version: `frozen` means no `&mut self` ever, so PyO3 needs no
    run-time borrow flag; the mutable state sits behind a Mutex that threads queue on.
    """
    def __new__(cls, /) -> SharedCounter: ...
    def add(self, /, user: str, text: str) -> None: ...
    @property
    def total(self, /) -> int: ...

def count_bytes(data: bytes) -> int:
    """
    `&[u8]` from `bytes`: a view of Python's buffer, zero copies.
    """

def count_bytes_owned(data: Sequence[int]) -> int:
    """
    `Vec<u8>` from `bytes`: a fresh copy of the whole buffer first.
    """

def count_many(texts: list) -> list[int]:
    """
    Step 2b: the same list, borrowed: each item is viewed in place, nothing is copied.
    """

def count_many_owned(texts: Sequence[str]) -> list[int]:
    """
    Step 2a: one call for a list. `Vec<String>` copies every string into a new Rust allocation.
    """

def count_tokens(text: str) -> int:
    """
    Step 1: one message per call. `&str` borrows the Python string's UTF-8 bytes.
    """

def counts_array(texts: list) -> Incomplete:
    """
    ... or a NumPy array that takes over the Vec's buffer without copying it.
    """

def counts_list(texts: list) -> list[int]:
    """
    Returning results: a Vec<u64> becomes a Python list (one int object per element) ...
    """

def dict_total(d: dict) -> int:
    """
    ... while iterating the `PyDict` in place only reads the values.
    """

def dict_total_owned(d: dict[str, int]) -> int:
    """
    Dicts: `HashMap<String, u64>` copies every key into a new String ...
    """

def first_token_len(text: str) -> int:
    """
    A bug, not an error: a Rust panic reaches Python as pyo3_runtime.PanicException.
    """

def noop() -> None:
    """
    The cheapest possible call: the crossing alone.
    """

def parse_line(line: str) -> tuple[str, int]:
    """
    Parse one line or raise. `?` turns each Rust error into a Python exception.
    """

def sum_sq_array(xs: Incomplete) -> float:
    """
    The same from a NumPy array: a read-only view of NumPy's own buffer, zero copies.
    """

def sum_sq_list(xs: Sequence[float]) -> float:
    """
    Sum of squares from a Python list: every float is converted into a new Vec<f64>.
    """

def tally_bytes(data: bytes) -> tuple[int, int, int, int, dict]:
    """
    Step 3: the whole file in one call. Python reads the bytes; Rust parses and counts.
    The GIL (or, on free-threaded Python, the thread's attachment) is held throughout.
    """

def tally_bytes_detached(data: bytes) -> tuple[int, int, int, int, dict]:
    """
    Step 4: the same work with the GIL released. `py.detach` runs the closure
    detached from the interpreter, so other Python threads keep running.
    """

def tally_bytes_parallel(data: bytes, threads: int = 8) -> tuple[int, int, int, int, dict]:
    """
    Step 5: detached and parallel. rayon splits the chunks over its thread pool.
    """

def tally_file(path: str |PathLike[str], threads: int = 1) -> tuple[int, int, int, int, dict]:
    """
    The whole job from a path: Rust opens the file too. `std::io::Error` becomes
    the matching Python exception (FileNotFoundError, PermissionError, ...).
    """

def total_len(texts: list) -> int:
    """
    Conversion alone (no token loop): total UTF-8 length, borrowed ...
    """

def total_len_owned(texts: Sequence[str]) -> int:
    """
    ... and copied into Strings first.
    """

def __getattr__(name: str) -> Incomplete: ...
