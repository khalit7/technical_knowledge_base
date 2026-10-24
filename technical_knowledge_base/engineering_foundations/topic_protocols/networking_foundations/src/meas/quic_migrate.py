"""One QUIC connection that changes its client address halfway, recorded with qlog (aioquic, loopback, UDP 30020).

The client opens a connection to a tiny echo server, sends one stream ("before"), then moves to a brand-new UDP
socket (a new source port, which is what a NAT rebinding or a Wi-Fi to mobile switch looks like to the server),
switches to a fresh connection ID and sends a second stream ("after") on the same connection. A TCP connection is
named by its address pair, so the same move would end it; QUIC names the connection by connection ID, validates the
new path (PATH_CHALLENGE / PATH_RESPONSE) and carries on.

Prints a JSON summary of both qlogs: every packet sent and received (time, packet type, size, frame types), the
handshake round trips and the datagram sizes, which is what the page draws. Usage: python quic_migrate.py <pki dir>
(the pki dir holds server.pem/server.key/ca.pem from the root's wire/make_ca.sh).
"""
import asyncio, json, os, socket, sys, time
from aioquic.asyncio import connect, serve
from aioquic.asyncio.protocol import QuicConnectionProtocol
from aioquic.quic.configuration import QuicConfiguration
from aioquic.quic.events import StreamDataReceived
from aioquic.quic.logger import QuicLogger

from aioquic.quic.connection import QuicConnection

PORT = 30020
# record every UDP datagram on the wire (size and port), next to the qlog's per-packet view
DGRAMS = []
_send, _recv = QuicConnection.datagrams_to_send, QuicConnection.receive_datagram
def _send_w(self, now):
    out = _send(self, now)
    for data, addr in out:
        DGRAMS.append(dict(t=time.perf_counter(), who="client" if self._is_client else "server", dir="sent", bytes=len(data)))
    return out
def _recv_w(self, data, addr, now):
    DGRAMS.append(dict(t=time.perf_counter(), who="client" if self._is_client else "server", dir="recv", bytes=len(data), from_port=addr[1]))
    return _recv(self, data, addr, now)
QuicConnection.datagrams_to_send, QuicConnection.receive_datagram = _send_w, _recv_w
ALPN = ["kb-echo"]


class Echo(QuicConnectionProtocol):
    def quic_event_received(self, ev):
        if isinstance(ev, StreamDataReceived):
            self._quic.send_stream_data(ev.stream_id, b"echo:" + ev.data, end_stream=ev.end_stream)
            self.transmit()


class Client(QuicConnectionProtocol):
    def __init__(self, *a, **k):
        super().__init__(*a, **k); self.waiters = {}
    def quic_event_received(self, ev):
        if isinstance(ev, StreamDataReceived) and ev.end_stream:
            w = self.waiters.pop(ev.stream_id, None)
            if w and not w.done(): w.set_result(ev.data)
    async def ask(self, msg):
        sid = self._quic.get_next_available_stream_id()
        fut = asyncio.get_running_loop().create_future(); self.waiters[sid] = fut
        self._quic.send_stream_data(sid, msg, end_stream=True); self.transmit()
        return await asyncio.wait_for(fut, 5)


def summarise(qlog, role):
    tr = qlog["traces"][0]; evs = tr["events"]; out = []
    t0 = None
    for e in evs:
        name = e.get("name", ""); data = e.get("data", {})
        if name not in ("transport:packet_sent", "transport:packet_received"):
            continue
        t = e["time"]; t0 = t if t0 is None else t0
        hdr = data.get("header", {})
        frames = [f.get("frame_type") for f in data.get("frames", [])]
        out.append(dict(t_ms=round(t - t0, 3), dir="sent" if name.endswith("sent") else "recv", type=hdr.get("packet_type"),
                        pn=hdr.get("packet_number"), size=data.get("raw", {}).get("length"),
                        dcid=hdr.get("dcid", "")[:8], frames=sorted(set(frames), key=frames.index)))
    return dict(role=role, packets=out)


async def main(pki):
    sl, cl = QuicLogger(), QuicLogger()
    scfg = QuicConfiguration(is_client=False, alpn_protocols=ALPN, quic_logger=sl)
    scfg.load_cert_chain(os.path.join(pki, "server.pem"), os.path.join(pki, "server.key"))
    server = await serve("127.0.0.1", PORT, configuration=scfg, create_protocol=Echo)
    ccfg = QuicConfiguration(is_client=True, alpn_protocols=ALPN, quic_logger=cl, server_name="api.llm.test")
    ccfg.load_verify_locations(os.path.join(pki, "ca.pem"))
    log = []
    t0 = time.perf_counter()
    async with connect("127.0.0.1", PORT, configuration=ccfg, create_protocol=Client) as c:
        log.append(dict(step="handshake done", ms=round((time.perf_counter() - t0) * 1000, 2),
                        local_port=c._transport.get_extra_info("sockname")[1]))
        r1 = await c.ask(b"before")
        log.append(dict(step="stream 0 answered", reply=r1.decode(), ms=round((time.perf_counter() - t0) * 1000, 2)))
        old = c._transport
        loop = asyncio.get_running_loop()
        # same kind of socket aioquic's connect() makes (dual-stack IPv6, unbound port), so a new source port
        sock = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
        sock.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0); sock.bind(("::", 0, 0, 0))
        newt, _ = await loop.create_datagram_endpoint(lambda: c, sock=sock)
        c._quic.change_connection_id()
        log.append(dict(step="moved to a new UDP socket", local_port=newt.get_extra_info("sockname")[1]))
        r2 = await c.ask(b"after")
        log.append(dict(step="stream 4 answered on the same connection", reply=r2.decode(), ms=round((time.perf_counter() - t0) * 1000, 2)))
        old.close()
    server.close()
    await asyncio.sleep(0.1)
    return dict(recorded=time.strftime("%Y-%m-%d %H:%M %Z"), aioquic=__import__("aioquic").__version__, steps=log,
                datagrams=[dict({k: v for k, v in d.items() if k != "t"}, t_ms=round((d["t"] - DGRAMS[0]["t"]) * 1000, 3)) for d in DGRAMS],
                client=summarise(cl.to_dict(), "client"), server=summarise(sl.to_dict(), "server"))


if __name__ == "__main__":
    print(json.dumps(asyncio.run(main(sys.argv[1])), indent=1))
