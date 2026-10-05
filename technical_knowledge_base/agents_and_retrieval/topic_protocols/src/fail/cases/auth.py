"""Auth failures at a JWT-checking gateway: expired, wrong audience, clock skew, algorithm confusion, missing scope,
and an OAuth redirect URI mismatch."""
import lab
from lab import run, save, start

CALL = "T=$($PY mint.py $WORK {k}); curl -sS -i http://127.0.0.1:27200/v1/messages -H \"authorization: Bearer $T\" -H 'content-type: application/json' --data-binary @../wire/request.json | grep -vE '^(Server|Date|content-length):'"
PEEK = "$PY jwt_peek.py $($PY mint.py $WORK {k})"
AZ = "curl -sS -i 'http://127.0.0.1:27200/authorize?client_id=agent-cli&response_type=code&state=xyz&code_challenge=E9Mel&code_challenge_method=S256&redirect_uri={r}' | grep -vE '^(Server|Date|content-length):'"


def main():
    run("$PY mint.py $WORK good > /dev/null")  # creates the issuer key pair
    start([lab.PY, "auth_server.py", "27200", lab.WORK], log="auth.log", port=27200)
    save("jwt_expired", [run(CALL.format(k="expired")), run(PEEK.format(k="expired")), run(CALL.format(k="good"), note="a fresh token")])
    save("jwt_audience", [run(CALL.format(k="wrong_aud")), run(PEEK.format(k="wrong_aud"))])
    save("jwt_clock", [run(CALL.format(k="future")), run(PEEK.format(k="future"))])
    save("jwt_alg", [
        run(CALL.format(k="alg_none")), run(PEEK.format(k="alg_none")),
        run(CALL.format(k="hs256_pubkey")), run(PEEK.format(k="hs256_pubkey")),
        run("$PY mint.py $WORK alg_none | cut -d. -f1 | $PY -c \"import sys,base64; s=sys.stdin.read().strip(); print(s, '->', base64.urlsafe_b64decode(s+'='*(-len(s)%4)))\""),
        run("$PY -c \"import jwt; jwt.encode({'sub':'x'}, open('$WORK/issuer_pub.pem').read(), algorithm='HS256')\" 2>&1 | tail -1",
            note="PyJWT will not even create the forgery: it refuses a PEM public key as an HMAC secret"),
    ])
    save("jwt_scope", [run(CALL.format(k="no_scope")), run(PEEK.format(k="no_scope"))])
    save("oauth_redirect", [
        run(AZ.format(r="http%3A%2F%2F127.0.0.1%3A8765%2Fcallback"), note="exactly the registered URI"),
        run(AZ.format(r="http%3A%2F%2Flocalhost%3A8765%2Fcallback"), note="localhost instead of 127.0.0.1"),
        run(AZ.format(r="http%3A%2F%2F127.0.0.1%3A8765%2Fcallback%2F"), note="a trailing slash"),
        run(AZ.format(r="http%3A%2F%2F127.0.0.1%3A51234%2Fcallback"), note="another port on the loopback address (allowed, RFC 8252 section 7.3)"),
    ])
