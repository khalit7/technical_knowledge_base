#include <string>

// const& : read without copying, and promise not to change it
int count_chars(const std::string& s) { return static_cast<int>(s.size()); }

int main() {
    const int limit = 10;
    limit = 11;                     // error: limit is const

    std::string name = "u0029";
    const std::string& view = name;
    view += "!";                    // error: view is a read-only name

    int x = 1, y = 2;
    const int* p = &x;              // pointer to const int: *p is read-only
    p = &y;                         // fine: p itself can move
    int* const q = &x;              // const pointer to int: q cannot move
    *q = 5;                         // fine: what it points at can change
    q = &y;                         // error
    return count_chars(name) + *p;
}
