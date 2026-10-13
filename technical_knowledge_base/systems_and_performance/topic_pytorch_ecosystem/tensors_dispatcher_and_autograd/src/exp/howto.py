import os, re, torch
x = torch.randn(8, 256)
print(torch._C._dispatch_keys(x))
print(torch._C._dispatch_tls_local_exclude_set())   # the Autocast keys, excluded by default
print(torch.ops.aten.add_.Tensor._schema)
for line in torch._C._dispatch_dump_table("aten::linear").splitlines():
    key = line.split(":")[0]
    if key in ("CPU", "MPS", "Meta", "ADInplaceOrView", "AutogradCPU", "AutocastCPU", "Python"):
        print(re.sub(r"registered at \S*/", "registered at ", line))  # keep the file name only
# Recorded for the page with:  PY howto.py > out.txt; then inputs/howto.json = {"code": <this file up to this comment>, "out": out.txt}
