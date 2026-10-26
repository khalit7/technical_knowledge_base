import copy

grid = [[0, 0], [0, 0]]
shallow = grid.copy()          # new outer list, SAME inner lists
deep = copy.deepcopy(grid)     # new lists all the way down
grid[0][0] = 9
print(shallow[0][0], deep[0][0])

rows = [[0] * 2] * 3           # three references to ONE inner list
rows[0][0] = 1
print(rows)
rows = [[0] * 2 for _ in range(3)]   # three separate lists
rows[0][0] = 1
print(rows)
