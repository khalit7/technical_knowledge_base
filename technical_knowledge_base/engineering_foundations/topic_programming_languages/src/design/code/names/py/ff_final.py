# check: ty
from typing import Final
LIMITS: Final = [100]
LIMITS.append(200)      # Final stops rebinding the name, not changing the list
print(LIMITS)
