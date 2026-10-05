"""The running request (src/wire/REQUEST.md) sent twice to a local Wire Lab server:
(1) over plain HTTP/1.1, (2) over TLS 1.3, and every byte that crossed the socket recorded.
TLS is driven through ssl.MemoryBIO so the script sees exactly the ciphertext an eavesdropper on
the wire would see, record by record, next to the plaintext only the two endpoints know.
Usage: python r2_tls_wire.py <ca.pem> <tls_port> <plain_port> <request.bin> <out.json>"""
import json, socket, ssl, struct, sys, time

CA, TLS_PORT, PLAIN_PORT, REQ, OUT = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], sys.argv[5]
REQUEST = open(REQ, "rb").read()
CT = {20: "change_cipher_spec", 21: "alert", 22: "handshake", 23: "application_data"}
HS = {1: "ClientHello", 2: "ServerHello", 4: "NewSessionTicket", 8: "EncryptedExtensions", 11: "Certificate",
      15: "CertificateVerify", 20: "Finished"}
GROUPS = {0x001d: "x25519", 0x0017: "secp256r1", 0x0018: "secp384r1", 0x0019: "secp521r1", 0x001e: "x448",
          0x0100: "ffdhe2048", 0x0101: "ffdhe3072", 0x11EB: "SecP256r1MLKEM768", 0x11EC: "X25519MLKEM768",
          0x11ED: "SecP384r1MLKEM1024", 0x0200: "MLKEM512", 0x0201: "MLKEM768", 0x0202: "MLKEM1024"}
SUITES = {0x1301: "TLS_AES_128_GCM_SHA256", 0x1302: "TLS_AES_256_GCM_SHA384", 0x1303: "TLS_CHACHA20_POLY1305_SHA256"}
t0 = time.perf_counter()
ms = lambda: round((time.perf_counter() - t0) * 1000, 2)


def ext_list(b):
    out, i = [], 0
    while i + 4 <= len(b):
        et, el = struct.unpack("!HH", b[i:i + 4]); out.append((et, b[i + 4:i + 4 + el])); i += 4 + el
    return out


