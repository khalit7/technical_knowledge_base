"""A training step of the running example with one deliberate graph break (print in Block.forward) and one recompile
(a second batch shape), run with TORCH_TRACE set so tlparse can build its report. Usage: TORCH_TRACE=<dir> PY trace_run.py"""
from common import *
import model as M
torch.set_num_threads(4)
cfg = GPTConfig()
ORIG = M.Block.forward
def blk_print(self, x):
    x = x + self.attn(self.ln1(x))
    print("block done")
    return x + self.mlp(self.ln2(x))
M.Block.forward = blk_print
m = make_model(cfg); opt = make_optimizer(m); c = torch.compile(m)
x, y = get_batch(cfg, 0)
with quiet():
    for B in (8, 4):
        _, loss = c(x[:B], y[:B]); loss.backward(); opt.step(); opt.zero_grad(set_to_none=True)
print("ok")
