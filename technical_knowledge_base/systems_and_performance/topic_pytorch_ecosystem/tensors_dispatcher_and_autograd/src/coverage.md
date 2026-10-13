# Coverage

New page: the Notion page held only "Being built: the interactive page will replace this text." (fetched 2026-10-13). No old child page to carry. The old root's claims about tensors, the dispatcher and autograd (root `src/read/coverage.md` rows 10, 11, 17) are verified there and deepened here; nothing marked corrected or unconfirmed there is reintroduced.

## Corrections and findings against common claims (made visible on the page)

- `torch.utils.checkpoint` without `use_reentrant`: the docstring and warning say an exception from 2.9; at 2.14.1 it still warns and uses `use_reentrant=True` (checkpoint.py L635-647 at v2.14.1; measured). Reading 3.9.
- "no_grad stops version counting": false, the write under no_grad bumped the counter (measured). Reading 1.6.
- "no_grad removes the autograd key": false, the TLS sets are unchanged; inference_mode is what excludes autograd keys (InferenceMode.h L54-74; measured). Reading 2.3.
- "Autocast keys appear only under autocast": tensors always carry AutocastCPU; the thread excludes it by default (DispatchKeySet.h L670-686). Reading 2.3.
- Saved-tensor hooks disable the version check (saved_variable.cpp L165-167): an identity pack gives a wrong gradient silently (measured). Reading 3.4, lab.
- `to_empty` after building on meta unties tied weights; `make_model` (`.to`) under FakeTensorMode fails "Couldn't swap Embedding.weight" (measured). Reading 2.8.
- Loading different tensors under two tied names: the later name wins silently (measured). Reading 4.2.
- MPS training is not bit-repeatable even with `use_deterministic_algorithms(True)`, which raised nothing (measured). Reading 4.5.
- A float32 `norm()` over the 3.2M concatenated gradient values differs in the 4th digit from float64 and from `clip_grad_norm_` (11.0973 vs 11.1032); the page uses float64 references.
- `DataLoader(pin_memory=True)` on this Mac warns and does not pin, while `tensor.pin_memory()` works (measured).

## Unconfirmed / not run

- Anything CUDA-only: deterministic-mode errors (cited from the 2.14 docs), async pinned copies, CUDA autocast list. Said "not run here".
