// ct_rs: the count_tokens program's hot parts as a Python extension (PyO3).
// Three levels of crossing: one call per message, one call per batch, one call per file.
use pyo3::prelude::*;
use pyo3::types::{PyDict, PyList, PyString};
use serde::Deserialize;
use std::collections::HashMap;

// Same typed parse as the Rosetta Rust program: serde checks the shape while parsing.
#[derive(Deserialize)]
struct Message {
    user: String,
    text: String,
}

/// Tokens = maximal runs of ASCII letters or digits. UTF-8 bytes of non-ASCII
/// characters are all >= 0x80, so a byte loop gives the same answer as a char loop.
fn tokens(s: &[u8]) -> u64 {
    let mut n = 0u64;
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

/// The cheapest possible call: measures the crossing alone.
#[pyfunction]
fn noop() {}

/// One message per call.
#[pyfunction]
fn count_tokens(text: &str) -> u64 {
    tokens(text.as_bytes())
}

/// One call for a whole list of messages.
#[pyfunction]
fn count_many(texts: &Bound<'_, PyList>) -> PyResult<Vec<u64>> {
    let mut out = Vec::with_capacity(texts.len());
    for item in texts.iter() {
        let s = item.cast::<PyString>()?;
        out.push(tokens(s.to_str()?.as_bytes()));
    }
    Ok(out)
}

struct Tally {
    lines: u64,
    ok: u64,
    bad: u64,
    first_bad: u64,
    per_user: HashMap<String, u64>,
}

fn count_lines(data: &[u8], first_lineno: u64) -> Tally {
    let mut t = Tally { lines: 0, ok: 0, bad: 0, first_bad: 0, per_user: HashMap::new() };
    let mut lineno = first_lineno;
    for line in data.split_inclusive(|&b| b == b'\n') {
        t.lines += 1;
        let rec: Option<(String, u64)> = serde_json::from_slice::<Message>(line)
            .ok()
            .map(|m| { let n = tokens(m.text.as_bytes()); (m.user, n) });
        match rec {
            Some((u, n)) => {
                t.ok += 1;
                *t.per_user.entry(u).or_insert(0) += n;
            }
            None => {
                t.bad += 1;
                if t.first_bad == 0 {
                    t.first_bad = lineno;
                }
            }
        }
        lineno += 1;
    }
    t
}

/// The whole file in Rust: read, parse JSON, count, aggregate. `threads` > 1 splits
/// the file at line boundaries and runs the chunks on OS threads, without the GIL.
#[pyfunction]
#[pyo3(signature = (path, threads=1))]
fn count_file<'py>(py: Python<'py>, path: &str, threads: usize) -> PyResult<(u64, u64, u64, u64, Bound<'py, PyDict>)> {
    let data = std::fs::read(path)?;
    let t = py.detach(|| {
        if threads <= 1 {
            return count_lines(&data, 1);
        }
        // split into `threads` chunks that end on a newline, remembering each chunk's first line number
        let mut cuts = vec![0usize];
        for k in 1..threads {
            let mut c = data.len() * k / threads;
            while c < data.len() && data[c - 1] != b'\n' {
                c += 1;
            }
            cuts.push(c.max(*cuts.last().unwrap()));
        }
        cuts.push(data.len());
        let starts: Vec<u64> = {
            let mut v = vec![1u64];
            for w in cuts.windows(2).take(threads - 1) {
                let nl = data[w[0]..w[1]].iter().filter(|&&b| b == b'\n').count() as u64;
                v.push(v.last().unwrap() + nl);
            }
            v
        };
        let parts: Vec<Tally> = std::thread::scope(|s| {
            let hs: Vec<_> = (0..threads)
                .map(|i| {
                    let chunk = &data[cuts[i]..cuts[i + 1]];
                    let start = starts[i];
                    s.spawn(move || count_lines(chunk, start))
                })
                .collect();
            hs.into_iter().map(|h| h.join().unwrap()).collect()
        });
        let mut all = Tally { lines: 0, ok: 0, bad: 0, first_bad: 0, per_user: HashMap::new() };
        for p in parts {
            all.lines += p.lines;
            all.ok += p.ok;
            all.bad += p.bad;
            if all.first_bad == 0 {
                all.first_bad = p.first_bad;
            }
            for (u, n) in p.per_user {
                *all.per_user.entry(u).or_insert(0) += n;
            }
        }
        all
    });
    let d = PyDict::new(py);
    for (u, n) in t.per_user {
        d.set_item(u, n)?;
    }
    Ok((t.lines, t.ok, t.bad, t.first_bad, d))
}

#[pymodule]
fn ct_rs(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(noop, m)?)?;
    m.add_function(wrap_pyfunction!(count_tokens, m)?)?;
    m.add_function(wrap_pyfunction!(count_many, m)?)?;
    m.add_function(wrap_pyfunction!(count_file, m)?)?;
    Ok(())
}
