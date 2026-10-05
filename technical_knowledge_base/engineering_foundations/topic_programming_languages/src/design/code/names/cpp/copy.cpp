#include <vector>
#include <cstdio>
int main() {
    std::vector<int> a = {1, 2, 3};
    std::vector<int> b = a;   // a full copy of the elements
    std::vector<int>& c = a;  // a reference: another name for a
    b.push_back(4);           // changes only the copy
    c.push_back(5);           // changes a
    for (int x : a) std::printf("%d ", x);
    std::printf("| b has %zu elements\n", b.size());
}
