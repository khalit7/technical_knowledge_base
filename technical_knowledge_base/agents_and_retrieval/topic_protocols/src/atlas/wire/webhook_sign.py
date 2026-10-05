"""Sign one webhook the Standard Webhooks way (spec: signed content = msg_id.timestamp.body, HMAC-SHA256,
base64, prefixed "v1,"), then verify it, then show that re-serialising the JSON breaks verification.
The secret is a made-up demo value, not a real key."""
import base64, hmac, hashlib, json
secret = "whsec_" + base64.b64encode(b"demo-secret-for-the-atlas-32bytes").decode()
msg_id, ts = "msg_2KWPBgLlAfxdpx2AI54pPJ85f4W", "1674087231"
body = '{"type":"contact.created","timestamp":"2022-11-03T20:26:10.344522Z","data":{"id":"1f81eb52-5198-4599-803e-771906343485"}}'
key = base64.b64decode(secret.split("_", 1)[1])
def sign(b): return "v1," + base64.b64encode(hmac.new(key, f"{msg_id}.{ts}.{b}".encode(), hashlib.sha256).digest()).decode()
sig = sign(body)
print("webhook-id:", msg_id); print("webhook-timestamp:", ts); print("webhook-signature:", sig)
print("verify raw body:          ", hmac.compare_digest(sig, sign(body)))
reser = json.dumps(json.loads(body), indent=1)
print("verify re-serialised JSON:", hmac.compare_digest(sig, sign(reser)))
