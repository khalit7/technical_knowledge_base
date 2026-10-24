"""Shared TLS parsing and TLS 1.3 record decryption (RFC 9846 sections 4, 5 and 7).
Used by hs_record.py (recording) and ../recompute.py (re-checking the recordings from raw/)."""
import hashlib, hmac, struct
from cryptography.hazmat.primitives.ciphers.aead import AESGCM, ChaCha20Poly1305

CT = {20: "change_cipher_spec", 21: "alert", 22: "handshake", 23: "application_data"}
HS = {1: "ClientHello", 2: "ServerHello", 4: "NewSessionTicket", 8: "EncryptedExtensions", 11: "Certificate",
      13: "CertificateRequest", 15: "CertificateVerify", 20: "Finished", 24: "KeyUpdate", 12: "ServerKeyExchange",
      14: "ServerHelloDone", 16: "ClientKeyExchange"}
GROUPS = {0x001d: "x25519", 0x0017: "secp256r1", 0x0018: "secp384r1", 0x0019: "secp521r1", 0x001e: "x448",
          0x0100: "ffdhe2048", 0x0101: "ffdhe3072", 0x11EB: "SecP256r1MLKEM768", 0x11EC: "X25519MLKEM768",
          0x11ED: "SecP384r1MLKEM1024", 0x0200: "MLKEM512", 0x0201: "MLKEM768", 0x0202: "MLKEM1024"}
SUITES = {0x1301: "TLS_AES_128_GCM_SHA256", 0x1302: "TLS_AES_256_GCM_SHA384", 0x1303: "TLS_CHACHA20_POLY1305_SHA256",
          0xc02b: "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256", 0xc02c: "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384",
          0xcca9: "TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256"}
SIGALGS = {0x0403: "ecdsa_secp256r1_sha256", 0x0503: "ecdsa_secp384r1_sha384", 0x0804: "rsa_pss_rsae_sha256",
           0x0805: "rsa_pss_rsae_sha384", 0x0806: "rsa_pss_rsae_sha512", 0x0807: "ed25519", 0x0808: "ed448",
           0x0401: "rsa_pkcs1_sha256", 0x0501: "rsa_pkcs1_sha384", 0x0601: "rsa_pkcs1_sha512", 0x0904: "mldsa44",
           0x0905: "mldsa65", 0x0906: "mldsa87", 0x0809: "rsa_pss_pss_sha256", 0x080a: "rsa_pss_pss_sha384", 0x080b: "rsa_pss_pss_sha512",
           0x0603: "ecdsa_secp521r1_sha512", 0x081a: "ecdsa_brainpoolP256r1tls13_sha256", 0x081b: "ecdsa_brainpoolP384r1tls13_sha384",
           0x081c: "ecdsa_brainpoolP512r1tls13_sha512", 0x0303: "ecdsa_sha224", 0x0301: "rsa_pkcs1_sha224", 0x0302: "dsa_sha224",
           0x0402: "dsa_sha256", 0x0502: "dsa_sha384", 0x0602: "dsa_sha512"}
EXTS = {0: "server_name", 10: "supported_groups", 11: "ec_point_formats", 13: "signature_algorithms", 16: "alpn",
        22: "encrypt_then_mac", 23: "extended_master_secret", 35: "session_ticket", 41: "pre_shared_key",
        42: "early_data", 43: "supported_versions", 45: "psk_key_exchange_modes", 47: "certificate_authorities",
        49: "post_handshake_auth", 50: "signature_algorithms_cert", 51: "key_share", 65281: "renegotiation_info",
        5: "status_request", 18: "signed_certificate_timestamp", 21: "padding", 27: "compress_certificate",
        28: "record_size_limit", 65037: "encrypted_client_hello"}
HRR_RANDOM = bytes.fromhex("CF21AD74E59A6111BE1D8C021E65B891C2A211167ABB8C5E079E09E2C8A8339C")


def records(buf):
    """Split bytes into TLS records: 5-byte header (type, legacy version, length) then the fragment."""
    out, i = [], 0
    while i + 5 <= len(buf):
        ct, ver, ln = struct.unpack("!BHH", buf[i:i + 5])
        if i + 5 + ln > len(buf):
            break
        out.append((ct, buf[i:i + 5], buf[i + 5:i + 5 + ln])); i += 5 + ln
    return out, buf[i:]


def hs_messages(buf):
    out, i = [], 0
    while i + 4 <= len(buf):
        t = buf[i]; ln = int.from_bytes(buf[i + 1:i + 4], "big")
        out.append((t, buf[i:i + 4 + ln])); i += 4 + ln
    return out


def ext_list(b):
    out, i = [], 0
    while i + 4 <= len(b):
        et, el = struct.unpack("!HH", b[i:i + 4]); out.append((et, b[i + 4:i + 4 + el])); i += 4 + el
    return out


