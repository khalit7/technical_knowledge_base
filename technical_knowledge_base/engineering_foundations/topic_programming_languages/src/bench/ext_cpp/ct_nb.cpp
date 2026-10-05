// ct_nb: the token counter as a nanobind extension.
#include <nanobind/nanobind.h>
#include <nanobind/stl/string_view.h>
#include <nanobind/stl/vector.h>
#include <vector>
#include "tokens.h"
#include "file_count.h"
#include <nanobind/stl/string.h>
namespace nb = nanobind;

static void noop() {}
static uint64_t count_tokens(std::string_view s) { return count_tokens_sv(s); }
static std::vector<uint64_t> count_many(nb::list texts) {
    std::vector<uint64_t> out;
    out.reserve(nb::len(texts));
    for (nb::handle h : texts) out.push_back(count_tokens_sv(nb::cast<std::string_view>(h)));
    return out;
}

static nb::tuple count_file(const std::string& path, int threads) {
    (void)threads;
    FileTally t;
    { nb::gil_scoped_release nogil; t = count_file_cpp(path); }
    if (!t.opened) throw std::runtime_error("cannot open " + path);
    nb::dict d;
    for (auto& [u, n] : t.per_user) d[nb::str(u.c_str(), u.size())] = n;
    return nb::make_tuple(t.lines, t.ok, t.bad, t.first_bad, d);
}

NB_MODULE(ct_nb, m) {
    m.def("noop", &noop);
    m.def("count_tokens", &count_tokens);
    m.def("count_many", &count_many);
    m.def("count_file", &count_file, nb::arg("path"), nb::arg("threads") = 1);
}
