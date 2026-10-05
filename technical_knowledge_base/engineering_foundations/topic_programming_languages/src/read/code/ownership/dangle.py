# Keep a reference to the first user, then keep adding users.
class User:
    def __init__(self, name):
        self.name = name
    def __del__(self):                # runs when the last reference disappears
        if self.name.startswith("u0029"):
            print("  (CPython frees", self.name, "now)")

users = [User("u0029-the-heaviest-user")]
first = users[0]                      # a second reference to the same object
for i in range(100):
    users.append(User(f"u{i}-another-user-name"))  # the list's pointer array grows and moves
print("first user:", first.name)
del users                             # drop the whole list: one reference to u0029 remains
print("list gone, first user:", first.name)
del first                             # drop the last reference
print("done")
