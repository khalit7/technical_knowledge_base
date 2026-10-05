#include <cstdio>
#include <memory>
#include <string>
#include <vector>

struct Tokenizer {                       // a base class with a virtual function
    virtual int count(const std::string& s) const = 0;   // = 0: must be overridden
    virtual ~Tokenizer() = default;      // virtual destructor: required for delete via base
};
struct Whitespace : Tokenizer {
    int count(const std::string& s) const override {
        int n = 0; bool in = false;
        for (char c : s) { bool t = c != ' '; n += t && !in; in = t; }
        return n;
    }
};
struct Bytes : Tokenizer {
    int count(const std::string& s) const override { return static_cast<int>(s.size()); }
};

int main() {
    std::vector<std::unique_ptr<Tokenizer>> ts;
    ts.push_back(std::make_unique<Whitespace>());
    ts.push_back(std::make_unique<Bytes>());
    for (const auto& t : ts)             // which count() runs is decided at run time
        std::printf("%d\n", t->count("hello token world"));
}
