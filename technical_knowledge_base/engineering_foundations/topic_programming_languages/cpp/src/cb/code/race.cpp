// The message-passing pattern written with plain (non-atomic) variables: a data race, so undefined behaviour.
// ThreadSanitizer (-fsanitize=thread) reports it even on runs where the output looks right.
#include <cstdio>
#include <thread>
int data = 0;
bool ready = false;
int main() {
  std::thread a([] { data = 42; ready = true; });
  std::thread b([] { while (!ready) {} std::printf("data = %d\n", data); });
  a.join(); b.join();
}
