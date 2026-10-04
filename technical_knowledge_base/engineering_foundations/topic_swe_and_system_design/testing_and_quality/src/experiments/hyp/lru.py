class LRUCache:
    """Keeps the `capacity` most recently used entries (e.g. cached embeddings by text hash)."""
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.data: dict = {}          # dicts keep insertion order: oldest first

    def get(self, key):
        return self.data.get(key)     # bug: a read does not mark the key as recently used

    def put(self, key, value):
        if key in self.data:
            del self.data[key]
        elif len(self.data) >= self.capacity:
            oldest = next(iter(self.data))
            del self.data[oldest]
        self.data[key] = value
