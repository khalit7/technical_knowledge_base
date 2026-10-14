"""Constructed access-control labels on the real SciFact corpus (shared by acl_pg.py, acl_qdrant.py and the page).
Every abstract gets one group from the first byte of sha256(doc id): a fixed, reproducible assignment with no
relation to content. Users are sets of groups. The labels are constructed; the documents and queries are real."""
import hashlib

GROUPS = [("public", 40), ("eng", 30), ("sales", 20), ("legal", 8), ("hr", 2)]  # percent of buckets 0-99
USERS = {"admin": ["public", "eng", "sales", "legal", "hr"], "employee": ["public", "eng", "sales"],
         "contractor": ["public"], "legal": ["legal"], "hr": ["hr"]}


def group_of(doc_id):
    b = int(hashlib.sha256(doc_id.encode()).hexdigest(), 16) % 100
    acc = 0
    for g, p in GROUPS:
        acc += p
        if b < acc:
            return g
    raise AssertionError
