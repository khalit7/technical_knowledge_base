#include <iostream>
#include <stdexcept>
#include <string>
#include <unordered_map>

int main() {
    std::unordered_map<std::string, long> per_user{{"u0029", 9491}};
    // operator[] on a missing key silently INSERTS it with value 0.
    std::cout << "u0777 has " << per_user["u0777"] << "; map size is now " << per_user.size() << "\n";
    try {
        std::cout << per_user.at("u0888") << "\n";  // .at() throws instead
    } catch (const std::out_of_range& e) {
        std::cout << "at() threw std::out_of_range: " << e.what() << "\n";
    }
}
