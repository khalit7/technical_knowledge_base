// CuTe layouts printed by CuTe itself (CUTLASS 4.8.0 headers), on the CPU, no GPU.
// For every case: CuTe's own printed form and the full mapping index -> offset
// (for a TV layout: (thread, value) -> linear coordinate in the MxN or MxK tile).
// The page's JavaScript layout algebra is checked against these lines (check_layouts.mjs).
#include <cstdio>
#include <cute/tensor.hpp>
#include <cute/atom/mma_atom.hpp>
#include <cute/atom/mma_traits_sm80.hpp>
#include <cute/atom/mma_traits_sm90_gmma.hpp>
using namespace cute;
#define I(n) Int<n>{}   // static integers: CuTe needs them for multi-mode complement

template <class L>
void emit(const char* name, L const& l) {
  printf("CASE %s|", name); print(l); printf("|");
  for (int i = 0; i < int(size(l)); ++i) printf(i ? ",%d" : "%d", int(l(i)));
  printf("\n");
}
// a TV layout maps (thread, value) to a column-major index in the tile; print it with the tile size
template <class L>
void emit_tv(const char* name, L const& l, int rows) {
  printf("TV %s|rows=%d|", name, rows); print(l); printf("|");
  int T = size<0>(l), V = size<1>(l);
  for (int t = 0; t < T; ++t) for (int v = 0; v < V; ++v) printf((t || v) ? ",%d" : "%d", int(l(t, v)));
  printf("\n");
}

int main() {
  emit("colmajor_4x8", make_layout(make_shape(I(4), I(8))));
  emit("rowmajor_4x8", make_layout(make_shape(I(4), I(8)), LayoutRight{}));
  emit("padded_4x8", make_layout(make_shape(I(4), I(8)), make_stride(I(1), I(5))));
  emit("nested_2x2x2x4", make_layout(make_shape(make_shape(I(2), I(2)), make_shape(I(2), I(4))),
                                     make_stride(make_stride(I(1), I(8)), make_stride(I(2), I(16)))));
  auto c0 = make_layout(make_shape(I(2), make_shape(I(1), I(6))), make_stride(I(1), make_stride(I(6), I(2))));
  emit("coalesce_in", c0);
  emit("coalesce_out", coalesce(c0));
  auto A = make_layout(make_shape(I(6), I(2)), make_stride(I(8), I(2)));
  auto B = make_layout(make_shape(I(4), I(3)), make_stride(I(3), I(1)));
  emit("compose_A", A); emit("compose_B", B); emit("compose_AB", composition(A, B));
  auto cb = make_layout(make_shape(I(2), I(2)), make_stride(I(1), I(6)));
  emit("complement_in", cb); emit("complement_24", complement(cb, I(24)));
  auto D = make_layout(make_shape(I(4), I(2), I(3)), make_stride(I(2), I(1), I(8)));
  auto T = make_layout(I(4), I(2));
  emit("divide_A", D); emit("divide_tiler", T); emit("divide_1d", logical_divide(D, T));
  auto M = make_layout(make_shape(I(8), I(8)));
  auto tile = make_tile(make_layout(I(2)), make_layout(I(4)));
  emit("matrix_8x8", M);
  emit("divide_8x8_by_2x4", logical_divide(M, tile));
  emit("zipped_8x8_by_2x4", zipped_divide(M, tile));
  emit("blocked_2x2_by_3x4", blocked_product(make_layout(make_shape(I(2), I(2))), make_layout(make_shape(I(3), I(4)))));
  emit("raked_2x2_by_3x4", raked_product(make_layout(make_shape(I(2), I(2))), make_layout(make_shape(I(3), I(4)))));
  // the 2-D example from CuTe's layout-algebra documentation
  auto L2 = make_layout(make_shape(I(9), make_shape(I(4), I(8))), make_stride(I(59), make_stride(I(13), I(1))));
  auto t2 = make_tile(make_layout(I(3), I(3)), make_layout(make_shape(I(2), I(4)), make_stride(I(1), I(8))));
  emit("doc2d_A", L2); emit("doc2d_divide", logical_divide(L2, t2));
  // shared-memory swizzles: 8 rows of 64 halves (128 bytes per row) with the 128-byte swizzle
  auto row64 = make_layout(make_shape(Int<8>{}, Int<64>{}), make_stride(Int<64>{}, Int<1>{}));
  emit("smem_8x64_plain", row64);
  emit("smem_8x64_sw128", composition(Swizzle<3, 3, 3>{}, row64));
  auto row32 = make_layout(make_shape(Int<8>{}, Int<32>{}), make_stride(Int<32>{}, Int<1>{}));
  emit("smem_8x32_sw64", composition(Swizzle<2, 3, 3>{}, row32));
  auto row16 = make_layout(make_shape(Int<8>{}, Int<16>{}), make_stride(Int<16>{}, Int<1>{}));
  emit("smem_8x16_sw32", composition(Swizzle<1, 3, 3>{}, row16));
  // the swizzle atoms CUTLASS's Hopper GEMM uses, as CuTe defines them
  printf("ATOM GMMA_K_SW128_half|"); print(GMMA::Layout_K_SW128_Atom<half_t>{}); printf("\n");
  printf("ATOM GMMA_K_SW64_half|"); print(GMMA::Layout_K_SW64_Atom<half_t>{}); printf("\n");
  printf("ATOM GMMA_K_SW32_half|"); print(GMMA::Layout_K_SW32_Atom<half_t>{}); printf("\n");
  printf("ATOM GMMA_K_INTER_half|"); print(GMMA::Layout_K_INTER_Atom<half_t>{}); printf("\n");
  // thread-value layouts of tensor-core instructions
  using T80 = MMA_Traits<SM80_16x8x16_F32F16F16F32_TN>;
  emit_tv("sm80_m16n8k16_A", typename T80::ALayout{}, 16);
  emit_tv("sm80_m16n8k16_B", typename T80::BLayout{}, 8);
  emit_tv("sm80_m16n8k16_C", typename T80::CLayout{}, 16);
  using T80t = MMA_Traits<SM80_16x8x8_F32TF32TF32F32_TN>;
  emit_tv("sm80_m16n8k8_tf32_A", typename T80t::ALayout{}, 16);
  using T90 = MMA_Traits<SM90_64x64x16_F32F16F16_SS<GMMA::Major::K, GMMA::Major::K>>;
  emit_tv("sm90_m64n64k16_C", typename T90::CLayout{}, 64);
  printf("SHAPE sm80_m16n8k16|"); print(typename T80::Shape_MNK{}); printf("|threads="); print(typename T80::ThrID{}); printf("\n");
  printf("SHAPE sm90_m64n64k16|"); print(typename T90::Shape_MNK{}); printf("|threads="); print(typename T90::ThrID{}); printf("\n");
  // a tiled MMA as CUTLASS builds one: 2x2 warps of the SM80 atom
  auto tmma = make_tiled_mma(SM80_16x8x16_F32F16F16F32_TN{}, Layout<Shape<_2, _2, _1>>{});
  printf("TILED sm80_2x2|"); print(tmma); printf("\n");
  return 0;
}
