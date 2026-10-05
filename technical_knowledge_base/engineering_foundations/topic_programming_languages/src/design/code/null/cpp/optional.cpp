#include <optional>
#include <cstdio>
std::optional<int> find(bool ok) { if (ok) return 42; return std::nullopt; }
int main() {
    std::printf("%d\n", find(false).value_or(-1));  // the safe way: say what to do if empty
    std::fflush(stdout);
    int* p = nullptr;
    std::printf("%d\n", *p);   // dereferencing null: undefined behaviour, here a crash
}
