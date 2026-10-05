#include <vector>
#include <cstdio>
void add_one(std::vector<int> xs) { xs.push_back(1); }   // by value: works on a copy
void add_one_ref(std::vector<int>& xs) { xs.push_back(1); } // by reference: the caller's
int main() {
    std::vector<int> nums = {0};
    add_one(nums);     std::printf("%zu\n", nums.size());
    add_one_ref(nums); std::printf("%zu\n", nums.size());
}
