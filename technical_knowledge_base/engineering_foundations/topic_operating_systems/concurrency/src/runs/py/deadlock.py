"""Section 6: a deadlock in Python, and how to see it from outside.
Two threads take two locks in opposite orders (OSTEP 32.3). Run it, then look at it with py-spy and /proc
(deadlock.sh does both). With --ordered both threads take the locks in the same order and it finishes."""
import sys, threading, time

metrics_lock = threading.Lock()   # say, guards a metrics dict
ckpt_lock = threading.Lock()      # say, guards the checkpoint state


def logger():                     # takes metrics, then checkpoint
    with metrics_lock:
        time.sleep(0.1)
        with ckpt_lock:
            pass


def saver():                      # takes checkpoint, then metrics: the opposite order
    first, second = (metrics_lock, ckpt_lock) if "--ordered" in sys.argv else (ckpt_lock, metrics_lock)
    with first:
        time.sleep(0.1)
        with second:
            pass


a = threading.Thread(target=logger, name="logger")
b = threading.Thread(target=saver, name="saver")
a.start(); b.start()
a.join(); b.join()
print("finished")
