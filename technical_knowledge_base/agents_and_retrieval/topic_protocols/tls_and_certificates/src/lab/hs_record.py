"""Record the running request's TLS handshake byte by byte and decrypt it with the client's key log.

A local TLS server (Python ssl, OpenSSL 3.5) answers the root page's running request with the root's recorded
response bytes (../../../src/wire/raw/h1_response.bin), one write per SSE event, 120 ms then 50 ms apart as in the
root's server. The client drives TLS through ssl.MemoryBIO, so every byte that crossed the socket is logged, and
writes an SSLKEYLOGFILE; this script then decrypts each TLS 1.3 record (RFC 9846 sections 5.2, 5.3, 7.3) and
re-derives the Finished values and verifies the CertificateVerify signature from the decrypted transcript.

Usage: python hs_record.py <pki dir> <port> <mode> <out.json>
mode: tls13 | mtls | tls12 | rsa | mldsa44 | mldsa65
"""
import hashlib, hmac, json, os, socket, ssl, sys, tempfile, threading, time
sys.path.insert(0, os.path.dirname(__file__))
from tlsparse import (CT, HS, records, hs_messages, parse_hello, parse_certificate, read_keylog, Dec,
                      hkdf_expand_label, suite_params, SIGALGS)

PKI, PORT, MODE, OUT = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
WIRE = os.path.join(os.path.dirname(__file__), "../../../src/wire/raw")
REQ = open(os.path.join(WIRE, "h1_request.bin"), "rb").read()
RESP = open(os.path.join(WIRE, "h1_response.bin"), "rb").read()


def split_response(r):
    """Head plus first chunk, then one piece per chunk (the server writes each SSE event separately)."""
    head_end = r.index(b"\r\n\r\n") + 4
    pieces, i = [], head_end
    while i < len(r):
        nl = r.index(b"\r\n", i); n = int(r[i:nl], 16); end = nl + 2 + n + 2
        pieces.append(r[i:end]); i = end
        if n == 0:
            break
    pieces[0] = r[:head_end] + pieces[0]
    return pieces


PIECES = split_response(RESP)
chain = {"rsa": "rsa_fullchain", "mldsa44": "mldsa44_fullchain", "mldsa65": "mldsa65_fullchain"}.get(MODE, "fullchain")
key = {"rsa": "rsa_leaf", "mldsa44": "mldsa44_leaf", "mldsa65": "mldsa65_leaf"}.get(MODE, "leaf")
root = {"rsa": "rsa_root", "mldsa44": "mldsa44_root", "mldsa65": "mldsa65_root"}.get(MODE, "root")


def server(ready):
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(os.path.join(PKI, chain + ".pem"), os.path.join(PKI, key + ".key"))
    ctx.set_alpn_protocols(["http/1.1"])
    ctx.num_tickets = 1
    if MODE == "tls12":
        ctx.maximum_version = ssl.TLSVersion.TLSv1_2
    if MODE == "mtls":
        ctx.verify_mode = ssl.CERT_REQUIRED; ctx.load_verify_locations(os.path.join(PKI, "root.pem"))
    ls = socket.socket(); ls.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); ls.bind(("127.0.0.1", PORT)); ls.listen(1)
    ready.set()
    c, _ = ls.accept()
    s = ctx.wrap_socket(c, server_side=True)
    data = b""
    while b"\r\n\r\n" not in data:
        data += s.recv(65536)
    head, body = data.split(b"\r\n\r\n", 1)
    cl = int([l.split(b":")[1] for l in head.split(b"\r\n") if l.lower().startswith(b"content-length")][0])
    while len(body) < cl:
        body += s.recv(65536)
    for k, p in enumerate(PIECES):
        if k == 1:
            time.sleep(0.12)
        elif k > 1:
            time.sleep(0.05)
        s.sendall(p)
    s.close(); ls.close()


t0 = time.perf_counter()
ms = lambda: round((time.perf_counter() - t0) * 1000, 2)


