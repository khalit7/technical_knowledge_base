#include <string>

struct Message {
    std::string user;
    std::string text;
};

std::string owner(const Message& m) { return m.usr; }  // typo

int main() { return owner({"u0029", "hi"}).size(); }
