name = "Robert'); DROP TABLE users;--"
template = t"SELECT * FROM users WHERE name = {name}"
print(type(template).__name__)
print(template.strings)
print([i.value for i in template.interpolations])
