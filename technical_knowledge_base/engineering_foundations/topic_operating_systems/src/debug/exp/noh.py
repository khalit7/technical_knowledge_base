"""A training loop with no SIGTERM handler that checkpoints every 500 steps (and at the end)."""
import os, time
import torch
torch.set_num_threads(1)
m = torch.nn.Linear(256, 256); opt = torch.optim.SGD(m.parameters(), lr=0.01)
print(f"pid {os.getpid()} training", flush=True)
for step in range(1, 10**9):
    loss = m(torch.randn(64, 256)).pow(2).mean(); opt.zero_grad(); loss.backward(); opt.step()
    time.sleep(0.005)
    if step % 500 == 0:
        torch.save(m.state_dict(), "/work/ckpt.pt"); print(f"step {step}: checkpoint saved", flush=True)
