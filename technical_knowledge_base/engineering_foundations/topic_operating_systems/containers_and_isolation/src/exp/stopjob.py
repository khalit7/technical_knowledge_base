"""A stand-in for the training job's shutdown path: on SIGTERM it saves a checkpoint that takes about 1 s
(write, sleep, fsync, rename), then exits 0. Every event goes to /out/log with a timestamp, so the log shows
whether SIGTERM arrived and whether the checkpoint finished. (The root's real job checkpoints in milliseconds;
1 s makes the window visible.)"""
import os, signal, time
def log(msg):
    with open("/out/log", "a") as f: f.write(f"{time.time():.3f} pid{os.getpid()} {msg}\n")
stop = False
def on_term(sig, frame):
    global stop; stop = True; log("SIGTERM received")
signal.signal(signal.SIGTERM, on_term)
log(f"started, ppid {os.getppid()}")
step = 0
while not stop:
    time.sleep(0.05); step += 1
log(f"checkpoint begin at step {step}")
with open("/out/ckpt.tmp", "w") as f:
    f.write("half"); f.flush(); time.sleep(1.0); f.write(" done"); f.flush(); os.fsync(f.fileno())
os.replace("/out/ckpt.tmp", "/out/ckpt")
log("checkpoint saved; exit 0")
