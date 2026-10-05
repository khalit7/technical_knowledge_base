#include <cstdio>
#include <string>
#include <utility>
#include <vector>

int main() {
    std::string s = "a string long enough to live on the heap";
    std::string t = std::move(s);       // t steals s's heap buffer
    std::printf("t: %zu chars, s: %zu chars\n", t.size(), s.size());
    s = "reusable";                     // a moved-from object can be assigned to
    std::printf("s: %s\n", s.c_str());

    std::vector<int> v(1'000'000, 7);
    const int* before = v.data();
    std::vector<int> w = std::move(v);  // O(1): three pointers change hands
    std::printf("w.data() == old v.data(): %d, v.size() now %zu\n", w.data() == before, v.size());

    const std::string c = "const";
    std::string d = std::move(c);       // compiles, but COPIES: you cannot steal from const
    std::printf("c after 'move': %s\n", c.c_str());
}
