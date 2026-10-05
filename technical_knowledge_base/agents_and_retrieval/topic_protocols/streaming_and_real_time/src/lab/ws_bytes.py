"""A WebSocket client written on a bare TCP socket, so every byte of the exchange is recorded.

Usage: python ws_bytes.py <port>   (ws_server.py's /tokens)
Steps: opening handshake with RFC 6455's sample key; read the 7 server messages; send a masked text
message; a ping; a message split into two fragments; a close with code 1000. Prints JSON: each step
with direction, raw hex and the decoded header fields.
"""
import base64, hashlib, json, os, socket, struct, sys, time

PORT = int(sys.argv[1])
GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
KEY = "dGhlIHNhbXBsZSBub25jZQ=="           # the sample nonce printed in RFC 6455 section 1.3
OPS = {0: "continuation", 1: "text", 2: "binary", 8: "close", 9: "ping", 10: "pong"}
log = []
s = socket.create_connection(("127.0.0.1", PORT))
s.settimeout(5)
t0 = time.monotonic()


def rec(direction, raw, **info):
    log.append({"t": round(time.monotonic() - t0, 4), "dir": direction, "len": len(raw), "hex": raw.hex(), **info})


def frame(op, payload, fin=True, mask=True):
    b0 = (0x80 if fin else 0) | op
    n = len(payload)
    hdr = bytes([b0]) + (bytes([(0x80 if mask else 0) | n]) if n < 126 else
                         bytes([(0x80 if mask else 0) | 126]) + struct.pack("!H", n))
    if not mask:
        return hdr + payload, None
    key = os.urandom(4)
    return hdr + key + bytes(c ^ key[i % 4] for i, c in enumerate(payload)), key


def send(op, payload, fin=True, note=""):
    raw, key = frame(op, payload, fin)
    s.sendall(raw)
    rec("client to server", raw, fin=fin, opcode=OPS[op], masked=True, mask_key=key.hex(),
        payload_text=payload.decode("utf-8", "replace") if op != 8 else None, note=note)


buf = b""


def read_exact(n):
    global buf
    while len(buf) < n:
        d = s.recv(65536)
        if not d:
            raise EOFError
        buf += d
    out, buf = buf[:n], buf[n:]
    return out


def recv_frame(note=""):
    h = read_exact(2)
    fin, op, masked, n = h[0] >> 7, h[0] & 15, h[1] >> 7, h[1] & 127
    ext = b""
    if n == 126:
        ext = read_exact(2); n = struct.unpack("!H", ext)[0]
    elif n == 127:
        ext = read_exact(8); n = struct.unpack("!Q", ext)[0]
    key = read_exact(4) if masked else b""
    p = read_exact(n)
    info = {"fin": bool(fin), "opcode": OPS.get(op, op), "masked": bool(masked), "payload_len": n, "note": note}
    if op == 8 and n >= 2:
        info["close_code"] = struct.unpack("!H", p[:2])[0]; info["close_reason"] = p[2:].decode()
    elif op in (1, 9, 10):
        info["payload_text"] = p.decode("utf-8", "replace")
    rec("server to client", h + ext + key + p, **info)
    return op, p


req = (f"GET /tokens HTTP/1.1\r\nHost: 127.0.0.1:{PORT}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
       f"Sec-WebSocket-Key: {KEY}\r\nSec-WebSocket-Version: 13\r\nOrigin: https://chat.example\r\n\r\n").encode()
s.sendall(req)
rec("client to server", req, text=req.decode(), note="opening handshake: an ordinary HTTP/1.1 GET")
while b"\r\n\r\n" not in buf:
    buf += s.recv(65536)
head, buf = buf.split(b"\r\n\r\n", 1)
head += b"\r\n\r\n"
expect = base64.b64encode(hashlib.sha1((KEY + GUID).encode()).digest()).decode()
rec("server to client", head, text=head.decode(), note="101 Switching Protocols", accept_expected=expect,
    accept_matches=f"Sec-WebSocket-Accept: {expect}".lower() in head.decode().lower())
for i in range(7):
    recv_frame("the server's messages are never masked")
send(1, b"Stop", note="a client frame: the payload is XORed with a fresh 4-byte key")
recv_frame("echo")
send(9, b"hb", note="ping: the peer must answer with a pong carrying the same bytes")
recv_frame("pong, sent by the library automatically")
send(1, b"Hel", fin=False, note="first fragment: opcode text, FIN=0")
send(0, b"lo", fin=True, note="last fragment: opcode continuation, FIN=1")
recv_frame("the server received one message, 'Hello', and echoed it as one frame")
send(8, struct.pack("!H", 1000) + b"bye", note="close: code 1000 (normal) and a reason")
recv_frame("the close is echoed; then TCP closes")
print(json.dumps({"port": PORT, "accept_expected": expect, "frames": log}, indent=1))
