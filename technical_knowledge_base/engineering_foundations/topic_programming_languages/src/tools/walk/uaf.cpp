#include <iostream>
#include <vector>

int main() {
  std::vector<int> v = {1, 2, 3};
  int* first = &v[0];  // pointer into the vector's heap buffer
  v.push_back(4);      // may reallocate: the old buffer is freed
  std::cout << *first << "\n";  // use after free
}
