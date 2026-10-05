# cmd: uvx ruff@0.16.10 check --no-cache --select F,B --output-format concise lint.py
import os

def add(item, acc=[]):     # a mutable default argument
    acc.append(item)
    return acc
