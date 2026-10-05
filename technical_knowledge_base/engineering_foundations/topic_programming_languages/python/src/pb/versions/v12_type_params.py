type Pair[T] = tuple[T, T]


def first[T](xs: list[T]) -> T:
    return xs[0]


print(first([3, 1, 2]), Pair.__value__)
