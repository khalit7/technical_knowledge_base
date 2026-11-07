# Stack effect of each instruction in total(xs)'s loop, as dis reports it (used by Fig. 3's value stack).
# Run on the repo's Python 3.12 (no 3.14 here); 3.14's fused LOAD_FAST_BORROW_LOAD_FAST_BORROW is two LOAD_FASTs.
import dis, sys
print(sys.version.split()[0])
for n in ["GET_ITER", "FOR_ITER", "STORE_FAST", "LOAD_FAST", "BINARY_OP", "JUMP_BACKWARD"]:
    op = dis.opmap[n]
    print(f"{n:14} {dis.stack_effect(op, 0, jump=False) if op >= dis.HAVE_ARGUMENT else dis.stack_effect(op):+d}")
