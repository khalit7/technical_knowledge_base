// Keep a reference to the first user's name, then keep adding users.
#include <iostream>
#include <string>
#include <vector>
int main() {
    std::vector<std::string> users;
    users.push_back("u0029-the-heaviest-user");
    const std::string& first = users[0];   // a reference INTO the vector's buffer
    for (int i = 0; i < 100; i++)
        users.push_back("u" + std::to_string(i) + "-another-user-name");  // the buffer grows and moves
    std::cout << "first user: " << first << "\n";  // reads the old, freed buffer
}
