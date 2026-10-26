from concurrent import interpreters

interp = interpreters.create()
print(interp.call(sum, [1, 2, 3]))
interp.close()
