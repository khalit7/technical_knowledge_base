#include <algorithm>
#include <vector>
struct Msg { const char* user; long tokens; };   // no operator<

int main() {
    std::vector<Msg> msgs{{"u0029", 9491}, {"u0005", 4816}};
    std::sort(msgs.begin(), msgs.end());          // unconstrained (pre-C++20) algorithm
}
