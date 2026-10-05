import torch, torch.nn.functional as F
x = torch.tensor([2., 1.], requires_grad=True)
W = torch.tensor([[1., 0.], [0., 1.], [1., -2.]], requires_grad=True)
z = W @ x
L = F.cross_entropy(z[None], torch.tensor([2]))
print(L)
fn = L.grad_fn
while fn is not None:
    print(type(fn).__name__, [type(n).__name__ if n else None for n, _ in fn.next_functions],
          {a: tuple(getattr(fn, a).shape) for a in dir(fn) if a.startswith('_saved_') and isinstance(getattr(fn, a), torch.Tensor)})
    nxt = [n for n, _ in fn.next_functions if n is not None and type(n).__name__ != 'AccumulateGrad']
    fn = nxt[0] if nxt else None
print(z.grad_fn._saved_self is W, z.grad_fn._saved_vec is x)
L.backward()
print(W.grad); print(x.grad)
try:
    L.backward()
except RuntimeError as e:
    print("second backward:", str(e)[:120])
# in-place modification after save
a = torch.tensor([1., 2.], requires_grad=True)
b = a.exp(); b.add_(1)
try:
    b.sum().backward()
except RuntimeError as e:
    print("inplace:", str(e)[:160])
