def add_one(xs):
    xs.append(1)        # the caller's list: same object
nums = [0]
add_one(nums)
print(nums)
