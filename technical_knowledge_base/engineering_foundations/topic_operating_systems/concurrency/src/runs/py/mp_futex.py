"""Section 5: a lock shared by two processes. multiprocessing.Lock is a POSIX semaphore in a shared-memory file
(/dev/shm/sem.*); waiting on it is a futex wait on memory both processes map, so the futex is not "private".
Run under: strace -f -e trace=futex python3 mp_futex.py"""
import multiprocessing as mp, time


def child(lock):
    with lock:          # blocks: the parent holds it
        pass


if __name__ == "__main__":
    mp.set_start_method("fork")
    lock = mp.Lock()
    lock.acquire()
    p = mp.Process(target=child, args=(lock,))
    p.start()
    time.sleep(0.3)     # the child is now asleep in the kernel
    lock.release()      # wakes it
    p.join()
