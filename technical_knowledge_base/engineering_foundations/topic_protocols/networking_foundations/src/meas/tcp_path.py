"""Window over round trip, measured on a real internet path (macOS, read-only, low volume).

Downloads from Cloudflare's public speed-test endpoint (https://speed.cloudflare.com/__down?bytes=N, the endpoint
its speed test page uses) over TLS on a plain kernel TCP socket, with the receive buffer fixed by SO_RCVBUF
(set before connect, so the window-scale option in the SYN matches) or left to autotuning. For each run it records
the TCP connect time, the kernel's smoothed RTT and receive window (getsockopt TCP_CONNECTION_INFO, macOS), and the
goodput over the second half of the transfer. The autotuned run also keeps a time series of bytes received and of
the receive window, which shows slow start (bytes per round trip doubling) and autotuning (the window growing).

Prints JSON to stdout. Addresses are not recorded. Usage: python tcp_path.py > out/tcp_path.json
"""
import json, socket, ssl, struct, sys, time, platform
import certifi

HOST = "speed.cloudflare.com"
TCP_CONNECTION_INFO = 0x106
FMT = "<BBBBIIIIIIIIIIIIIQQQQQQQ"   # struct tcp_connection_info (netinet/tcp.h, macOS SDK)
FIELDS = ["state", "snd_wscale", "rcv_wscale", "pad", "options", "flags", "rto", "maxseg", "ssthresh", "cwnd",
          "snd_wnd", "snd_sbbytes", "rcv_wnd", "rttcur", "srtt", "rttvar", "tfo", "txpackets", "txbytes",
          "txretransmitbytes", "rxpackets", "rxbytes", "rxoutoforderbytes", "txretransmitpackets"]


def info(s):
    raw = s.getsockopt(socket.IPPROTO_TCP, TCP_CONNECTION_INFO, struct.calcsize(FMT))
    return dict(zip(FIELDS, struct.unpack(FMT, raw)))


def run(nbytes, rcvbuf, series=False):
    addr = socket.getaddrinfo(HOST, 443, socket.AF_INET, socket.SOCK_STREAM)[0][4]
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    if rcvbuf:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, rcvbuf)
    t0 = time.perf_counter(); s.connect(addr); t_conn = time.perf_counter() - t0
    i_conn = info(s)
    ctx = ssl.create_default_context(cafile=certifi.where())
    ts = ctx.wrap_socket(s, server_hostname=HOST)
    req = (f"GET /__down?bytes={nbytes} HTTP/1.1\r\nHost: {HOST}\r\nUser-Agent: kb-networking-foundations\r\n"
           "Accept: */*\r\nConnection: close\r\n\r\n").encode()
    t_req = time.perf_counter(); ts.sendall(req)
    got = 0; marks = []; samples = []; buf = bytearray(65536); last_i = 0
    while True:
        n = ts.recv_into(buf)
        if not n:
            break
        now = time.perf_counter() - t_req
        got += n; marks.append((now, got))
        if series and now - last_i >= 0.004:
            last_i = now; d = info(ts); samples.append((round(now * 1000, 1), d["rcv_wnd"], d["srtt"], got))
    t_end = time.perf_counter() - t_req
    i_end = info(ts); ts.close()
    # goodput over the second half of the bytes (after slow start and autotuning settle)
    half = got / 2; t_half = next(t for t, g in marks if g >= half)
    goodput = (got - half) * 8 / (t_end - t_half) / 1e6
    first_byte = marks[0][0]
    r = dict(rcvbuf=rcvbuf or "auto", bytes=got, connect_ms=round(t_conn * 1000, 1), first_byte_ms=round(first_byte * 1000, 1),
             total_s=round(t_end, 3), goodput_mbps=round(goodput, 2), srtt_ms=i_end["srtt"], rttcur_ms=i_end["rttcur"],
             rcv_wnd=i_end["rcv_wnd"], rcv_wscale=i_conn["rcv_wscale"], snd_wscale=i_conn["snd_wscale"], maxseg=i_conn["maxseg"],
             options=i_conn["options"], rxoutoforderbytes=i_end["rxoutoforderbytes"], rxpackets=i_end["rxpackets"])
    if series:
        # bytes received per 10 ms bin over the first 1.5 s, and the receive-window samples (thinned)
        bins = {}
        for t, g in marks:
            if t > 1.5: break
            bins[int(t * 100)] = g
        r["cum_10ms"] = [[k * 10, v] for k, v in sorted(bins.items())]
        r["wnd_samples"] = samples[:: max(1, len(samples) // 300)]
    return r


def main():
    out = dict(recorded=time.strftime("%Y-%m-%d %H:%M %Z"), machine=platform.platform(), host=HOST,
               note="Each run is one fresh TCP connection over IPv4 with TLS; goodput is measured over the second half of the bytes.",
               runs=[])
    plan = [(16384, 2_000_000), (65536, 4_000_000), (262144, 10_000_000), (None, 25_000_000)]
    for rep in range(3):
        for rcvbuf, n in plan:
            try:
                out["runs"].append(dict(rep=rep, **run(n, rcvbuf, series=(rcvbuf is None and rep == 0))))
            except Exception as e:
                out["runs"].append(dict(rep=rep, rcvbuf=rcvbuf or "auto", error=repr(e)))
            print(json.dumps({k: v for k, v in out["runs"][-1].items() if k not in ("cum_10ms", "wnd_samples")}), file=sys.stderr)
            time.sleep(1)
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
