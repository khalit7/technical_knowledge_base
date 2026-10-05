#include <compare>
#include <cstdio>
#include <string>

class Usage {
public:
    // explicit: no silent conversion from a string to a Usage
    explicit Usage(std::string user, long tokens = 0)
        : user_(std::move(user)), tokens_(tokens) {}   // member initialiser list

    const std::string& user() const { return user_; } // const: does not modify *this
    long tokens() const { return tokens_; }

    Usage& operator+=(long n) { tokens_ += n; return *this; }
    // one line gives ==, !=, <, <=, >, >= comparing members in declaration order
    auto operator<=>(const Usage&) const = default;

private:
    std::string user_;
    long tokens_;
};

Usage operator+(Usage u, long n) { u += n; return u; }

int main() {
    Usage a{"u0005", 4816};
    Usage b = a + 100;
    b += 1;
    std::printf("%s %ld\n", b.user().c_str(), b.tokens());
    std::printf("a < b: %d, a == a: %d\n", a < b, a == a);
}
