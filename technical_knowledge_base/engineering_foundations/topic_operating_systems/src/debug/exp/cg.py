"""Small helpers to read this container's cgroup v2 files."""
def stat(name, keys):
    d = {}
    for line in open(f"/sys/fs/cgroup/{name}"):
        k, v = line.split()[:2]
        d[k] = v
    return {k: int(d.get(k, 0)) for k in keys}


def io():
    """read bytes and read operations charged to this cgroup, summed over devices (io.stat)."""
    rb = rios = 0
    for line in open("/sys/fs/cgroup/io.stat"):
        for f in line.split()[1:]:
            k, v = f.split("=")
            if k == "rbytes": rb += int(v)
            if k == "rios": rios += int(v)
    return rb, rios


def evict(path):
    """Drop one file's clean pages from the page cache (no root needed; drop_caches would need it)."""
    import os
    fd = os.open(path, os.O_RDONLY)
    os.fsync(fd)
    os.posix_fadvise(fd, 0, 0, os.POSIX_FADV_DONTNEED)
    os.close(fd)
