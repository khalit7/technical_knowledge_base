user = {"name": "Ada"}
print(user.get("email"))     # explicit: None
print(user["email"])         # KeyError, right where the mistake is
