# check: ty
def find(users: dict[str, str], key: str) -> str | None:
    return users.get(key)          # None when the key is missing

name = find({"a": "Ada"}, "b")
print(name.upper())                # ty reports it; Python fails at run time
