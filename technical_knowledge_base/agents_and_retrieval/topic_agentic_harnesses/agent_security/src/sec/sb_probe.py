# Benign Seatbelt demonstration helper. Two benign operations: open a TCP socket to a local
# listener and send a fixed benign marker; write a small file. Run with/without a sandbox profile.
# No secret, no attack: this shows a DEFENCE (the sandbox) refusing benign operations it is told to refuse.
import socket, sys, os
op = sys.argv[1]
work = os.environ.get("HSEC_WORK", os.getcwd())
if op == "net":
    try:
        s = socket.create_connection(("127.0.0.1", int(sys.argv[2])), timeout=2)
        s.sendall(b"GET /sandbox-demo-ping HTTP/1.0\r\n\r\n"); s.close()
        print("NETWORK_OK: reached 127.0.0.1")
    except Exception as e:
        print("NETWORK_BLOCKED: %s %s" % (type(e).__name__, e))
elif op == "write_out":
    try:
        p = "/tmp/hsec_wtest.txt"; open(p, "w").write("benign"); print("WRITE_OK: " + p)
    except Exception as e:
        print("WRITE_BLOCKED: %s %s" % (type(e).__name__, e))
elif op == "write_in":
    try:
        p = os.path.join(work, "ok.txt"); open(p, "w").write("benign"); print("WRITE_OK: <WORK>/ok.txt")
    except Exception as e:
        print("WRITE_BLOCKED: %s %s" % (type(e).__name__, e))
