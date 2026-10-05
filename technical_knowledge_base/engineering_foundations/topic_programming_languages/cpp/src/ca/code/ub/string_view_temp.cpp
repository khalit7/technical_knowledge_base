#include <cstdio>
#include <string>
#include <string_view>

std::string make_name() { return std::string(40, 'x') + "_u0029"; }

int main() {
    std::string_view name = make_name();   // the temporary string dies at the semicolon
    std::printf("name: %.*s\n", (int)name.size(), name.data());
}
