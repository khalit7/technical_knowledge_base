x = 1
if True:
    x = 2            # no block scope: this is the same x
for i in range(3):
    pass
print(x, i)          # i survives the loop
