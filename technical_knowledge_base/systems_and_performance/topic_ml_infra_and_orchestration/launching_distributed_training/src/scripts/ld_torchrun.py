"""ld_torchrun.py: torchrun (torch.distributed.run.main) with the rendezvous made visible. Same arguments as torchrun.

torch 2.14.1 records every dynamic-rendezvous step as an event (dynamic_rendezvous.py, self._record(...)), but the
"dynamic_rendezvous" event handler is a logging.NullHandler (elastic/events/handlers.py), so nothing is printed.
This wrapper swaps in a StreamHandler (one JSON event per line, prefixed with the unix time) and turns on the
module's DEBUG logger, then calls torchrun's own main(). Nothing else changes.
"""
import logging, sys
import torch.distributed.elastic.events.handlers as h

ev = logging.StreamHandler(sys.stderr)
ev.setFormatter(logging.Formatter("%(created).3f LDEV %(message)s"))
h._log_handlers["dynamic_rendezvous"] = ev
dbg = logging.StreamHandler(sys.stderr)
dbg.setFormatter(logging.Formatter("%(created).3f LDDBG %(message)s"))
lg = logging.getLogger("torch.distributed.elastic.rendezvous.dynamic_rendezvous")
lg.setLevel(logging.DEBUG); lg.addHandler(dbg); lg.propagate = False

from torch.distributed.run import main  # noqa: E402

if __name__ == "__main__":
    sys.exit(main())
