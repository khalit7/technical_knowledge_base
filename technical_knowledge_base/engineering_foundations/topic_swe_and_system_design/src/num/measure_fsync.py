"""Measure the cost of a durable 4 KiB write on this machine.
Three modes: write only (page cache), write + os.fsync, write + F_FULLFSYNC (macOS: forces the drive to flush its cache).
Output: inputs/fsync_local.json. Run: python3 measure_fsync.py"""
import os, time, json, fcntl, platform, statistics, subprocess, datetime, tempfile
N = 400
def run(mode):
    fd, path = tempfile.mkstemp(dir=os.path.expanduser('~'))
    buf = os.urandom(4096); ts = []
    try:
        for i in range(N):
            t = time.perf_counter()
            os.pwrite(fd, buf, (i % 64) * 4096)
            if mode == 'fsync': os.fsync(fd)
            elif mode == 'fullfsync': fcntl.fcntl(fd, fcntl.F_FULLFSYNC)
            ts.append((time.perf_counter() - t) * 1e6)
    finally:
        os.close(fd); os.unlink(path)
    ts.sort()
    return {'n': N, 'median_us': round(statistics.median(ts), 1), 'p99_us': round(ts[int(N * .99) - 1], 1), 'mean_us': round(statistics.mean(ts), 1)}
out = {'date': datetime.date.today().isoformat(), 'machine': subprocess.run(['sysctl', '-n', 'machdep.cpu.brand_string'], capture_output=True, text=True).stdout.strip() + ', internal Apple SSD, APFS, macOS ' + platform.mac_ver()[0],
       'write_only': run('none'), 'fsync': run('fsync'), 'f_fullfsync': run('fullfsync')}
os.makedirs('inputs', exist_ok=True)
json.dump(out, open('inputs/fsync_local.json', 'w'), indent=1); print(json.dumps(out, indent=1))
