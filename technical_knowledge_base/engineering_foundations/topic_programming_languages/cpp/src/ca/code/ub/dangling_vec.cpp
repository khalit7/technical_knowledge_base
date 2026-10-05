#include <cstdio>
#include <string>
#include <vector>

int main() {
    std::vector<std::string> users{"u0029"};
    const std::string& first = users[0];   // a reference INTO the vector's buffer
    users.push_back("u0005");              // buffer full: reallocate, free the old one
    std::printf("first user: %s\n", first.c_str());   // reads freed memory
}
