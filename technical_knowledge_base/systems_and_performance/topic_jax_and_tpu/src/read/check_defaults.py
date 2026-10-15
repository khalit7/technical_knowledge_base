"""Defaults that differ between PyTorch and the JAX stack, read from the installed versions (Reading tab, interview
answer on porting). Usage: $JX_SCRATCH/venv/bin/python -I -B check_defaults.py > out/defaults.txt"""
import inspect
import jax, flax, optax, torch
from flax import nnx
sig = lambda f, p: inspect.signature(f).parameters[p].default
print("versions jax", jax.__version__, "flax", flax.__version__, "optax", optax.__version__, "torch", torch.__version__)
print("LayerNorm epsilon: nnx", sig(nnx.LayerNorm.__init__, "epsilon"), "torch", sig(torch.nn.LayerNorm.__init__, "eps"))
print("GELU: jax.nn.gelu approximate", sig(jax.nn.gelu, "approximate"), "torch nn.GELU approximate", repr(torch.nn.GELU().approximate))
print("AdamW weight decay: optax", sig(optax.adamw, "weight_decay"), "torch", sig(torch.optim.AdamW.__init__, "weight_decay"))
print("AdamW eps: optax", sig(optax.adamw, "eps"), "torch", sig(torch.optim.AdamW.__init__, "eps"))
k = sig(nnx.Linear.__init__, "kernel_init")
cl = {n: c.cell_contents for n, c in zip(k.__code__.co_freevars, k.__closure__ or []) if n in ("scale", "mode", "distribution")}
print("nnx.Linear kernel_init: variance_scaling", cl, "(lecun_normal is variance_scaling(1.0, 'fan_in', 'truncated_normal'))")
src = inspect.getsource(torch.nn.Linear.reset_parameters)
print("torch Linear init uses kaiming_uniform_(a=sqrt(5)):", "kaiming_uniform_(self.weight, a=math.sqrt(5))" in src)
print("nnx.Linear kernel shape for Linear(3, 5):", nnx.Linear(3, 5, rngs=nnx.Rngs(0)).kernel[...].shape, "torch weight shape:", tuple(torch.nn.Linear(3, 5).weight.shape))
