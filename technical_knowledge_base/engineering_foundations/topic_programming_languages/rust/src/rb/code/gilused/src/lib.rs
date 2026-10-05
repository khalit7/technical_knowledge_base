use pyo3::prelude::*;

/// A module that opts out of free-threading: it says it still relies on the GIL.
#[pymodule(gil_used = true)]
mod gilused {
    use pyo3::prelude::*;

    #[pyfunction]
    fn hello() -> &'static str {
        "hello"
    }
}
