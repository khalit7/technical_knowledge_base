def greet(name=None):
    return f"hi {name or 'there'}"

print(greet(), "/", greet("ada"))
