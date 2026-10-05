# NaN hunting demo for the Numerical computing page: where does the first NaN come from?
import torch
torch.manual_seed(0)
z = torch.tensor([1000., 999., 0.], requires_grad=True)
# naive softmax cross-entropy, target index 2 (sat)
p = torch.exp(z) / torch.exp(z).sum()
loss = -torch.log(p[2])
print("naive loss:", loss.item())
loss.backward(); print("naive grad:", z.grad.tolist())
z.grad = None
with torch.autograd.detect_anomaly():
    p = torch.exp(z) / torch.exp(z).sum()
    loss = -torch.log(p[2])
    try:
        loss.backward()
    except RuntimeError as e:
        print("anomaly:", str(e).splitlines()[0])
z.grad = None
loss = torch.nn.functional.cross_entropy(z[None], torch.tensor([2])); loss.backward()
print("fused loss:", loss.item(), "grad:", z.grad.tolist())
x = torch.tensor([0.], requires_grad=True)
y = torch.sqrt(x); y.backward(); print("sqrt(0) grad:", x.grad.item())
a = torch.nn.functional.normalize(torch.tensor([[1.,0.]]),dim=1); b=a.clone()
c=(a*b).sum()*1.0000001; print("cos:",c.item(),"acos:",torch.acos(torch.clamp(c,max=1)).item(), torch.acos(torch.tensor(1.0000001)).item())
