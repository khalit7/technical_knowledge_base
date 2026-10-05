#include <cstdio>
#include <string>
#include <string_view>

// string_view: a pointer and a length into someone else's characters (no copy)
std::string_view first_word(std::string_view s) {
    auto end = s.find(' ');
    return s.substr(0, end);            // still points into the caller's string
}

int main() {
    std::string small = "u0029";
    std::string big = "a user id far too long for the small-string buffer";
    std::printf("capacity of an empty std::string: %zu\n", std::string{}.capacity());
    std::printf("small: size %zu, chars stored inside the object: %d\n", small.size(),
                (const void*)small.data() >= (const void*)&small &&
                (const void*)small.data() < (const void*)(&small + 1));
    std::printf("big:   size %zu, chars stored inside the object: %d\n", big.size(),
                (const void*)big.data() >= (const void*)&big &&
                (const void*)big.data() < (const void*)(&big + 1));

    std::string line = "attention training trained";
    std::string_view w = first_word(line);
    std::printf("first word: %.*s (%zu bytes, no copy)\n", (int)w.size(), w.data(), w.size());
    std::string cafe = "caf\xc3\xa9";   // UTF-8 bytes; size() counts bytes, not characters
    std::printf("\"%s\" size() = %zu\n", cafe.c_str(), cafe.size());
}
