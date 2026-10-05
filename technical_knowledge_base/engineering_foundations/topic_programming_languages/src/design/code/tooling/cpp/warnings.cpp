// flags: -Wextra
// run: no
int main() {
    int x = 0;
    unsigned n = 3;
    if (x = 1) {}                        // assignment where a comparison was meant
    for (int i = 0; i < n; i++) {}       // signed compared with unsigned
}
