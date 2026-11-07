// The first objects of dispatch.cpp's "3 classes mixed" vector: the same generator, seed and draws
// (kind, then x, then y per object), printed instead of timed. std::mt19937 is fully specified by the
// standard, so these values are the same on every platform; the page's 3D figure draws them.
#include <cstdio>
#include <random>

int main() {
    const char* name[] = {"Sq", "Rect", "Tri"};
    std::mt19937 rng(42);
    int counts[3] = {0, 0, 0}, changes = 0, prev = -1;
    for (int i = 0; i < 10'000'000; ++i) {
        int kind = rng() % 3, x = 1 + rng() % 7, y = 1 + rng() % 7;
        if (i < 8) std::printf("object %d  %-4s  x %d  y %d\n", i, name[kind], x, y);
        ++counts[kind];
        if (prev >= 0 && kind != prev) ++changes;
        prev = kind;
    }
    std::printf("all 10,000,000: Sq %d  Rect %d  Tri %d; class changes from one object to the next %d\n",
                counts[0], counts[1], counts[2], changes);
}
