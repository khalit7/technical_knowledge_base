// Four features llama.cpp uses that Part 1 does not cover, each as llama.cpp uses it.
#include <cstdint>
#include <cstdio>
#include <tuple>
#include <type_traits>

// 1. A packed block with a size check at compile time (ggml-common.h: block_q8_0)
typedef uint16_t ggml_half;
typedef struct { ggml_half d; int8_t qs[32]; } block_q8_0;
static_assert(sizeof(block_q8_0) == sizeof(ggml_half) + 32, "wrong q8_0 block size/padding");

// 2. An interface in C: a struct of function pointers (llama_sampler_i, ggml_backend_i)
struct sampler;
struct sampler_i { const char * (*name)(const sampler *); void (*apply)(sampler *, float * logits, int n, int * out); };
struct sampler { const sampler_i * iface; };
static const char * greedy_name(const sampler *) { return "greedy"; }
static void greedy_apply(sampler *, float * l, int n, int * out) { int b = 0; for (int i = 1; i < n; ++i) if (l[i] > l[b]) b = i; *out = b; }
static const sampler_i greedy_i = { greedy_name, greedy_apply };

// ... and the same interface in C++: a base class with virtual functions (llama_memory_i)
struct sampler_cpp { virtual ~sampler_cpp() = default; virtual const char * name() const = 0; virtual int apply(const float * l, int n) = 0; };
struct greedy_cpp : sampler_cpp {
    const char * name() const override { return "greedy (virtual)"; }
    int apply(const float * l, int n) override { int b = 0; for (int i = 1; i < n; ++i) if (l[i] > l[b]) b = i; return b; }
};

// 3. A template whose body changes at compile time (src/models/llama.cpp: graph<embed>)
template <bool embed> struct graph {
    using input_t = std::conditional_t<embed, int, float>;   // a type chosen by the template argument
    const char * build() const {
        if constexpr (embed) { return "embeddings: stop after the last norm"; }
        else                 { return "generation: add the output projection (lm_head)"; }
    }
};

// 4. Structured bindings: unpack a returned tuple into three names (build_qkv returns Q, K, V)
static std::tuple<int, int, int> build_qkv() { return {576, 192, 192}; }

int main() {
    std::printf("sizeof(block_q8_0) = %zu bytes for 32 weights\n", sizeof(block_q8_0));
    float logits[5] = {0.1f, 2.5f, -1.0f, 3.25f, 0.0f};
    sampler s{&greedy_i}; int tok;
    s.iface->apply(&s, logits, 5, &tok);
    std::printf("%s picked token %d\n", s.iface->name(&s), tok);
    greedy_cpp g; sampler_cpp & base = g;
    std::printf("%s picked token %d\n", base.name(), base.apply(logits, 5));
    std::printf("graph<false>: %s\ngraph<true>:  %s\n", graph<false>{}.build(), graph<true>{}.build());
    std::printf("graph<true>::input_t is int: %d\n", (int) std::is_same_v<graph<true>::input_t, int>);
    auto [q, k, v] = build_qkv();
    std::printf("Q %d, K %d, V %d rows\n", q, k, v);
}
