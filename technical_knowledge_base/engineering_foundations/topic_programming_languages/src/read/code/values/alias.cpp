#include <cstdio>
#include <string>
#include <vector>
int main() {
    std::vector<std::string> top = {"u0029", "u0005"};
    std::vector<std::string> saved = top;    // a COPY: new buffer, new strings
    saved.push_back("u0042");
    std::printf("top has %zu users, saved has %zu\n", top.size(), saved.size());
    std::vector<std::string>& alias = top;   // a reference: you must ask for sharing with &
    alias.push_back("u0042");
    std::printf("after alias.push_back, top has %zu users\n", top.size());
}
