// tokrs: the root page's count_tokens program as a Python extension, built step by step.
// The Rust page, Part 2 (Speeding up Python) shows each ANCHOR region next to its measured cost.
use numpy::{IntoPyArray, PyArray1, PyReadonlyArray1};
use pyo3::create_exception;
use pyo3::exceptions::{PyException, PyValueError};
use pyo3::prelude::*;
use pyo3::types::{PyDict, PyList, PyString};
use rayon::prelude::*;
use serde::Deserialize;
use std::collections::HashMap;

// ANCHOR: tokens
/// Tokens = maximal runs of ASCII letters or digits (rule 3 of PROGRAM.md).
/// Non-ASCII characters are UTF-8 bytes >= 0x80, so a byte loop gives the char answer.
fn tokens(s: &[u8]) -> u64 {
    let mut n = 0;
    let mut inside = false;
    for &b in s {
        let t = b.is_ascii_alphanumeric();
        if t && !inside {
            n += 1;
        }
        inside = t;
    }
    n
}
// ANCHOR_END: tokens

// ANCHOR: step1
/// Step 1: one message per call. `&str` borrows the Python string's UTF-8 bytes.
#[pyfunction]
fn count_tokens(text: &str) -> u64 {
    tokens(text.as_bytes())
}
// ANCHOR_END: step1

/// The cheapest possible call: the crossing alone.
#[pyfunction]
fn noop() {}

// ANCHOR: step2
/// Step 2a: one call for a list. `Vec<String>` copies every string into a new Rust allocation.
#[pyfunction]
fn count_many_owned(texts: Vec<String>) -> Vec<u64> {
    texts.iter().map(|t| tokens(t.as_bytes())).collect()
}

/// Step 2b: the same list, borrowed: each item is viewed in place, nothing is copied.
#[pyfunction]
fn count_many(texts: &Bound<'_, PyList>) -> PyResult<Vec<u64>> {
    let mut out = Vec::with_capacity(texts.len());
    for item in texts.iter() {
        let s = item.cast::<PyString>()?; // TypeError if an item is not a str
        out.push(tokens(s.to_str()?.as_bytes()));
    }
    Ok(out)
}

/// Conversion alone (no token loop): total UTF-8 length, borrowed ...
#[pyfunction]
fn total_len(texts: &Bound<'_, PyList>) -> PyResult<usize> {
    let mut n = 0;
    for item in texts.iter() {
        n += item.cast::<PyString>()?.to_str()?.len();
    }
    Ok(n)
}

/// ... and copied into Strings first.
#[pyfunction]
fn total_len_owned(texts: Vec<String>) -> usize {
    texts.iter().map(|t| t.len()).sum()
}
// ANCHOR_END: step2

// ANCHOR: bytes
/// `&[u8]` from `bytes`: a view of Python's buffer, zero copies.
#[pyfunction]
fn count_bytes(data: &[u8]) -> u64 {
    tokens(data)
}

/// `Vec<u8>` from `bytes`: a fresh copy of the whole buffer first.
#[pyfunction]
fn count_bytes_owned(data: Vec<u8>) -> u64 {
    tokens(&data)
}
// ANCHOR_END: bytes

// ANCHOR: message
/// The typed parse of one JSONL line (same as the root's Rosetta Rust program):
/// serde checks that `user` and `text` exist and are strings while it parses.
#[derive(Deserialize)]
struct Message {
    user: String,
    text: String,
}
// ANCHOR_END: message

#[derive(Default)]
struct Tally {
    lines: u64,
    ok: u64,
    bad: u64,
    first_bad: u64,
    per_user: HashMap<String, u64>,
}

// ANCHOR: tally
/// Pure Rust, no Python objects: safe to run without the GIL and on many threads.
fn tally(data: &[u8], first_lineno: u64) -> Tally {
    let mut t = Tally::default();
    for (i, line) in data.split_inclusive(|&b| b == b'\n').enumerate() {
        t.lines += 1;
        match serde_json::from_slice::<Message>(line) {
            Ok(m) => {
                t.ok += 1;
                *t.per_user.entry(m.user).or_insert(0) += tokens(m.text.as_bytes());
            }
            Err(_) => {
                t.bad += 1;
                if t.first_bad == 0 {
                    t.first_bad = first_lineno + i as u64;
                }
            }
        }
    }
    t
}

