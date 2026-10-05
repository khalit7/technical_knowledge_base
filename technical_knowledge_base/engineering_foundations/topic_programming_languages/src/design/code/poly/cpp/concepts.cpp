#include <concepts>
#include <cstdio>
template <typename T>
concept Speaker = requires(T t) { { t.speak() } -> std::convertible_to<const char*>; };
struct Dog { const char* speak() { return "woof"; } };
struct Rock {};
void talk(Speaker auto x) { std::puts(x.speak()); }   // one compiled copy per type
int main() { talk(Dog{}); talk(Rock{}); }
