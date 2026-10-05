nums = [1, 2, 3]
it = iter(nums)                 # list.__iter__ returns a NEW list_iterator
print(type(it).__name__, next(it), next(it), next(it))
try:
    next(it)
except StopIteration:
    print("StopIteration: the iterator is used up")

squares = (n * n for n in nums) # a generator is an iterator: one pass only
print(sum(squares), sum(squares))
print(sum(nums), sum(nums))     # a list is an iterable: each for/sum gets a fresh iterator
