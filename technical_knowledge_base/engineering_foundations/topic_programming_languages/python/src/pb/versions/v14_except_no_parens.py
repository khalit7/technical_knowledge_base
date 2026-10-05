try:
    int("x")
except ValueError, TypeError:
    print("caught without parentheses")