def client():
    kl = tempfile.NamedTemporaryFile(delete=False, suffix=".keylog").name
    ctx = ssl.create_default_context(cafile=os.path.join(PKI, root + ".pem"))
    ctx.keylog_filename = kl
    ctx.set_alpn_protocols(["http/1.1"])
    if MODE == "mtls":
        ctx.load_cert_chain(os.path.join(PKI, "client_chain.pem"), os.path.join(PKI, "client.key"))
    inc, outb = ssl.MemoryBIO(), ssl.MemoryBIO()
    tls = ctx.wrap_bio(inc, outb, server_hostname="api.llm.test")
    s = socket.create_connection(("127.0.0.1", PORT)); s.settimeout(5)
    flights = [{"t_ms": ms(), "event": "TCP connected"}]

    def flush(what):
        d = outb.read()
        if d:
            s.sendall(d); flights.append({"t_ms": ms(), "dir": "c2s", "what": what, "raw": d.hex()})

    def pump(what):
        d = s.recv(65536)
        if d:
            inc.write(d); flights.append({"t_ms": ms(), "dir": "s2c", "what": what, "raw": d.hex()})
        else:
            inc.write_eof()
        return d

    while True:
        try:
            tls.do_handshake(); flush("handshake end"); break
        except ssl.SSLWantReadError:
            flush("handshake"); pump("handshake")
    info = {"version": tls.version(), "cipher": tls.cipher()[0], "alpn": tls.selected_alpn_protocol(),
            "group": tls.group() if hasattr(tls, "group") else None, "t_handshake_done_ms": ms()}
    tls.write(REQ); flush("request")
    plain = b""
    while True:
        try:
            ch = tls.read(65536)
            if not ch:
                break
            plain += ch
        except ssl.SSLWantReadError:
            if not pump("response"):
                break
        except (ssl.SSLZeroReturnError, ssl.SSLEOFError):
            break
    flush("close")
    s.close()
    keylog = open(kl).read(); os.unlink(kl)
    return flights, info, plain, keylog


ready = threading.Event()
th = threading.Thread(target=server, args=(ready,), daemon=True); th.start(); ready.wait()
flights, info, plain, keylog = client()
th.join(3)
assert plain == RESP, "response differs from the root's recorded bytes"


