per_user: dict[str, int] = {"u0029": 9491}


def add(user: str, n: int) -> None:
    per_user[user] = per_user.get(user) + n  # .get returns None for a new user


add("u0029", 5)
print(per_user)
add("u0777", 5)
