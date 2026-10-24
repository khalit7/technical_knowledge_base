# Image credits

| File | Title | Author | Licence | Source |
|---|---|---|---|---|
| `allocator_state_history.webp` | Allocator State History view of a CUDA memory snapshot (pytorch.org/memory_viz), top 360 px of the original, resized to 900 px | PyTorch contributors (PyTorch documentation, "Understanding CUDA Memory Usage") | BSD-3-Clause (the PyTorch repository's licence) | https://github.com/pytorch/pytorch/blob/40cbda274b92f1d95020adabe07f0163112691cb/docs/source/_static/img/torch_cuda_memory/allocator_state_history.png |
| `active_memory_timeline.webp` | Active Memory Timeline view of a CUDA memory snapshot, top 650 px of the original (stack-trace panel cropped), resized to 800 px | PyTorch contributors (PyTorch documentation, "Understanding CUDA Memory Usage") | BSD-3-Clause (the PyTorch repository's licence) | https://github.com/pytorch/pytorch/blob/40cbda274b92f1d95020adabe07f0163112691cb/docs/source/_static/img/torch_cuda_memory/active_memory_timeline.png |

Both are shown on https://docs.pytorch.org/docs/stable/torch_cuda_memory.html. Converted with `cwebp -q 80 -crop ... -resize ...` on 2026-10-24.
