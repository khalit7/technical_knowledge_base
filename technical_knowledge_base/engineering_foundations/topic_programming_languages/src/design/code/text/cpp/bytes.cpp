#include <string>
#include <cstdio>
int main() {
    std::string s = "héllo👍";       // stored as UTF-8 bytes
    std::printf("size %zu\n", s.size());
    std::printf("s[1] = %d, s[2] = %d\n", (unsigned char)s[1], (unsigned char)s[2]); // é is 2 bytes
}
