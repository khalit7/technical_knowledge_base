"""The fix for torchrun's process-group SIGTERM: DataLoader workers ignore SIGTERM, so only the trainer
reacts (sets its flag, finishes the step, checkpoints) and then shuts its workers down itself.
torch installs a C-level SIGTERM handler at the start of each worker (_set_worker_signal_handlers);
worker_init_fn runs after it, so ignoring SIGTERM there wins. This wrapper adds that worker_init_fn to
every DataLoader and then runs the root page's unchanged train.py as __main__.
Usage: python ignore_term_in_workers.py /job/train.py [train.py args...]"""
import runpy, signal, sys
import torch.utils.data as tud

def _ignore_term(worker_id):
    signal.signal(signal.SIGTERM, signal.SIG_IGN)

_orig_init = tud.DataLoader.__init__
def _init(self, *a, **k):
    k.setdefault("worker_init_fn", _ignore_term)
    _orig_init(self, *a, **k)
tud.DataLoader.__init__ = _init

script = sys.argv[1]
sys.argv = sys.argv[1:]
runpy.run_path(script, run_name="__main__")
