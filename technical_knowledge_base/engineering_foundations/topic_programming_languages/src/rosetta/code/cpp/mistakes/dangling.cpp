#include <cstdio>
#include <string>
#include <utility>
#include <vector>

int main() {
    std::vector<std::pair<std::string, long>> top{{"u0029", 9491}, {"u0005", 4816}};
    const auto& first = top[0];  // a reference INTO the vector's buffer
    for (int i = 0; i < 1000; ++i)
        top.push_back({"x" + std::to_string(i), i});  // growing reallocates the buffer
    std::printf("%s %ld\n", first.first.c_str(), first.second);  // reads freed memory
}
