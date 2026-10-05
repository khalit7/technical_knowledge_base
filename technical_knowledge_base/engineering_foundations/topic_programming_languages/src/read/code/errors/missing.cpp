#include <cstdio>
#include <string>
#include <unordered_map>
int main() {
    std::unordered_map<std::string, long> per_user = {{"u0029", 9491}};
    std::printf("size before: %zu\n", per_user.size());
    long n = per_user["nobody"];        // operator[] INSERTS a zero for a missing key
    std::printf("per_user[\"nobody\"] = %ld, size after: %zu\n", n, per_user.size());
    auto it = per_user.find("ghost");    // the non-inserting way
    std::printf("find(\"ghost\") found: %s\n", it == per_user.end() ? "no" : "yes");
}
