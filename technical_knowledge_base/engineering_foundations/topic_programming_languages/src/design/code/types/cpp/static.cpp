#include <string>
int twice(int x) { return 2 * x; }

int main() {
    return twice(std::string("21"));  // no implicit string -> int
}
