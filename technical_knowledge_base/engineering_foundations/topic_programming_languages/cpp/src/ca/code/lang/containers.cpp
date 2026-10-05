#include <algorithm>
#include <cstdio>
#include <span>
#include <string>
#include <unordered_map>
#include <vector>

// span: a view of contiguous elements, whoever owns them
long sum(std::span<const long> xs) {
    long s = 0;
    for (long x : xs) s += x;
    return s;
}

int main() {
    std::unordered_map<std::string, long> per_user;   // Python's dict
    const char* users[] = {"u0029", "u0005", "u0029", "u0042", "u0005", "u0029"};
    const long tokens[] = {10, 7, 5, 9, 1, 3};
    for (int i = 0; i < 6; ++i) per_user[users[i]] += tokens[i];  // [] inserts 0 if missing

    std::printf("contains u0099? %d (contains() does not insert)\n", per_user.contains("u0099"));
    long& ref = per_user["u0099"];                    // operator[] DOES insert
    std::printf("after per_user[\"u0099\"]: size %zu, value %ld\n", per_user.size(), ref);

    std::vector<std::pair<std::string, long>> rows(per_user.begin(), per_user.end());
    std::ranges::sort(rows, [](const auto& a, const auto& b) {
        return a.second != b.second ? a.second > b.second : a.first < b.first;  // count desc, id asc
    });
    for (const auto& [user, n] : rows) std::printf("%s %ld\n", user.c_str(), n);  // structured binding

    std::vector<long> v{3, 1, 4, 1, 5};
    long arr[] = {9, 2, 6};
    std::printf("sum(v)=%ld sum(arr)=%ld sum(first 2 of v)=%ld\n",
                sum(v), sum(arr), sum(std::span(v).first(2)));
}
