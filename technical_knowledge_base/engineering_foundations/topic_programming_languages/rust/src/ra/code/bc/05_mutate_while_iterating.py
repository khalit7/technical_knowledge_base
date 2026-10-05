queue = [1, 2, 3]
for x in queue:
    if x == 2 or x == 20:
        queue.append(20)
    if len(queue) > 8:
        break
print(queue)
