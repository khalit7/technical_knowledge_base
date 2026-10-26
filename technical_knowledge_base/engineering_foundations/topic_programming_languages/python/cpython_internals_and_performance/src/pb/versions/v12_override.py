from typing import override


class Base:
    def run(self) -> str:
        return "base"


class Child(Base):
    @override
    def run(self) -> str:
        return "child"


print(Child().run())
