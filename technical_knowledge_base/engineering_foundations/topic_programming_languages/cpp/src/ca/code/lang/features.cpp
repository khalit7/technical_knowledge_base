// Which C++20/23/26 features does this compiler + standard library report?
// Feature-test macros are the standard way to ask; "-" means the macro is not defined.
#include <version>
#include <cstdio>
#include <cstring>
#define STR2(x) #x
#define STR(x) STR2(x)
// If the macro is defined, STR(m) is its value (e.g. "202002L"); if not, it is the macro's own name.
#define SHOW(m) show(#m, STR(m))
void show(const char* name, const char* value) {
    std::printf("%-30s %s\n", name, std::strcmp(name, value) ? value : "-");
}
int main() {
    SHOW(__cplusplus);
    SHOW(__cpp_concepts);
    SHOW(__cpp_lib_ranges);
    SHOW(__cpp_lib_span);
    SHOW(__cpp_lib_format);
    SHOW(__cpp_impl_coroutine);
    SHOW(__cpp_lib_jthread);
    SHOW(__cpp_lib_expected);
    SHOW(__cpp_lib_print);
    SHOW(__cpp_lib_mdspan);
    SHOW(__cpp_lib_ranges_to_container);
    SHOW(__cpp_lib_generator);
    SHOW(__cpp_lib_flat_map);
    SHOW(__cpp_lib_stacktrace);
    SHOW(__cpp_explicit_this_parameter);
    SHOW(__cpp_lib_modules);
    SHOW(__cpp_contracts);
    SHOW(__cpp_impl_reflection);
    SHOW(__cpp_lib_simd);
    SHOW(__cpp_lib_senders);
    SHOW(__cpp_pack_indexing);
}
