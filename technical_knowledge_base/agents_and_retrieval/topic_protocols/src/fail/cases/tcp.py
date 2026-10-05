"""TCP-level throughput and latency: a window over a round trip caps one stream; Nagle plus delayed ACK."""
import lab
from lab import run, save, start

GRID = "for d in 0 10 25 50; do for w in 65535 262144 1048576 4194304; do " \
       "if [ $d = 0 ]; then p=27320; else p=$((27320 + d)); fi; printf 'rtt %3s ms  ' $((2 * d)); $PY h2_bulk.py client $p $w 16; done; done"


def main():
    start([lab.PY, "h2_bulk.py", "server", "27320"], log="h2bulk.log", port=27320)
    for d in (10, 25, 50):
        start([lab.PY, "delay_proxy.py", str(27320 + d), "27320", str(d)], log="delay.log", port=27320 + d)
    save("window_rtt", [
        run("uptime"),
        run(GRID, timeout=300),
        run("sysctl net.inet.tcp.autorcvbufmax net.inet.tcp.sendspace net.inet.tcp.recvspace"),
    ])
    save("nagle", [
        run("$PY nagle_probe.py"),
        run("sysctl net.inet.tcp.delayed_ack"),
    ])
