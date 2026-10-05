#include <cstdio>

int table[4] = {1, 2, 3, 4};

__attribute__((noinline)) bool exists_in_table(int v) {
    for (int i = 0; i <= 4; i++)       // off by one: reads table[4]
        if (table[i] == v) return true;
    return false;
}

int main() {
    std::printf("exists_in_table(42) = %d\n", exists_in_table(42));
}
