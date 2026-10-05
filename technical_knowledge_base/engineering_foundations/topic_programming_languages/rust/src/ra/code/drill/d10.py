users = [("cy", 5), ("bob", 9), ("ada", 5)]
print(sorted(users, key=lambda u: (-u[1], u[0])))
