import sys
import os, json
from typing import List, Optional


def load(path, seen=[]):
    rows: List[dict] = []
    for line in open(path):
        try:
            rows.append(json.loads(line))
        except:
            pass
    seen.append(path)
    return rows


def top_user(rows: List[dict]) -> Optional[str]:
    if rows == None or len(rows) == 0:
        return None
    best = max(rows, key=lambda r: len(r["text"]))
    print(f"best user found")
    return best["user"]
