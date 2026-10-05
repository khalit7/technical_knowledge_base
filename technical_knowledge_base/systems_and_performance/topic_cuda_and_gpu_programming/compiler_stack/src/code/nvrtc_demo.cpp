// NVRTC: CUDA C++ compiled at run time, from a string, inside your own program. No GPU is needed to compile.
// Build: g++ -O2 nvrtc_demo.cpp -I/usr/local/cuda/include -L/usr/local/cuda/lib64 -lnvrtc -o nvrtc_demo
// Writes ../out/nvrtc/: PTX and CUBIN for a generic and a specialised kernel, lowered template names, timings (JSON).
#include <nvrtc.h>
#include <chrono>
#include <cstdio>
#include <string>
#include <vector>
#define CHECK(x) do { nvrtcResult r = (x); if (r != NVRTC_SUCCESS) { std::printf("%s failed: %s\n", #x, nvrtcGetErrorString(r)); return 1; } } while (0)

static const char* kSrc = R"(
#ifndef NCOLS
#define NCOLS ncols            /* generic: the row length arrives at run time */
#endif
extern "C" __global__ void scale_rows(const float* x, float* y, float a, int ncols) {
  const float* xr = x + (size_t)blockIdx.x * NCOLS; float* yr = y + (size_t)blockIdx.x * NCOLS;
  for (int j = threadIdx.x; j < NCOLS; j += blockDim.x) yr[j] = a * xr[j];
}
template <typename T, int K> __global__ void axpy(const T* x, T* y, T a) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
#pragma unroll
  for (int k = 0; k < K; ++k) y[i * K + k] += a * x[i * K + k];
}
)";

static std::string outdir = "../out/nvrtc/";
static void save(const std::string& name, const std::vector<char>& b) { FILE* f = std::fopen((outdir + name).c_str(), "wb"); std::fwrite(b.data(), 1, b.size(), f); std::fclose(f); }

// compile once; returns milliseconds; saves PTX and CUBIN when tag is non-empty
static double compile(const std::vector<const char*>& opts, const std::string& tag, std::vector<std::string>* lowered) {
  auto t0 = std::chrono::steady_clock::now();
  nvrtcProgram p; nvrtcCreateProgram(&p, kSrc, "rt.cu", 0, nullptr, nullptr);
  const char* names[] = {"axpy<float, 4>", "axpy<__half, 8>"};
  if (lowered) for (auto n : names) nvrtcAddNameExpression(p, n);
  nvrtcResult r = nvrtcCompileProgram(p, (int)opts.size(), opts.data());
  auto t1 = std::chrono::steady_clock::now();
  size_t n; nvrtcGetProgramLogSize(p, &n); std::vector<char> log(n); nvrtcGetProgramLog(p, log.data());
  if (r != NVRTC_SUCCESS) {
    std::printf("compile failed: %s\n%s\n", nvrtcGetErrorString(r), log.data());
    if (tag == "noinclude") { FILE* f = std::fopen((outdir + "noinclude.txt").c_str(), "w"); std::fprintf(f, "%s\n%s", nvrtcGetErrorString(r), log.data()); std::fclose(f); }
    nvrtcDestroyProgram(&p); return -1; }
  if (!tag.empty()) {
    nvrtcGetPTXSize(p, &n); std::vector<char> ptx(n); nvrtcGetPTX(p, ptx.data()); ptx.pop_back(); save(tag + ".ptx", ptx);
    if (nvrtcGetCUBINSize(p, &n) == NVRTC_SUCCESS && n) { std::vector<char> cub(n); nvrtcGetCUBIN(p, cub.data()); save(tag + ".cubin", cub); }
  }
  if (lowered) for (auto nm : names) { const char* low; nvrtcGetLoweredName(p, nm, &low); lowered->push_back(std::string(nm) + "\t" + low); }
  nvrtcDestroyProgram(&p);
  return std::chrono::duration<double, std::milli>(t1 - t0).count();
}

int main() {
  int major, minor; CHECK(nvrtcVersion(&major, &minor));
  std::vector<std::string> low;
  const char* half = "-include=cuda_fp16.h";   // NVRTC searches no include path of its own:
  const char* inc = "-I/usr/local/cuda/include";  // without this line: cannot open source file "cuda_fp16.h"
  std::vector<const char*> gen = {"--gpu-architecture=sm_90a", "-std=c++17", inc, half};
  std::vector<const char*> spec = {"--gpu-architecture=sm_90a", "-std=c++17", "-DNCOLS=4096", inc, half};
  std::vector<const char*> virt = {"--gpu-architecture=compute_90a", "-std=c++17", inc, half};
  std::vector<const char*> noinc = {"--gpu-architecture=sm_90a", "-std=c++17", half};   // the include path forgotten
  compile(noinc, "noinclude", nullptr);
  if (compile(gen, "generic.sm_90a", &low) < 0) return 1;
  compile(spec, "special4096.sm_90a", nullptr);
  compile(virt, "generic.compute_90a", nullptr);
  std::vector<double> tg, ts;
  for (int i = 0; i < 7; ++i) { tg.push_back(compile(gen, "", nullptr)); ts.push_back(compile(virt, "", nullptr)); }
  FILE* f = std::fopen((outdir + "nvrtc.json").c_str(), "w");
  std::fprintf(f, "{\"nvrtc_version\": \"%d.%d\", \"ms_to_cubin\": [", major, minor);
  for (size_t i = 0; i < tg.size(); ++i) std::fprintf(f, "%s%.1f", i ? ", " : "", tg[i]);
  std::fprintf(f, "], \"ms_to_ptx\": [");
  for (size_t i = 0; i < ts.size(); ++i) std::fprintf(f, "%s%.1f", i ? ", " : "", ts[i]);
  std::fprintf(f, "], \"lowered\": [");
  for (size_t i = 0; i < low.size(); ++i) std::fprintf(f, "%s\"%s\"", i ? ", " : "", low[i].c_str());
  std::fprintf(f, "]}\n"); std::fclose(f);
  std::printf("ok\n"); return 0;
}
