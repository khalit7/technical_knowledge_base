"""HTTP/2 flow control, recorded frame by frame: a 200,000-byte download with three receive windows.

The client (h2 library) sets its stream window with SETTINGS_INITIAL_WINDOW_SIZE and its connection window with a
WINDOW_UPDATE on stream 0, then downloads GET /big?n=200000 from the lab server. It returns credit (WINDOW_UPDATE) only
after holding it for DELAY seconds, standing in for the round trip a real network adds (loopback has almost none):
that hold is simulated, everything else is the server's real behaviour. Records every DATA frame and WINDOW_UPDATE
with its time. Writes raw/flow_h2.json.
Usage: python flow_h2.py <ca.pem> <tls port> <out.json>
"""
import json, socket, ssl, sys, time
import h2.config, h2.connection, h2.events, h2.settings

CA, PORT, OUT = sys.argv[1], int(sys.argv[2]), sys.argv[3]
N, DELAY = 200000, 0.05


def run(window):
    ctx = ssl.create_default_context(cafile=CA); ctx.set_alpn_protocols(["h2"])
    s = ctx.wrap_socket(socket.create_connection(("127.0.0.1", PORT)), server_hostname="api.llm.test")
    c = h2.connection.H2Connection(h2.config.H2Configuration(client_side=True))
    c.local_settings = h2.settings.Settings(client=True, initial_values={h2.settings.SettingCodes.INITIAL_WINDOW_SIZE: window})
    c.initiate_connection()
    if window > 65535:
        c.increment_flow_control_window(window - 65535)  # connection window starts at 65,535 whatever SETTINGS says
    s.sendall(c.data_to_send())
    t0 = time.perf_counter(); log = []; pending = []; got = 0
    c.send_headers(1, [(":method", "GET"), (":scheme", "https"), (":authority", "api.llm.test"), (":path", f"/big?n={N}")], end_stream=True)
    s.sendall(c.data_to_send()); s.settimeout(0.005); done = False
    while not done:
        now = time.perf_counter()
        due = [p for p in pending if p[0] <= now]
        for p in due:
            pending.remove(p)
            c.acknowledge_received_data(p[1], 1)
            d = c.data_to_send()
            if d:
                s.sendall(d)
                log.append({"t": round((time.perf_counter() - t0) * 1000, 1), "dir": "out", "type": "WINDOW_UPDATE", "bytes": p[1]})
        try:
            d = s.recv(65536)
        except (socket.timeout, ssl.SSLWantReadError):
            continue
        if not d:
            break
        for ev in c.receive_data(d):
            if isinstance(ev, h2.events.DataReceived):
                got += len(ev.data)
                log.append({"t": round((time.perf_counter() - t0) * 1000, 1), "dir": "in", "type": "DATA", "bytes": len(ev.data)})
                pending.append((time.perf_counter() + DELAY, ev.flow_controlled_length))
            if isinstance(ev, h2.events.StreamEnded):
                done = True
        d = c.data_to_send()
        if d: s.sendall(d)
    total = round((time.perf_counter() - t0) * 1000, 1)
    s.close()
    return {"window": window, "received": got, "total_ms": total, "frames": log}


res = [run(w) for w in (16384, 65535, 1048576)]
for r in res:
    print(r["window"], r["total_ms"], len([f for f in r["frames"] if f["type"] == "DATA"]))
json.dump({"recorded": time.strftime("%Y-%m-%d"), "server": "hypercorn 0.18.0 (lab_server.py), 127.0.0.1",
           "note": f"Client holds each WINDOW_UPDATE for {int(DELAY*1000)} ms (simulated round trip); everything else is measured.",
           "bytes": N, "delay_ms": DELAY * 1000, "runs": res}, open(OUT, "w"), indent=1)
