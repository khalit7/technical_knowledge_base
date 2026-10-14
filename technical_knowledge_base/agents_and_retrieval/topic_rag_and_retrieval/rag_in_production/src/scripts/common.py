"""Shared helpers for the RAG in production scripts: the root's loader, the scratch folder, and saving results."""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_DATA = os.path.abspath(os.path.join(HERE, "..", "..", "..", "src", "data"))
sys.path.insert(0, ROOT_DATA)
import load as L  # noqa: E402

DATA = os.path.abspath(os.path.join(HERE, "..", "data"))


def work(*p):
    d = os.path.join(L.scratch(), "prd", *p[:-1])
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, p[-1])


def orig_scifact():
    """The original SciFact release (downloaded by the Pipeline lab): claims with SUPPORT / CONTRADICT labels."""
    return os.path.join(L.scratch(), "pipe", "scifact_orig", "data")


def save(name, obj):
    os.makedirs(DATA, exist_ok=True)
    with open(os.path.join(DATA, name), "w") as f:
        json.dump(obj, f, indent=1, sort_keys=False)
    print("saved", name)


def loadavg():
    return [round(x, 2) for x in os.getloadavg()]
