"""fork() copies only the thread that called it. If another thread held a lock at that moment,
the child gets the lock in its locked state and no thread that could ever release it.
Here a background thread (standing in for a library's worker thread: a logger, a metrics
client, a prefetcher) takes a lock often; the main process then starts a worker process.
Usage: forklock.py fork|spawn"""
import multiprocessing as mp, os, sys, threading, time

lock = threading.Lock()


def busy():
    while True:
        with lock:
            time.sleep(0.01)  # the lock is held about 99% of the time


def child_work():
    print(f"child {os.getpid()}: taking the lock", flush=True)
    with lock:
        print(f"child {os.getpid()}: got it, working", flush=True)


if __name__ == "__main__":
    threading.Thread(target=busy, daemon=True).start()
    time.sleep(0.1)
    ctx = mp.get_context(sys.argv[1])
    p = ctx.Process(target=child_work)
    p.start()
    p.join(timeout=8)
    if p.is_alive():
        print(f"parent: child {p.pid} still stuck after 8 s (start method {sys.argv[1]})", flush=True)
        os.system(f"ps -o pid,stat,wchan:20,cmd -p {p.pid} | cut -c1-70")
        os.system(f"py-spy dump --pid {p.pid} 2>&1 | grep -v '^Python v' | head -n 6")
        p.kill()
    else:
        print(f"parent: child exited with {p.exitcode} (start method {sys.argv[1]})", flush=True)
