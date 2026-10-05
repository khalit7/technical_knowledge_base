"""Record the name -> object graph after each statement, for the Reading animation.
Two programs on the same input: a shallow copy and a deep copy. Lists are labelled
L1, L2, ... by id() in order of first appearance (labels stay fixed for the whole
program), so the picture is CPython's real sharing. Ints are shown as values."""
import copy, json, sys

def run(lines):
    ns, labels, keep, steps = {"copy": copy}, {}, [], []
    def label(o):
        if id(o) not in labels:
            labels[id(o)] = f"L{len(labels) + 1}"
            keep.append(o)                 # keep alive so ids are never reused
        return labels[id(o)]
    for line in lines:
        exec(line, ns)
        objs, seen = [], set()
        def walk(o):
            lab = label(o)
            if lab in seen:
                return lab
            seen.add(lab)
            items = [walk(k) if isinstance(k, list) else repr(k) for k in o]
            objs.append({"id": lab, "items": items})
            return lab
        names = {n: walk(ns[n]) for n in ["row", "grid", "copy1"] if n in ns}
        objs.sort(key=lambda d: int(d["id"][1:]))
        steps.append({"line": line, "names": names, "objs": objs})
    return steps

PROGRAMS = {
  "shallow": ["row = [1, 2]", "grid = [row, row]", "copy1 = grid.copy()", "grid[0].append(3)", "grid.append([9])"],
  "deep":    ["row = [1, 2]", "grid = [row, row]", "copy1 = copy.deepcopy(grid)", "grid[0].append(3)", "grid.append([9])"],
}
print(json.dumps({k: run(v) for k, v in PROGRAMS.items()}, separators=(",", ":")))
