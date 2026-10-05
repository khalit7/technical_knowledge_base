"""Send the Wire Lab request as raw HTTP/1.1 bytes over a plain TCP socket (port 8080, no TLS)
and record exactly what went out and what came back, with arrival times.
Writes raw/h1_request.bin, raw/h1_response.bin, raw/h1_arrivals.json."""
import json, os, socket, time
HERE = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(HERE, "raw")
body = open(os.path.join(HERE, "request.json"), "rb").read()
req = (b"POST /v1/messages HTTP/1.1\r\nHost: api.llm.test\r\ncontent-type: application/json\r\n"
       b"x-api-key: sk-wirelab-not-a-real-key\r\ncontent-length: " + str(len(body)).encode() + b"\r\nconnection: close\r\n\r\n" + body)
t0 = time.perf_counter(); s = socket.create_connection(("127.0.0.1", 8080)); t_conn = time.perf_counter()
s.sendall(req); arr = []; data = b""
while True:
    b = s.recv(65536)
    if not b: break
    arr.append({"t_ms": round((time.perf_counter() - t0) * 1000, 3), "bytes": len(b)}); data += b
open(os.path.join(R, "h1_request.bin"), "wb").write(req); open(os.path.join(R, "h1_response.bin"), "wb").write(data)
json.dump({"connect_ms": round((t_conn - t0) * 1000, 3), "recv": arr}, open(os.path.join(R, "h1_arrivals.json"), "w"), indent=1)
print(len(req), len(data), arr)