def parse_hello(body, client):
    """RFC 9846 section 4.2.2 / 4.2.3 layouts: what a passive observer can read from the hello messages."""
    i = 2 + 32  # legacy_version, random
    sid = body[i]; i += 1 + sid
    info = {}
    if client:
        n = struct.unpack("!H", body[i:i + 2])[0]; i += 2
        info["cipher_suites"] = [SUITES.get(x, hex(x)) for x in struct.unpack("!%dH" % (n // 2), body[i:i + n])]; i += n
        i += 1 + body[i]
    else:
        info["cipher_suite"] = SUITES.get(struct.unpack("!H", body[i:i + 2])[0]); i += 3
    el = struct.unpack("!H", body[i:i + 2])[0]; i += 2
    exts = ext_list(body[i:i + el])
    info["extensions"] = []
    for et, ed in exts:
        name = {0: "server_name", 10: "supported_groups", 16: "alpn", 43: "supported_versions", 51: "key_share",
                13: "signature_algorithms", 45: "psk_key_exchange_modes", 41: "pre_shared_key"}.get(et, str(et))
        info["extensions"].append(name)
        if et == 0 and ed:
            info["sni"] = ed[5:].decode()
        if et == 16 and ed:
            j, alpn = 2, []
            while j < len(ed):
                l = ed[j]; alpn.append(ed[j + 1:j + 1 + l].decode()); j += 1 + l
            info["alpn"] = alpn
        if et == 10:
            info["supported_groups"] = [GROUPS.get(x, hex(x)) for x in struct.unpack("!%dH" % ((len(ed) - 2) // 2), ed[2:])]
        if et == 51:
            shares, j = [], 2 if client else 0
            while j + 4 <= len(ed):
                g, l = struct.unpack("!HH", ed[j:j + 4]); shares.append({"group": GROUPS.get(g, hex(g)), "bytes": l}); j += 4 + l
            info["key_share"] = shares
        if et == 43:
            info["supported_versions"] = ed.hex()
    return info


def records(buf):
    """Split a byte string into TLS records (RFC 9846 section 5.1: 5-byte header type/version/length)."""
    out, i = [], 0
    while i + 5 <= len(buf):
        ct, ver, ln = struct.unpack("!BHH", buf[i:i + 5])
        frag = buf[i + 5:i + 5 + ln]
        r = {"type": CT.get(ct, ct), "header": buf[i:i + 5].hex(), "len": ln, "first_bytes": frag[:24].hex()}
        if ct == 22 and frag and frag[0] in (1, 2):
            r["handshake"] = HS[frag[0]]
            r["readable_by_eavesdropper"] = parse_hello(frag[4:], frag[0] == 1)
        out.append(r); i += 5 + ln
    return out


def tls_run():
    log = []
    ctx = ssl.create_default_context(cafile=CA)
    ctx.minimum_version = ssl.TLSVersion.TLSv1_3
    ctx.set_alpn_protocols(["http/1.1"])
    inc, outb = ssl.MemoryBIO(), ssl.MemoryBIO()
    tls = ctx.wrap_bio(inc, outb, server_hostname="api.llm.test")
    s = socket.create_connection(("127.0.0.1", TLS_PORT)); log.append({"t_ms": ms(), "event": "TCP connected"})
    s.settimeout(5)

    def flush(what):
        data = outb.read()
        if data:
            s.sendall(data); log.append({"t_ms": ms(), "dir": "client->server", "what": what, "bytes": len(data), "records": records(data)})

    def pump(what):
        data = s.recv(65536)
        if data:
            inc.write(data); log.append({"t_ms": ms(), "dir": "server->client", "what": what, "bytes": len(data), "records": records(data)})
        else:
            inc.write_eof()
        return data

    while True:
        try:
            tls.do_handshake(); flush("handshake (client Finished)"); break
        except ssl.SSLWantReadError:
            flush("handshake"); pump("handshake")
    log.append({"t_ms": ms(), "event": "handshake done", "version": tls.version(), "cipher": tls.cipher()[0], "alpn": tls.selected_alpn_protocol(),
                "group": getattr(tls, "group", lambda: None)() if hasattr(tls, "group") else None,
                "peer_cert_subject": dict(x[0] for x in tls.getpeercert()["subject"]), "peer_cert_issuer": dict(x[0] for x in tls.getpeercert()["issuer"])})
    tls.write(REQUEST); flush("request (plaintext known only to the endpoints: %d bytes)" % len(REQUEST))
    plain = b""
    while True:
        try:
            chunk = tls.read(65536)
            if not chunk: break
            plain += chunk; log.append({"t_ms": ms(), "event": "decrypted %d bytes" % len(chunk), "text_start": chunk.decode(errors="replace")})
        except ssl.SSLWantReadError:
            if not pump("response"): break
        except (ssl.SSLZeroReturnError, ssl.SSLEOFError):
            break
    s.close()
    return log, plain


def plain_run():
    log = []
    s = socket.create_connection(("127.0.0.1", PLAIN_PORT)); log.append({"t_ms": ms(), "event": "TCP connected"})
    s.sendall(REQUEST); log.append({"t_ms": ms(), "dir": "client->server", "bytes": len(REQUEST), "text": REQUEST.decode()})
    data = b""
    while True:
        c = s.recv(65536)
        if not c: break
        data += c; log.append({"t_ms": ms(), "dir": "server->client", "bytes": len(c), "text": c.decode(errors="replace")})
    s.close()
    return log, data


pl_log, pl_resp = plain_run()
t0 = time.perf_counter()
tl_log, tl_plain = tls_run()
wire_c = sum(e["bytes"] for e in tl_log if e.get("dir") == "client->server")
wire_s = sum(e["bytes"] for e in tl_log if e.get("dir") == "server->client")
json.dump({"python": sys.version.split()[0], "openssl": ssl.OPENSSL_VERSION, "request_bytes": len(REQUEST),
           "plain": {"log": pl_log, "response_bytes": len(pl_resp)},
           "tls": {"log": tl_log, "plaintext_response_bytes": len(tl_plain), "wire_bytes_client_to_server": wire_c, "wire_bytes_server_to_client": wire_s}},
          open(OUT, "w"), indent=1)
print("plain: request", len(REQUEST), "response", len(pl_resp))
print("tls: wire c->s", wire_c, "s->c", wire_s, "plaintext response", len(tl_plain))
for e in tl_log:
    if "records" in e:
        print(e["t_ms"], e["dir"], e["bytes"], [(r["type"], r["len"], r.get("handshake", "")) for r in e["records"]])
    else:
        print(e)
