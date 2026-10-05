#include <cstdio>
#include <functional>
#include <memory>
#include <optional>
#include <span>
#include <string>
#include <string_view>
#include <vector>

struct Plain   { double x; void f() {} };
struct Virtual { double x; virtual void f() {} virtual ~Virtual() = default; };

int main() {
    std::printf("%-30s %zu\n", "int*", sizeof(int*));
    std::printf("%-30s %zu\n", "std::unique_ptr<int>", sizeof(std::unique_ptr<int>));
    std::printf("%-30s %zu\n", "std::shared_ptr<int>", sizeof(std::shared_ptr<int>));
    std::printf("%-30s %zu\n", "std::vector<int>", sizeof(std::vector<int>));
    std::printf("%-30s %zu\n", "std::string", sizeof(std::string));
    std::printf("%-30s %zu\n", "std::string_view", sizeof(std::string_view));
    std::printf("%-30s %zu\n", "std::span<int>", sizeof(std::span<int>));
    std::printf("%-30s %zu\n", "std::optional<int>", sizeof(std::optional<int>));
    std::printf("%-30s %zu\n", "std::function<int(int)>", sizeof(std::function<int(int)>));
    std::printf("%-30s %zu\n", "Plain {double; f()}", sizeof(Plain));
    std::printf("%-30s %zu\n", "Virtual {double; virtual f()}", sizeof(Virtual));
}
