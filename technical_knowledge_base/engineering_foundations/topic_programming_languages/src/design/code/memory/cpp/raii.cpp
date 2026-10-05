#include <cstdio>
struct File {
    const char* name;
    File(const char* n) : name(n) { std::printf("open %s\n", name); }
    ~File() { std::printf("close %s\n", name); }   // destructor: runs at scope end
};
int main() {
    File a("a.txt");
    { File b("b.txt"); }
    std::puts("end of main");
}
