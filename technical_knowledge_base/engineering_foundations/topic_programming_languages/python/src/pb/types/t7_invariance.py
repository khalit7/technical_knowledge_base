def mean(xs: list[float]) -> float:
    xs.append(0.5)
    return sum(xs) / len(xs)


counts: list[int] = [1, 2, 3]
mean(counts)
