"""Bulk download over HTTP/2 (cleartext, prior knowledge) with a chosen flow-control window, using the h2 library.
python h2_bulk.py server PORT                     serves SIZE bytes on any GET, as fast as the window allows
python h2_bulk.py client PORT WINDOW_BYTES MB     downloads MB megabytes and prints the throughput
The client advertises WINDOW_BYTES as both the stream and connection window and returns credit (WINDOW_UPDATE)
for every DATA frame as soon as it arrives, so at most WINDOW_BYTES can be in flight per round trip."""
import socket, sys, time, threading
import h2.config, h2.connection, h2.events, h2.settings

mode, port = sys.argv[1], int(sys.argv[2])


def serve_conn(sock):
    c = h2.connection.H2Connection(h2.config.H2Configuration(client_side=False))
    c.initiate_connection(); sock.sendall(c.data_to_send())
    todo = {}  # stream id -> bytes left
    while True:
        data = sock.recv(65536)
        if not data:
            return
        for ev in c.receive_data(data):
            if isinstance(ev, h2.events.RequestReceived):
                size = int(dict(ev.headers).get(b"x-size", b"1048576"))
                c.send_headers(ev.stream_id, [(":status", "200"), ("content-length", str(size))]); todo[ev.stream_id] = size
        for sid in list(todo):
            while todo[sid] > 0:
                n = min(c.local_flow_control_window(sid), c.max_outbound_frame_size, todo[sid])
                if n <= 0:
                    break
                todo[sid] -= n
                c.send_data(sid, b"\0" * n, end_stream=todo[sid] == 0)
            if todo[sid] == 0:
                del todo[sid]
        out = c.data_to_send()
        if out:
            sock.sendall(out)


if mode == "server":
    ls = socket.socket(); ls.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); ls.bind(("127.0.0.1", port)); ls.listen(16)
    while True:
        s, _ = ls.accept(); threading.Thread(target=serve_conn, args=(s,), daemon=True).start()
else:
    win, mb = int(sys.argv[3]), float(sys.argv[4]); size = int(mb * 1_000_000)
    s = socket.create_connection(("127.0.0.1", port)); s.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
    c = h2.connection.H2Connection(h2.config.H2Configuration(client_side=True))
    c.initiate_connection()
    c.update_settings({h2.settings.SettingCodes.INITIAL_WINDOW_SIZE: win})
    if win > 65535:
        c.increment_flow_control_window(win - 65535)  # connection-level window starts at 65,535 (RFC 9113 6.9.2)
    t0 = time.perf_counter()
    sid = c.get_next_available_stream_id()
    c.send_headers(sid, [(":method", "GET"), (":path", "/blob"), (":scheme", "http"), (":authority", "lab"), ("x-size", str(size))], end_stream=True)
    s.sendall(c.data_to_send()); got = 0; done = False
    while not done:
        for ev in c.receive_data(s.recv(1 << 20)):
            if isinstance(ev, h2.events.DataReceived):
                got += len(ev.data); c.acknowledge_received_data(ev.flow_controlled_length, ev.stream_id)
            elif isinstance(ev, h2.events.StreamEnded):
                done = True
        s.sendall(c.data_to_send())
    dt = time.perf_counter() - t0
    print(f"window {win:>9,} B  got {got / 1e6:.1f} MB in {dt:6.2f} s  = {got / dt / 1e6:7.2f} MB/s")