# ---- analysis: what an eavesdropper sees, and what the endpoints see ----
def analyse(flights, info, keylog):
    tls13 = info["version"] == "TLSv1.3"
    keys = read_keylog(keylog)
    suite = info["cipher"]
    h = suite_params(suite)[0]
    dec = {}
    if tls13:
        dec = {"c2s": Dec(keys["CLIENT_HANDSHAKE_TRAFFIC_SECRET"], suite), "s2c": Dec(keys["SERVER_HANDSHAKE_TRAFFIC_SECRET"], suite)}
    app = {"c2s": "CLIENT_TRAFFIC_SECRET_0", "s2c": "SERVER_TRAFFIC_SECRET_0"}
    rest = {"c2s": b"", "s2c": b""}
    transcript, out, checks, certs = [], [], {}, {}
    plaintext_seen = {"c2s": False, "s2c": False}  # TLS 1.2: after ChangeCipherSpec everything is encrypted
    for f in flights:
        if "raw" not in f:
            continue
        d = f["dir"]
        recs, rest[d] = records(rest[d] + bytes.fromhex(f["raw"]))
        for ct, hdr, frag in recs:
            r = {"t_ms": f["t_ms"], "dir": d, "outer": CT.get(ct, str(ct)), "len": len(frag), "head_hex": (hdr + frag[:20]).hex()}
            if ct == 22 and not plaintext_seen[d]:
                for t, m in hs_messages(frag):
                    r.setdefault("msgs", []).append({"type": HS.get(t, str(t)), "len": len(m), "visible": True})
                    if t in (1, 2):
                        r["msgs"][-1]["hello"] = parse_hello(m)
                    if t == 11 and not tls13:
                        cs = parse_certificate(m, tls13=False)
                        r["msgs"][-1]["certs"] = [{k: v for k, v in c.items() if k != "der_hex"} for c in cs]
                    transcript.append(m)
            elif ct == 20:
                r["note"] = "ChangeCipherSpec: in TLS 1.3 only for middlebox compatibility (RFC 9846 appendix D.4)" if tls13 else "ChangeCipherSpec: from here this side encrypts"
                if not tls13:
                    plaintext_seen[d] = True
            elif ct == 23 and tls13:
                inner, content, pad = dec[d].open(hdr, frag)
                r["inner"] = CT.get(inner, str(inner)); r["pad"] = pad
                if inner == 22:
                    for t, m in hs_messages(content):
                        msg = {"type": HS.get(t, str(t)), "len": len(m), "visible": False}
                        if t == 8:
                            from tlsparse import ext_list, parse_exts
                            msg["ext"] = parse_exts(ext_list(m[6:]), False)
                        if t == 11:
                            cs = parse_certificate(m); msg["certs"] = [{k: v for k, v in c.items() if k != "der_hex"} for c in cs]
                            certs[d] = cs
                        if t == 13:
                            msg["note"] = "server asks for a client certificate"
                        if t == 15:
                            alg = int.from_bytes(m[4:6], "big"); msg["sigalg"] = SIGALGS.get(alg, hex(alg)); msg["sig_bytes"] = int.from_bytes(m[6:8], "big")
                            th = h(b"".join(transcript)).digest()
                            ctx_str = b"TLS 1.3, server CertificateVerify" if d == "s2c" else b"TLS 1.3, client CertificateVerify"
                            checks["certverify_" + d] = verify_cv(certs[d][0]["der_hex"], alg, m[8:], b" " * 64 + ctx_str + b"\0" + th)
                        if t == 20:
                            sec = keys["SERVER_HANDSHAKE_TRAFFIC_SECRET" if d == "s2c" else "CLIENT_HANDSHAKE_TRAFFIC_SECRET"]
                            fk = hkdf_expand_label(sec, b"finished", b"", h().digest_size, h)
                            want = hmac.new(fk, h(b"".join(transcript)).digest(), h).digest()
                            checks["finished_" + d] = (want == m[4:])
                            msg["verify_data"] = m[4:].hex()
                        if t == 4:
                            msg["note"] = "session ticket for resumption, sent after the handshake"
                        r.setdefault("msgs", []).append(msg)
                        if t != 4:
                            transcript.append(m)
                        if t == 20:
                            dec[d] = Dec(keys[app[d]], suite)
                elif inner == 23:
                    r["app_bytes"] = len(content); r["app_text"] = content[:90].decode(errors="replace")
                elif inner == 21:
                    r["alert"] = content.hex()
            elif ct == 23:
                r["note"] = "encrypted (TLS 1.2 record)"
            elif ct == 22:
                r["note"] = "encrypted handshake message (TLS 1.2 Finished)"
            out.append(r)
    return out, checks


def verify_cv(der_hex, alg, sig_field, content):
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import ec, padding
    pub = x509.load_der_x509_certificate(bytes.fromhex(der_hex)).public_key()
    sig = sig_field[:]
    try:
        if alg == 0x0403:
            pub.verify(sig, content, ec.ECDSA(hashes.SHA256()))
        elif alg == 0x0804:
            pub.verify(sig, content, padding.PSS(padding.MGF1(hashes.SHA256()), 32), hashes.SHA256())
        else:
            return "not checked (%s)" % SIGALGS.get(alg, hex(alg))
        return True
    except Exception as e:
        return "FAILED " + type(e).__name__


recs, checks = analyse(flights, info, keylog)
c2s = sum(len(bytes.fromhex(f["raw"])) for f in flights if f.get("dir") == "c2s")
s2c = sum(len(bytes.fromhex(f["raw"])) for f in flights if f.get("dir") == "s2c")
res = {"mode": MODE, "recorded": time.strftime("%Y-%m-%d"), "python": sys.version.split()[0], "openssl": ssl.OPENSSL_VERSION,
       "info": info, "wire_bytes": {"c2s": c2s, "s2c": s2c}, "response_plaintext_bytes": len(plain),
       "checks": checks, "records": recs,
       "keylog_note": "throwaway session secrets of this one local connection (not private keys), kept so recompute.py can re-decrypt",
       "keylog": keylog, "flights": flights}
json.dump(res, open(OUT, "w"), indent=1)
print(MODE, info, "c2s", c2s, "s2c", s2c, "checks", checks)
for r in recs:
    print(r["t_ms"], r["dir"], r["outer"], r["len"], r.get("inner", ""), [m["type"] for m in r.get("msgs", [])], r.get("app_bytes", ""))
