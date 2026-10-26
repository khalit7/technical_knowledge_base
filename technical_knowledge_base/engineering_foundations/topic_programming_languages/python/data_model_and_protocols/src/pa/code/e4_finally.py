def order(fail):
    try:
        print("try")
        if fail:
            raise ValueError("x")
    except ValueError:
        print("except")
    else:
        print("else (only when try raised nothing)")
    finally:
        print("finally (always)")

order(False)
order(True)

def swallow():
    try:
        raise RuntimeError("lost")
    finally:
        return "finally's return wins"   # silently discards the exception
print(swallow())
