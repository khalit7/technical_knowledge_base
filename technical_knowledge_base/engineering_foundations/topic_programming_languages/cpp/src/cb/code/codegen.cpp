// Small functions to read in assembly: clang++ -S -O0 and -O2.
int square(int x) { return x * x; }
int sum_squares(int n) {                 // calls square n times... or does it?
  int s = 0;
  for (int i = 0; i < n; ++i) s += square(i);
  return s;
}
struct Shape { virtual ~Shape() = default; virtual float area() const = 0; };
struct Square final : Shape { float side; explicit Square(float s) : side(s) {} float area() const override { return side * side; } };
float area_of(const Shape& s) { return s.area(); }              // type unknown: a virtual call through the vtable
float area_of_square(const Square& s) { return s.area(); }      // type known and final: no virtual call
