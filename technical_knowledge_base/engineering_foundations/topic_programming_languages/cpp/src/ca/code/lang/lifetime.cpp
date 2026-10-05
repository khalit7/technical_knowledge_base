#include "tracer.h"
#include <cstring>
#include <memory>
#include <stdexcept>
#include <vector>

// <helpers>
void by_value(Tracer) { STEP("inside by_value"); }
void by_ref(const Tracer&) { STEP("inside by_ref"); }
Tracer make(const char* n) { Tracer t{n}; return t; }
// </helpers>

// <scope>
void scope() {
    Tracer a{"a"};
    {
        Tracer b{"b"};
        STEP("end of inner block");
    }
    Tracer c{"c"};
    STEP("end of function");
}
// </scope>

// <copymove>
void copymove() {
    Tracer a{"a"};
    Tracer b = a;             // copy constructor
    Tracer c = std::move(a);  // move constructor: steals a's string
    std::printf("a.name is now \"%s\"\n", a.name.c_str());
    b = c;                    // copy assignment (b already exists)
    STEP("end of function");
}
// </copymove>

// <calls>
void calls() {
    Tracer a{"a"};
    by_ref(a);                // no new object
    by_value(a);              // a copy for the parameter
    by_value(std::move(a));   // a move for the parameter
    Tracer m = make("m");     // no copy, no move: built in place
    STEP("end of function");
}
// </calls>

// <growth>
template <class T>
void growth() {
    std::vector<T> v;
    v.push_back(T{"x"});
    STEP("capacity 1, now push y");
    v.push_back(T{"y"});
    STEP("capacity 2, now push z");
    v.push_back(T{"z"});
    STEP("end of function");
}
// </growth>

// <reserve>
void reserve() {
    std::vector<Tracer> v;
    v.reserve(3);             // one allocation up front
    v.emplace_back("x");      // built directly inside the vector
    v.emplace_back("y");
    v.emplace_back("z");
    STEP("end of function");
}
// </reserve>

// <unique>
void unique() {
    auto p = std::make_unique<Tracer>("h");   // the Tracer lives on the heap
    std::unique_ptr<Tracer> q = std::move(p);  // ownership moves; the Tracer does not
    std::printf("p is %s, q owns #%d\n", p ? "set" : "null", q->id);
    q.reset();                                 // the owner lets go: destroyed now
    STEP("end of function");
}
// </unique>

// <shared>
void shared() {
    auto s = std::make_shared<Tracer>("s");
    {
        std::shared_ptr<Tracer> t = s;         // a second owner
        std::printf("use_count %ld\n", s.use_count());
    }
    std::printf("use_count %ld\n", s.use_count());
    STEP("end of function");
}
// </shared>

// <unwind>
void unwind() {
    Tracer a{"a"};
    try {
        Tracer b{"b"};
        throw std::runtime_error("boom");
        STEP("never reached");
    } catch (const std::exception& e) {
        std::printf("caught %s\n", e.what());
    }
    STEP("end of function");
}
// </unwind>

int main(int argc, char** argv) {
    char here;
    stack_anchor = &here;
    const char* s = argc > 1 ? argv[1] : "";
    if (!std::strcmp(s, "scope")) scope();
    else if (!std::strcmp(s, "copymove")) copymove();
    else if (!std::strcmp(s, "calls")) calls();
    else if (!std::strcmp(s, "growth")) growth<Tracer>();
    else if (!std::strcmp(s, "growth_nx")) growth<TracerNX>();
    else if (!std::strcmp(s, "reserve")) reserve();
    else if (!std::strcmp(s, "unique")) unique();
    else if (!std::strcmp(s, "shared")) shared();
    else if (!std::strcmp(s, "unwind")) unwind();
    std::printf("@0 back in main\n");
}