fn merge(mut a: Tally, b: Tally) -> Tally {
    a.lines += b.lines;
    a.ok += b.ok;
    a.bad += b.bad;
    if a.first_bad == 0 {
        a.first_bad = b.first_bad;
    }
    for (u, n) in b.per_user {
        *a.per_user.entry(u).or_insert(0) += n;
    }
    a
}
// ANCHOR_END: tally

/// Split at newlines into about `n` chunks, each with the 1-based number of its first line.
fn chunks(data: &[u8], n: usize) -> Vec<(&[u8], u64)> {
    let mut out = Vec::new();
    let (mut start, mut line) = (0usize, 1u64);
    for k in 1..=n {
        let mut end = if k == n { data.len() } else { (data.len() * k / n).max(start) };
        while end < data.len() && end > 0 && data[end - 1] != b'\n' {
            end += 1;
        }
        let part = &data[start..end];
        out.push((part, line));
        line += part.iter().filter(|&&b| b == b'\n').count() as u64;
        start = end;
    }
    out
}

type Report<'py> = (u64, u64, u64, u64, Bound<'py, PyDict>);

fn to_python(py: Python<'_>, t: Tally) -> PyResult<Report<'_>> {
    let d = PyDict::new(py);
    for (u, n) in t.per_user {
        d.set_item(u, n)?;
    }
    Ok((t.lines, t.ok, t.bad, t.first_bad, d))
}

// ANCHOR: step3
/// Step 3: the whole file in one call. Python reads the bytes; Rust parses and counts.
/// The GIL (or, on free-threaded Python, the thread's attachment) is held throughout.
#[pyfunction]
fn tally_bytes<'py>(py: Python<'py>, data: &[u8]) -> PyResult<Report<'py>> {
    let t = tally(data, 1);
    to_python(py, t)
}
// ANCHOR_END: step3

// ANCHOR: step4
/// Step 4: the same work with the GIL released. `py.detach` runs the closure
/// detached from the interpreter, so other Python threads keep running.
#[pyfunction]
fn tally_bytes_detached<'py>(py: Python<'py>, data: &[u8]) -> PyResult<Report<'py>> {
    let t = py.detach(|| tally(data, 1));
    to_python(py, t)
}
// ANCHOR_END: step4

// ANCHOR: step5
/// Step 5: detached and parallel. rayon splits the chunks over its thread pool.
#[pyfunction]
#[pyo3(signature = (data, threads=8))]
fn tally_bytes_parallel<'py>(py: Python<'py>, data: &[u8], threads: usize) -> PyResult<Report<'py>> {
    let t = py.detach(|| {
        chunks(data, threads)
            .into_par_iter()
            .map(|(part, first)| tally(part, first))
            .reduce(Tally::default, merge)
    });
    to_python(py, t)
}
// ANCHOR_END: step5

// ANCHOR: file
/// The whole job from a path: Rust opens the file too. `std::io::Error` becomes
/// the matching Python exception (FileNotFoundError, PermissionError, ...).
#[pyfunction]
#[pyo3(signature = (path, threads=1))]
fn tally_file<'py>(py: Python<'py>, path: std::path::PathBuf, threads: usize) -> PyResult<Report<'py>> {
    let data = std::fs::read(&path)?;
    let t = py.detach(|| {
        chunks(&data, threads.max(1))
            .into_par_iter()
            .map(|(part, first)| tally(part, first))
            .reduce(Tally::default, merge)
    });
    to_python(py, t)
}
// ANCHOR_END: file

// ANCHOR: numpy
/// Sum of squares from a Python list: every float is converted into a new Vec<f64>.
#[pyfunction]
fn sum_sq_list(xs: Vec<f64>) -> f64 {
    xs.iter().map(|x| x * x).sum()
}

/// The same from a NumPy array: a read-only view of NumPy's own buffer, zero copies.
#[pyfunction]
fn sum_sq_array(xs: PyReadonlyArray1<'_, f64>) -> PyResult<f64> {
    let s = xs.as_slice()?; // error if the array is not contiguous
    Ok(s.iter().map(|x| x * x).sum())
}

/// Returning results: a Vec<u64> becomes a Python list (one int object per element) ...
#[pyfunction]
fn counts_list(texts: &Bound<'_, PyList>) -> PyResult<Vec<u64>> {
    count_many(texts)
}

/// ... or a NumPy array that takes over the Vec's buffer without copying it.
#[pyfunction]
fn counts_array<'py>(py: Python<'py>, texts: &Bound<'py, PyList>) -> PyResult<Bound<'py, PyArray1<u64>>> {
    Ok(count_many(texts)?.into_pyarray(py))
}

