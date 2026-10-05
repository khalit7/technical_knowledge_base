#include <cstdint>
#include <cstdio>
struct block_q4_0 { uint16_t d; uint8_t qs[16]; };   // ggml's shape (there d is an fp16 scale)
int main() {
    block_q4_0 blocks[2] = {};                        // contiguous: no headers, no pointers
    blocks[1].qs[0] = 0x3A;                           // two 4-bit weights packed in one byte
    auto* base = reinterpret_cast<uint8_t*>(blocks);
    std::printf("sizeof %zu, blocks[1] is %td bytes in\n", sizeof(block_q4_0), (uint8_t*)&blocks[1] - base);
    std::printf("low %d, high %d\n", (blocks[1].qs[0] & 0x0F) - 8, (blocks[1].qs[0] >> 4) - 8);
}
