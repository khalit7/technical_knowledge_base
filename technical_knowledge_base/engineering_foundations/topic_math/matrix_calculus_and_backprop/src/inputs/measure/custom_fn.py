import torch
from torch.autograd import Function, gradcheck

class SoftmaxCE(Function):
    """Fused softmax cross-entropy for one row of logits z and a target index y."""
    @staticmethod
    def forward(z, y):
        logp = z - torch.logsumexp(z, dim=-1, keepdim=True)
        return -logp.gather(-1, y[..., None]).squeeze(-1)

    @staticmethod
    def setup_context(ctx, inputs, output):
        z, y = inputs
        ctx.save_for_backward(torch.softmax(z, dim=-1), y)   # keep p, not the logits

    @staticmethod
    def backward(ctx, gL):
        p, y = ctx.saved_tensors
        gz = p.clone()
        gz.scatter_add_(-1, y[..., None], -torch.ones_like(y, dtype=p.dtype)[..., None])  # p - onehot
        return gL[..., None] * gz, None                      # chain rule: times the incoming gradient

class SoftmaxCEBuggy(SoftmaxCE):
    @staticmethod
    def backward(ctx, gL):
        p, y = ctx.saved_tensors
        gz = p.clone()
        gz.scatter_add_(-1, y[..., None], -torch.ones_like(y, dtype=p.dtype)[..., None])
        return gz, None                                       # bug: ignores the incoming gradient gL

z = torch.tensor([[2., 1., 0.], [0.5, -1., 3.]], dtype=torch.float64, requires_grad=True)
y = torch.tensor([2, 0])
L = SoftmaxCE.apply(z, y)
print("loss", L.detach().tolist())
L.sum().backward(); print("grad", z.grad.tolist())
print("gradcheck:", gradcheck(SoftmaxCE.apply, (z, y)))
try:
    print("buggy gradcheck:", gradcheck(SoftmaxCEBuggy.apply, (z, y)))
except Exception as e:
    print("buggy gradcheck raised:", type(e).__name__, str(e).splitlines()[0][:150])
# float32: same correct function, default tolerances
z32 = z.detach().float().requires_grad_()
try:
    print("float32 gradcheck:", gradcheck(SoftmaxCE.apply, (z32, y)))
except Exception as e:
    print("float32 gradcheck raised:", type(e).__name__, str(e).splitlines()[0][:150])
