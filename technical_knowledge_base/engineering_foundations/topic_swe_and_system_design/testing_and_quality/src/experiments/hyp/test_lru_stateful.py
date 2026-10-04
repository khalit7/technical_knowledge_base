from collections import OrderedDict
from hypothesis import strategies as st
from hypothesis.stateful import RuleBasedStateMachine, rule, invariant
from lru import LRUCache

keys = st.sampled_from("abcde")

class LRUMatchesModel(RuleBasedStateMachine):
    """Run random sequences of get/put against the real cache and a trusted model."""
    def __init__(self):
        super().__init__()
        self.cache = LRUCache(capacity=2)
        self.model = OrderedDict()            # the obviously-correct reference

    @rule(k=keys, v=st.integers())
    def put(self, k, v):
        self.cache.put(k, v)
        self.model[k] = v
        self.model.move_to_end(k)
        if len(self.model) > 2:
            self.model.popitem(last=False)

    @rule(k=keys)
    def get(self, k):
        expected = self.model.get(k)
        if k in self.model:
            self.model.move_to_end(k)
        assert self.cache.get(k) == expected

TestLRU = LRUMatchesModel.TestCase
