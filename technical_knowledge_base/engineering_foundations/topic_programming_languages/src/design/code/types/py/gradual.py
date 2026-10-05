# check: ty
def total(xs: list[int]) -> int:
    return sum(xs)

print(total([1, 2, 3]))
print(total(["a", "b"]))  # ty flags this line; CPython runs it anyway
