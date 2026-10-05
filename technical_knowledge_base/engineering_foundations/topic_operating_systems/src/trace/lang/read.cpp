// Read a small file into memory: the C++ way (iostreams, libstdc++ on glibc).
#include <fstream>
#include <iostream>
#include <sstream>
int main() {
    std::ifstream f("/work/hello.txt");   // basic_filebuf::open -> fopen-like -> open(2)
    std::stringstream ss;
    ss << f.rdbuf();                      // filebuf underflow -> read(2)
    std::cout << ss.str().size() << "\n";
}
