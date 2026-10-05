"""TLS failures: expired, wrong name, unknown CA, missing intermediate, clock skew, ALPN mismatch, mTLS."""
from lab import run, save

J = "--json ../wire/request.json"
CURL = "curl -sS --resolve api.llm.test:{p}:127.0.0.1 {ca}https://api.llm.test:{p}/v1/messages -H 'content-type: application/json' --data-binary @../wire/request.json"
SC = "$OPENSSL s_client -connect 127.0.0.1:{p} -servername api.llm.test {x}</dev/null 2>&1"


def clients(p, ca=True):
    c = "--cacert $CA " if ca else ""
    pc = " --ca $CA" if ca else ""
    ne = "NODE_EXTRA_CA_CERTS=$CA " if ca else ""
    u = f"https://localhost:{p}/v1/messages"
    return [run(CURL.format(p=p, ca=c)),
            run(f"$PY $CL/py_requests.py {u}{pc} {J}"),
            run(f"$PY $CL/py_httpx.py {u}{pc} {J}"),
            run(f"{ne}node $CL/node_fetch.mjs {u} ../wire/request.json")]


def main():
    save("tls_expired", clients(27444) + [
        run(SC.format(p=27444, x="-CAfile $CA ") + " | grep -E 'verify error|Verify return'"),
        run(SC.format(p=27444, x="") + " | $OPENSSL x509 -noout -subject -dates"),
        run("date -u"),
    ])
    save("tls_hostname", clients(27445) + [
        run(SC.format(p=27445, x="") + " | $OPENSSL x509 -noout -subject -ext subjectAltName"),
        run(SC.format(p=27445, x="-CAfile $CA -verify_hostname api.llm.test ") + " | grep -E 'verify error|Verify return'"),
    ])
    save("tls_unknown_ca", clients(27443, ca=False) + [
        run(SC.format(p=27443, x="") + " | grep -E '^ *[0-9] s:|^ +i:|Verify return'"),
        run(CURL.format(p=27443, ca="--cacert $CA "), note="the fix: trust the private CA explicitly"),
    ])
    save("tls_intermediate", clients(27447) + [
        run(SC.format(p=27447, x="-CAfile $CA ") + " | grep -E '^ *[0-9] s:|^ +i:|Verify return'"),
        run(SC.format(p=27448, x="-CAfile $CA ") + " | grep -E '^ *[0-9] s:|^ +i:|Verify return'", note="the fix: the server sends leaf plus intermediate (fullchain.pem)"),
        run(CURL.format(p=27448, ca="--cacert $CA ")),
    ])
    save("tls_clock", clients(27446) + [
        run(SC.format(p=27446, x="-CAfile $CA ") + " | grep -E 'verify error|Verify return'"),
        run(SC.format(p=27446, x="") + " | $OPENSSL x509 -noout -dates; date -u"),
    ])
    save("tls_noaki", clients(27453) + [
        run(SC.format(p=27453, x="") + " | $OPENSSL x509 -noout -text | grep -E 'Authority Key|Subject Key' || echo 'no Authority Key Identifier extension'"),
        run(SC.format(p=27443, x="") + " | $OPENSSL x509 -noout -text | grep -A1 -E 'Authority Key'", note="a certificate that has one"),
        run("$PY -c \"import ssl; print(ssl.create_default_context().verify_flags)\""),
    ])
    save("dns_intercept", [
        run("curl -sS -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=example.com&type=A'"),
        run("$OPENSSL s_client -connect cloudflare-dns.com:443 -servername cloudflare-dns.com </dev/null 2>&1 | grep -E '^ *[0-9] s:|^ +i:|Verify return'"),
        run("dig @1.1.1.1 id.server CH TXT +short", note="Cloudflare's 1.1.1.1 answers this with the code of the data centre that served you"),
    ])
    save("tls_alpn", [
        run("$PY $CL/grpc_call.py 127.0.0.1:27450 --ca $CA"),
        run(SC.format(p=27450, x="-alpn h2 ") + " | grep -E 'ALPN|alert|Verify return'"),
        run(SC.format(p=27443, x="-alpn h2 ") + " | grep -E 'ALPN|Verify return'", note="a server with http2 on picks h2"),
        run("$PY $CL/grpc_call.py 127.0.0.1:27451 --ca $CA", note="a TLS server that ignores ALPN altogether"),
        run(CURL.format(p=27450, ca="--cacert $CA --http2 -v -o /dev/null ") + " 2>&1 | grep -iE 'ALPN|HTTP/'", note="curl offers h2 and http/1.1, so it falls back quietly"),
    ])
    save("tls_mtls", [
        run(CURL.format(p=27449, ca="--cacert $CA ")),
        run(f"$PY $CL/py_requests.py https://localhost:27449/v1/messages --ca $CA {J}"),
        run(f"$PY $CL/py_httpx.py https://localhost:27449/v1/messages --ca $CA {J}"),
        run("NODE_EXTRA_CA_CERTS=$CA node $CL/node_fetch.mjs https://localhost:27449/v1/messages ../wire/request.json"),
        run(CURL.format(p=27452, ca="--cacert $CA "), note="a server that enforces the client certificate in the handshake itself (Python ssl, CERT_REQUIRED)"),
        run(f"$PY $CL/py_httpx.py https://localhost:27452/v1/messages --ca $CA {J}"),
        run(SC.format(p=27449, x="-CAfile $CA ") + " | grep -E 'Acceptable client certificate CA names' -A1"),
        run(f"$PY $CL/py_requests.py https://localhost:27449/v1/messages --ca $CA --cert $PKI/client.pem --key $PKI/client.key {J}", note="the fix: present the client certificate"),
    ])
