"""Source excerpts quoted on the page, cut from PyTorch at the v2.14.1 tag with their line numbers.

python3 quotes.py <dir holding the v2.14.1 files> > ../inputs/sources.json
(The files are fetched from https://raw.githubusercontent.com/pytorch/pytorch/v2.14.1/<path>; the Python ones are
byte-identical to the installed 2.14.1 wheel, checked with cmp.)
"""
import json
import sys

SRC = sys.argv[1]
URL = "https://github.com/pytorch/pytorch/blob/v2.14.1/"
Q = [
    ("keyset", "aten/src/ATen/core/dispatch/DispatchKeyExtractor.h", 39, 47,
     "How the dispatcher computes a call's key set: the union of the inputs' keys, plus the thread's included keys, minus its excluded keys, minus fallthroughs."),
    ("tls_default", "c10/core/DispatchKeySet.h", 670, 686,
     "The thread-local defaults: ADInplaceOrView is switched on for every call, the Autocast keys are switched off until autocast is entered."),
    ("table", "aten/src/ATen/core/dispatch/OperatorEntry.cpp", 352, 380,
     "How one entry of an operator's dispatch table is chosen (the rule continues below these lines)."),
    ("fallback", "aten/src/ATen/core/VariableFallbackKernel.cpp", 62, 105,
     "Boxed fallbacks: one function for every operator at the autograd keys; a fallthrough for ADInplaceOrView."),
    ("autocast", "aten/src/ATen/autocast_mode.cpp", 333, 353,
     "Autocast on the CPU: a fallthrough for every operator, then a kernel for each operator that should run in lower precision."),
    ("inference", "c10/core/InferenceMode.h", 54, 74,
     "What entering inference_mode changes: grad mode off, ADInplaceOrView no longer included, every autograd key excluded."),
    ("inplace_view", "torch/csrc/autograd/VariableTypeManual.cpp", 391, 403,
     "The ADInplaceOrView kernel of copy_: run the copy below this key, then bump the version counter."),
    ("readyqueue", "torch/csrc/autograd/engine.h", 87, 114,
     "The engine's ready queue: a priority queue on sequence number (later-created nodes first)."),
    ("accumulate", "torch/csrc/autograd/functions/accumulate_grad.cpp", 88, 93,
     "AccumulateGrad takes the largest sequence number, so it runs as soon as it is ready."),
    ("cpuqueue", "torch/csrc/autograd/engine.cpp", 68, 74,
     "Which devices share the calling thread's ready queue."),
    ("devthreads", "torch/csrc/autograd/engine.cpp", 1666, 1697,
     "One worker thread per non-CPU device, started once."),
    ("version", "torch/csrc/autograd/saved_variable.cpp", 165, 192,
     "The version check when a saved tensor is unpacked (skipped when saved-tensor hooks are installed)."),
    ("ckpt_default", "torch/utils/checkpoint.py", 635, 647,
     "checkpoint() without use_reentrant: still a warning and still the reentrant variant at 2.14.1, although the warning names 2.9 for the change."),
    ("worker_seed", "torch/utils/data/_utils/worker.py", 275, 282,
     "How each DataLoader worker seeds random, torch and numpy."),
    ("scaler", "torch/amp/grad_scaler.py", 126, 129,
     "GradScaler defaults."),
]
out = {}
for key, path, a, b, cap in Q:
    lines = open(f"{SRC}/{path}").read().split("\n")
    out[key] = {"file": path, "start": a, "end": b, "url": f"{URL}{path}#L{a}-L{b}", "caption": cap, "text": "\n".join(lines[a - 1:b])}
print(json.dumps(out, indent=1))