/// Dicts: `HashMap<String, u64>` copies every key into a new String ...
#[pyfunction]
fn dict_total_owned(d: HashMap<String, u64>) -> u64 {
    d.values().sum()
}

/// ... while iterating the `PyDict` in place only reads the values.
#[pyfunction]
fn dict_total(d: &Bound<'_, PyDict>) -> PyResult<u64> {
    let mut s = 0;
    for (_k, v) in d.iter() {
        s += v.extract::<u64>()?;
    }
    Ok(s)
}
// ANCHOR_END: numpy

// ANCHOR: errors
create_exception!(tokrs, MalformedLine, PyException, "A JSONL line that is not a chat message.");

/// Parse one line or raise. `?` turns each Rust error into a Python exception.
#[pyfunction]
fn parse_line(line: &str) -> PyResult<(String, u64)> {
    if line.trim().is_empty() {
        return Err(PyValueError::new_err("empty line"));
    }
    let m: Message = serde_json::from_str(line)
        .map_err(|e| MalformedLine::new_err(format!("{e}")))?;
    Ok((m.user, tokens(m.text.as_bytes())))
}

/// A bug, not an error: a Rust panic reaches Python as pyo3_runtime.PanicException.
#[pyfunction]
fn first_token_len(text: &str) -> usize {
    let words: Vec<&str> = text.split(|c: char| !c.is_ascii_alphanumeric()).filter(|w| !w.is_empty()).collect();
    words[0].len() // panics on a text with no tokens: index out of bounds
}
// ANCHOR_END: errors

// ANCHOR: class
/// A running per-user counter that lives across calls.
#[pyclass(module = "tokrs")]
struct Counter {
    per_user: HashMap<String, u64>,
    lines: u64,
}

#[pymethods]
impl Counter {
    #[new]
    fn new() -> Self {
        Counter { per_user: HashMap::new(), lines: 0 }
    }

    /// Add one message. `&mut self`: PyO3 checks at run time that nobody else holds it.
    fn add(&mut self, user: &str, text: &str) {
        self.lines += 1;
        *self.per_user.entry(user.to_owned()).or_insert(0) += tokens(text.as_bytes());
    }

    /// The n heaviest users, ties by id (rule 5).
    #[pyo3(signature = (n=5))]
    fn top(&self, n: usize) -> Vec<(String, u64)> {
        let mut v: Vec<(String, u64)> = self.per_user.iter().map(|(u, c)| (u.clone(), *c)).collect();
        v.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
        v.truncate(n);
        v
    }

    #[getter]
    fn total(&self) -> u64 {
        self.per_user.values().sum()
    }

    fn __len__(&self) -> usize {
        self.per_user.len()
    }

    fn __repr__(&self) -> String {
        format!("Counter(users={}, lines={}, tokens={})", self.per_user.len(), self.lines, self.total())
    }
}
// ANCHOR_END: class

// ANCHOR: shared
/// The thread-safe version: `frozen` means no `&mut self` ever, so PyO3 needs no
/// run-time borrow flag; the mutable state sits behind a Mutex that threads queue on.
#[pyclass(module = "tokrs", frozen)]
struct SharedCounter {
    per_user: std::sync::Mutex<HashMap<String, u64>>,
}

#[pymethods]
impl SharedCounter {
    #[new]
    fn new() -> Self {
        SharedCounter { per_user: std::sync::Mutex::new(HashMap::new()) }
    }

    fn add(&self, user: &str, text: &str) {
        let n = tokens(text.as_bytes()); // count outside the lock
        *self.per_user.lock().unwrap().entry(user.to_owned()).or_insert(0) += n;
    }

    #[getter]
    fn total(&self) -> u64 {
        self.per_user.lock().unwrap().values().sum()
    }
}
// ANCHOR_END: shared

// ANCHOR: module
#[pymodule]
mod tokrs {
    #[pymodule_export]
    use super::{
        count_bytes, count_bytes_owned, count_many, count_many_owned, count_tokens, counts_array,
        counts_list, dict_total, dict_total_owned, first_token_len, noop, parse_line, sum_sq_array, sum_sq_list, tally_bytes,
        tally_bytes_detached, tally_bytes_parallel, tally_file, total_len, total_len_owned, SharedCounter, Counter, MalformedLine,
    };
}
// ANCHOR_END: module
