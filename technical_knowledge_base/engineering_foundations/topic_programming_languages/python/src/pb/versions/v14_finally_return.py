def f() -> int:
    try:
        raise RuntimeError("lost")
    finally:
        return 1


print(f())
