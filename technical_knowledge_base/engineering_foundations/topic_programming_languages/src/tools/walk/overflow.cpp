#include <climits>
#include <iostream>

int main(int argc, char**) {
  int x = INT_MAX;
  x += argc;  // signed overflow: undefined behaviour in C++
  std::cout << x << "\n";
}
