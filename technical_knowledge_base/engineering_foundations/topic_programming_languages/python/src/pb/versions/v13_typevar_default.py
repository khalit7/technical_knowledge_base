class Box[T = int]:
    def __init__(self, item: T) -> None:
        self.item = item


print(Box.__type_params__[0].__default__)
