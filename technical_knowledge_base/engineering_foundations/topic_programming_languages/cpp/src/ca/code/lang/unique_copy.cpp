#include <memory>
#include <string>

int main() {
    auto p = std::make_unique<std::string>("weights.bin");
    auto q = p;              // error: a unique_ptr cannot be copied
    auto r = std::move(p);   // fine: ownership is transferred
}
