"""Decode a JWT WITHOUT verifying it, to read what it claims: python jwt_peek.py TOKEN
Prints the header and payload, the times as UTC, and this machine's clock. Never trust what this prints: it is
what the token says about itself; only the signature check makes it true."""
import base64, datetime as dt, json, sys, time
h, p, *_ = sys.argv[1].split(".")
dec = lambda s: json.loads(base64.urlsafe_b64decode(s + "=" * (-len(s) % 4)))
print("header :", json.dumps(dec(h)))
pl = dec(p); print("payload:", json.dumps(pl))
for k in ("iat", "nbf", "exp"):
    if k in pl:
        print(f"  {k} = {dt.datetime.fromtimestamp(pl[k], dt.timezone.utc):%Y-%m-%d %H:%M:%S} UTC ({pl[k] - int(time.time()):+d} s from now)")
print(f"  now = {dt.datetime.now(dt.timezone.utc):%Y-%m-%d %H:%M:%S} UTC")
