# Histories of the Consistency lab (also in parts/41_js_hist.js; check_recompute.mjs compares them).
# One register x, initially 0. p: client, s/e: start and end time, f: 'w' write or 'r' read, v: value written or returned.
HIST = [
 {'id': 'ok', 'ops': [{'p': 1, 's': 0, 'e': 2, 'f': 'w', 'v': 1}, {'p': 2, 's': 3, 'e': 4, 'f': 'r', 'v': 1}, {'p': 3, 's': 5, 'e': 6, 'f': 'r', 'v': 1}]},
 {'id': 'stale', 'ops': [{'p': 1, 's': 0, 'e': 2, 'f': 'w', 'v': 1}, {'p': 2, 's': 3, 'e': 4, 'f': 'r', 'v': 0}, {'p': 2, 's': 6, 'e': 7, 'f': 'r', 'v': 1}]},
 {'id': 'overlap', 'ops': [{'p': 1, 's': 0, 'e': 7, 'f': 'w', 'v': 1}, {'p': 2, 's': 1, 'e': 2, 'f': 'r', 'v': 0}, {'p': 3, 's': 4, 'e': 5, 'f': 'r', 'v': 1}]},
 {'id': 'inversion', 'ops': [{'p': 1, 's': 0, 'e': 7, 'f': 'w', 'v': 1}, {'p': 2, 's': 1, 'e': 2, 'f': 'r', 'v': 1}, {'p': 3, 's': 4, 'e': 5, 'f': 'r', 'v': 0}]},
 {'id': 'own', 'ops': [{'p': 1, 's': 0, 'e': 1, 'f': 'w', 'v': 1}, {'p': 1, 's': 2, 'e': 3, 'f': 'r', 'v': 0}, {'p': 1, 's': 5, 'e': 6, 'f': 'r', 'v': 1}]},
 {'id': 'disagree', 'ops': [{'p': 1, 's': 0, 'e': 2, 'f': 'w', 'v': 1}, {'p': 2, 's': 0, 'e': 2, 'f': 'w', 'v': 2}, {'p': 3, 's': 3, 'e': 4, 'f': 'r', 'v': 1}, {'p': 3, 's': 5, 'e': 6, 'f': 'r', 'v': 2}, {'p': 4, 's': 3, 'e': 4, 'f': 'r', 'v': 2}, {'p': 4, 's': 5, 'e': 6, 'f': 'r', 'v': 1}]},
 {'id': 'causal', 'ops': [{'p': 1, 's': 0, 'e': 1, 'f': 'w', 'v': 1}, {'p': 2, 's': 2, 'e': 3, 'f': 'r', 'v': 1}, {'p': 2, 's': 4, 'e': 5, 'f': 'w', 'v': 2}, {'p': 3, 's': 6, 'e': 7, 'f': 'r', 'v': 2}, {'p': 3, 's': 8, 'e': 9, 'f': 'r', 'v': 1}]},
]
