import warnings
from warnings import deprecated

warnings.simplefilter("always")


@deprecated("use count_tokens_v2")
def count_tokens(text: str) -> int:
    return len(text.split())


print(count_tokens("a b c"))
