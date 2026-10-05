MISSING = sentinel("MISSING")


def get(d: dict, key: str, default=MISSING):
    if default is MISSING:
        return d[key]
    return d.get(key, default)


print(MISSING, get({"a": 1}, "b", 0))