def parse_exts(exts, client):
    info = {"extensions": [EXTS.get(et, str(et)) for et, _ in exts]}
    for et, ed in exts:
        if et == 0 and ed:
            info["sni"] = ed[5:].decode()
        elif et == 16 and ed:
            j, alpn = 2, []
            while j < len(ed):
                l = ed[j]; alpn.append(ed[j + 1:j + 1 + l].decode()); j += 1 + l
            info["alpn"] = alpn
        elif et == 10:
            info["supported_groups"] = [GROUPS.get(x, hex(x)) for x in struct.unpack("!%dH" % ((len(ed) - 2) // 2), ed[2:])]
        elif et == 13:
            info["signature_algorithms"] = [SIGALGS.get(x, hex(x)) for x in struct.unpack("!%dH" % ((len(ed) - 2) // 2), ed[2:])]
        elif et == 51:
            shares, j = [], (2 if client else 0)
            if not client and len(ed) == 2:
                info["key_share_selected_group"] = GROUPS.get(struct.unpack("!H", ed)[0]); continue
            while j + 4 <= len(ed):
                g, l = struct.unpack("!HH", ed[j:j + 4]); shares.append({"group": GROUPS.get(g, hex(g)), "bytes": l}); j += 4 + l
            info["key_share"] = shares
        elif et == 43:
            vs = ed[1:] if client else ed
            info["supported_versions"] = ["TLS 1.3" if v == 0x0304 else "TLS 1.2" if v == 0x0303 else hex(v)
                                          for v in struct.unpack("!%dH" % (len(vs) // 2), vs)]
        elif et == 45:
            info["psk_modes"] = ["psk_dhe_ke" if x == 1 else "psk_ke" for x in ed[1:]]
        elif et == 41:
            info["pre_shared_key_bytes"] = len(ed)
        elif et == 42:
            info["early_data"] = True
    return info


def parse_hello(msg):
    """ClientHello / ServerHello (RFC 9846 4.1.2, 4.1.3): what a passive observer can read."""
    t, body = msg[0], msg[4:]
    client = t == 1
    i = 2
    rnd = body[i:i + 32]; i += 32
    sid = body[i]; i += 1 + sid
    info = {"message": "ClientHello" if client else ("HelloRetryRequest" if rnd == HRR_RANDOM else "ServerHello")}
    if client:
        n = struct.unpack("!H", body[i:i + 2])[0]; i += 2
        info["cipher_suites"] = [SUITES.get(x, hex(x)) for x in struct.unpack("!%dH" % (n // 2), body[i:i + n]) if x in SUITES]
        i += n; i += 1 + body[i]
    else:
        info["cipher_suite"] = SUITES.get(struct.unpack("!H", body[i:i + 2])[0]); i += 3
    if i + 2 <= len(body):
        el = struct.unpack("!H", body[i:i + 2])[0]; i += 2
        info.update(parse_exts(ext_list(body[i:i + el]), client))
    return info


def parse_certificate(msg, tls13=True):
    """Certificate message: a list of DER certificates (1.3 adds a context and per-entry extensions)."""
    from cryptography import x509
    body = msg[4:]; i = 0
    if tls13:
        i = 1 + body[0]
    total = int.from_bytes(body[i:i + 3], "big"); i += 3; end = i + total
    certs = []
    while i < end:
        l = int.from_bytes(body[i:i + 3], "big"); der = body[i + 3:i + 3 + l]; i += 3 + l
        if tls13:
            el = int.from_bytes(body[i:i + 2], "big"); i += 2 + el
        c = x509.load_der_x509_certificate(der)
        try:
            san = c.extensions.get_extension_for_class(x509.SubjectAlternativeName).value
            sans = [str(getattr(g, "value", g)) for g in san]
        except x509.ExtensionNotFound:
            sans = []
        certs.append({"subject": c.subject.rfc4514_string(), "issuer": c.issuer.rfc4514_string(), "der_bytes": len(der),
                      "san": sans, "not_after": c.not_valid_after_utc.strftime("%Y-%m-%d"), "der_hex": der.hex()})
    return certs


# ---- TLS 1.3 key schedule pieces (RFC 9846 section 7.1) ----
def hkdf_expand_label(secret, label, context, length, h):
    full = b"tls13 " + label
    info = struct.pack("!H", length) + bytes([len(full)]) + full + bytes([len(context)]) + context
    out, t, c = b"", b"", 1
    while len(out) < length:
        t = hmac.new(secret, t + info + bytes([c]), h).digest(); out += t; c += 1
    return out[:length]


def suite_params(name):
    if name == "TLS_AES_256_GCM_SHA384":
        return hashlib.sha384, 32, AESGCM
    if name == "TLS_CHACHA20_POLY1305_SHA256":
        return hashlib.sha256, 32, ChaCha20Poly1305
    return hashlib.sha256, 16, AESGCM


class Dec:
    """Decrypts one direction's records under one traffic secret (7.3 traffic keys, 5.3 per-record nonce)."""

    def __init__(self, secret, suite):
        h, kl, A = suite_params(suite)
        self.key = hkdf_expand_label(secret, b"key", b"", kl, h)
        self.iv = hkdf_expand_label(secret, b"iv", b"", 12, h)
        self.aead = A(self.key); self.seq = 0

    def open(self, header, frag):
        nonce = bytes(a ^ b for a, b in zip(self.iv, self.seq.to_bytes(12, "big")))
        pt = self.aead.decrypt(nonce, frag, header); self.seq += 1
        j = len(pt) - 1
        while j >= 0 and pt[j] == 0:
            j -= 1
        return pt[j], pt[:j], len(pt) - 1 - j  # inner content type, content, padding length


def read_keylog(text):
    out = {}
    for line in text.splitlines():
        p = line.split()
        if len(p) == 3:
            out[p[0]] = bytes.fromhex(p[2])
    return out
