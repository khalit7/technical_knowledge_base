# list interfaces in getifaddrs order with IPv4 address, flags (what NCCL's ncclOsFindInterfaces walks)
import ctypes, ctypes.util, socket, json
libc = ctypes.CDLL(ctypes.util.find_library("c"), use_errno=True)
class sockaddr(ctypes.Structure): _fields_ = [("sa_family", ctypes.c_ushort), ("sa_data", ctypes.c_char * 14)]
class ifaddrs(ctypes.Structure): pass
ifaddrs._fields_ = [("ifa_next", ctypes.POINTER(ifaddrs)), ("ifa_name", ctypes.c_char_p), ("ifa_flags", ctypes.c_uint),
                    ("ifa_addr", ctypes.POINTER(sockaddr)), ("ifa_netmask", ctypes.POINTER(sockaddr))]
p = ctypes.POINTER(ifaddrs)(); libc.getifaddrs(ctypes.byref(p)); out = []; cur = p
while cur:
    i = cur.contents
    if i.ifa_addr and i.ifa_addr.contents.sa_family in (socket.AF_INET, socket.AF_INET6):
        fam = "inet" if i.ifa_addr.contents.sa_family == socket.AF_INET else "inet6"
        raw = ctypes.string_at(ctypes.addressof(i.ifa_addr.contents), 16)[2:]
        addr = socket.inet_ntoa(raw[2:6]) if fam == "inet" else "(ipv6)"
        out.append({"name": i.ifa_name.decode(), "fam": fam, "addr": addr, "up": bool(i.ifa_flags & 1), "running": bool(i.ifa_flags & 0x40), "loopback": bool(i.ifa_flags & 8)})
    cur = i.ifa_next
print(json.dumps(out))
