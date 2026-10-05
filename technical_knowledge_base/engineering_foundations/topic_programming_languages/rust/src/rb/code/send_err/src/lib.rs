use pyo3::prelude::*;
use pyo3::types::PyList;

/// Wrong on purpose: reads a Python list while detached from the interpreter.
#[pyfunction]
fn count_detached(py: Python<'_>, texts: Bound<'_, PyList>) -> usize {
    py.detach(|| texts.len())
}
