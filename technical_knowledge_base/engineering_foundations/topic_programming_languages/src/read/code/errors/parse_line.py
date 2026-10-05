import json
for line in ['{"user": "u0029", "text": "hello"}', '{"user": 17, "text": "hi"}', 'not json at all']:
    try:
        rec = json.loads(line)
        user, text = rec["user"], rec["text"]
        if not isinstance(user, str):
            raise TypeError(f"user must be a string, got {type(user).__name__}")
        print("ok  ", user, repr(text))
    except (ValueError, KeyError, TypeError) as e:
        print("bad ", type(e).__name__ + ":", e)
