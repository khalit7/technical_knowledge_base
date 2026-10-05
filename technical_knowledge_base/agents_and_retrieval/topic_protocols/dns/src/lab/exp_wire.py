"""E2: the bytes of one real query and its answer. A client container sends 'api.llm.test A' with EDNS(0) (buffer
1232, as stub resolvers that use EDNS do) to the lab's Unbound and records both datagrams as hex, plus a second
answer (www.llm.test, a CNAME) to show name compression. Output: out/wire.json"""
import time
from common import *

CODE = r'''
import dns.message, dns.flags, socket, json
out = {}
for qname in ["api.llm.test", "www.llm.test"]:
    q = dns.message.make_query(qname, "A", use_edns=0, payload=1232); q.id = 0x5a17
    w = q.to_wire(); s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.settimeout(3)
    s.sendto(w, ("10.53.0.53", 53)); r = s.recv(4096)
    out[qname] = {"query": w.hex(), "response": r.hex(), "text": dns.message.from_wire(r).to_text()}
print(json.dumps(out))
'''


def main():
    hierarchy_up("unsigned"); unbound("proto-dns-unbound", "10.53.0.53", ""); time.sleep(3)
    client("dig @10.53.0.53 api.llm.test +short >/dev/null")  # warm the cache first, so the answer has a TTL below 60
    time.sleep(2)
    import json
    open(os.path.join(WORK, "wire_code.py"), "w").write(CODE)
    out = sh(["docker", "run", *CAP, "--name", "proto-dns-pod", "--network", NET, "--ip", "10.53.0.100",
              "-v", f"{WORK}:/work:ro", TOOLS, "python3", "/work/wire_code.py"]).stdout
    save("wire", {"when": now_iso(), "runs": json.loads(out)})


if __name__ == "__main__":
    main()
