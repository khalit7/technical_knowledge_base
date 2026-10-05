// ct_pb: the token counter as a pybind11 extension.
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include <vector>
#include "tokens.h"
#include "file_count.h"
namespace py = pybind11;

static void noop() {}
static uint64_t count_tokens(std::string_view s) { return count_tokens_sv(s); }
static std::vector<uint64_t> count_many(const py::list& texts) {
    std::vector<uint64_t> out;
    out.reserve(texts.size());
    for (py::handle h : texts) out.push_back(count_tokens_sv(h.cast<std::string_view>()));
    return out;
}

static py::tuple count_file(const std::string& path, int threads) {
    (void)threads;
    FileTally t;
    { py::gil_scoped_release nogil; t = count_file_cpp(path); }
    if (!t.opened) throw std::runtime_error("cannot open " + path);
    py::dict d;
    for (auto& [u, n] : t.per_user) d[py::str(u)] = n;
    return py::make_tuple(t.lines, t.ok, t.bad, t.first_bad, d);
}

PYBIND11_MODULE(ct_pb, m) {
    m.def("noop", &noop);
    m.def("count_tokens", &count_tokens);
    m.def("count_many", &count_many);
    m.def("count_file", &count_file, py::arg("path"), py::arg("threads") = 1);
}
