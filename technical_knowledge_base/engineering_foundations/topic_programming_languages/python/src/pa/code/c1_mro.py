class Base:
    def setup(self):
        print("Base.setup")

class Logging(Base):
    def setup(self):
        print("Logging.setup ->"); super().setup()

class Caching(Base):
    def setup(self):
        print("Caching.setup ->"); super().setup()

class Service(Logging, Caching):
    def setup(self):
        print("Service.setup ->"); super().setup()

print([c.__name__ for c in Service.__mro__])
Service().setup()            # super() means "next in the MRO of type(self)", not "my parent"
print([c.__name__ for c in Logging.__mro__])
Logging().setup()

try:
    class Bad(Base, Logging):    # Base listed before its own subclass
        pass
except TypeError as e:
    print("TypeError:", e)
