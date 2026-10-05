#include <string>
class Usage {
public:
    explicit Usage(std::string user) : user_(std::move(user)) {}
private:
    std::string user_;
};
void bill(const Usage&) {}

int main() {
    bill(Usage{"u0005"});   // fine: you asked for a Usage
    bill(std::string{"u0005"});  // error: explicit forbids the silent conversion
}
