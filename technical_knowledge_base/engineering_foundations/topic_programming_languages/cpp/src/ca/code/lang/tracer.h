// tracer.h: a class that reports every special member function call.
// Each object gets a number (#1, #2, ...) and says whether it lives on the stack or the heap.
#pragma once
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <source_location>
#include <string>
#include <utility>

inline const char* stack_anchor = nullptr;   // set to a local's address in main()
inline int next_id = 1;

inline const char* where(const void* p) {
    long d = static_cast<const char*>(p) - stack_anchor;
    return std::labs(d) < (8L << 20) ? "stack" : "heap";
}
#define STEP(text) std::printf("@%d %s\n", __LINE__, text)
// The line in lifetime.cpp that caused a constructor call (blank when called from inside the library)
inline int at(const std::source_location& l) {
    return std::strstr(l.file_name(), "lifetime.cpp") ? static_cast<int>(l.line()) : 0;
}
using Loc = std::source_location;

template <bool NoexceptMove>
struct BasicTracer {
    int id;
    std::string name;
    explicit BasicTracer(std::string n, Loc l = Loc::current()) : id(next_id++), name(std::move(n)) {
        std::printf("ctor #%d %s %s L%d\n", id, name.c_str(), where(this), at(l));
    }
    BasicTracer(const BasicTracer& o, Loc l = Loc::current()) : id(next_id++), name(o.name) {
        std::printf("copy #%d from #%d %s %s L%d\n", id, o.id, name.c_str(), where(this), at(l));
    }
    BasicTracer(BasicTracer&& o, Loc l = Loc::current()) noexcept(NoexceptMove) : id(next_id++), name(std::move(o.name)) {
        std::printf("move #%d from #%d %s %s L%d\n", id, o.id, name.c_str(), where(this), at(l));
    }
    BasicTracer& operator=(const BasicTracer& o) {
        name = o.name;
        std::printf("copy= #%d from #%d\n", id, o.id);
        return *this;
    }
    BasicTracer& operator=(BasicTracer&& o) noexcept(NoexceptMove) {
        name = std::move(o.name);
        std::printf("move= #%d from #%d\n", id, o.id);
        return *this;
    }
    ~BasicTracer() { std::printf("dtor #%d\n", id); }
};
using Tracer = BasicTracer<true>;     // move constructor marked noexcept
using TracerNX = BasicTracer<false>;  // the same class without noexcept
