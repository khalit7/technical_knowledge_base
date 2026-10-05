"""PID 1 that never calls wait(): a stand-in for a training script run as a container's main process.
It starts a helper through a shell that backgrounds a short task and exits, as launch scripts often do.
The short task's parent is gone, so the kernel hands it to PID 1; when it exits, only PID 1 can reap it."""
import os, subprocess, time
print(f"I am pid {os.getpid()}", flush=True)
subprocess.run(["sh", "-c", "sleep 1 & echo helper started pid $!"])  # the shell exits at once
time.sleep(3)  # the orphaned sleep has exited by now
print(subprocess.run(["ps", "-eo", "pid,ppid,stat,comm"], capture_output=True, text=True).stdout, end="", flush=True)
