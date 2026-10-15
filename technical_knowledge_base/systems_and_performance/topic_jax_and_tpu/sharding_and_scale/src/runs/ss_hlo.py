"""Read shardings and collectives out of HLO text dumps, for the propagation explorer.

Two sharding notations appear in XLA HLO after propagation:
  Shardy (axis-based):  sharding={mesh['data'=2,'model'=4], [{'data'}, {}, {}]}
  GSPMD (device tiles): sharding={devices=[2,1,1,4]<=[8] last_tile_dim_replicate}
Both are converted here to one PartitionSpec-like string, e.g. "P(data, -, -)", by working out which mesh
axis varies along each tiled dimension (mesh devices are numbered row-major: device = data*4 + model).
"""
import itertools
import re

import numpy as np

INSTR = re.compile(r"^\s*(?:ROOT\s+)?%(\S+)\s*=\s*(\([^=]*?\)|\S+?)\s+([a-z][\w-]*)\((.*)$")
COMMENT = re.compile(r"/\*.*?\*/")
SHAPE = re.compile(r"^(\w+)\[([\d,]*)\]")


def _field(rest, key):
    """Value of key={...} with balanced braces, or None."""
    i = rest.find(key + "={")
    if i < 0:
        return None
    j, depth = i + len(key) + 1, 0
    for k in range(j, len(rest)):
        if rest[k] == "{":
            depth += 1
        elif rest[k] == "}":
            depth -= 1
            if depth == 0:
                return rest[j + 1:k]
    return None


def iota_devices(spec):
    """'<=[8]' or '<=[2,4]T(1,0)' -> flat list of device ids."""
    m = re.match(r"<=\[([\d,]+)\](?:T\(([\d,]+)\))?", spec)
    dims = [int(x) for x in m.group(1).split(",")]
    a = np.arange(int(np.prod(dims))).reshape(dims)
    if m.group(2):
        a = a.transpose([int(x) for x in m.group(2).split(",")])
    return a.reshape(-1).tolist()


def gspmd_to_spec(s, rank, mesh_shape, axis_names):
    """GSPMD HloSharding text -> 'P(...)' over the named mesh, or the raw text when it cannot be read."""
    s = s.strip()
    if s in ("replicated", "maximal device=0") or s.startswith("{replicated"):
        return "P(" + ", ".join(["-"] * rank) + ")" if rank else "P()"
    m = re.match(r"devices=\[([\d,]+)\](\S+)(.*)", s)
    if not m:
        return "raw:" + s
    tiles = [int(x) for x in m.group(1).split(",")]
    rest = m.group(3)
    if m.group(2).startswith("<="):
        devs = iota_devices(m.group(2))
    else:
        devs = [int(x) for x in m.group(2).split(",")]
    has_rep = "last_tile_dim_replicate" in rest
    n_data = rank
    if len(tiles) > rank + (1 if has_rep else 0) or "last_tile_dims" in rest:
        return "raw:" + s
    arr = np.array(devs).reshape(tiles)
    coords = {d: np.unravel_index(d, mesh_shape) for d in range(int(np.prod(mesh_shape)))}
    out = []
    for dim in range(n_data):
        if tiles[dim] == 1:
            out.append("-")
            continue
        # which mesh axes change when stepping along this tile dimension (others fixed at 0)
        varying = []
        for ax in range(len(mesh_shape)):
            vals = set()
            for i in range(tiles[dim]):
                idx = [0] * len(tiles)
                idx[dim] = i
                vals.add(coords[int(arr[tuple(idx)])][ax])
            if len(vals) > 1:
                varying.append(axis_names[ax])
        prod = 1
        for ax in varying:
            prod *= mesh_shape[axis_names.index(ax)]
        out.append("+".join(varying) if prod == tiles[dim] else "?" + str(tiles[dim]))
    return "P(" + ", ".join(out) + ")"


def shardy_to_spec(s):
    """Shardy text "mesh['data'=2,'model'=4], [{'data'}, {}, {}]" -> 'P(data, -, -)'."""
    m = re.search(r"\],\s*\[(.*)\]", s)
    if not m:
        if "replicated" in s or "{}" == s.strip():
            return "P()"
        return "raw:" + s
    dims = re.findall(r"\{([^}]*)\}", m.group(1))
    out = []
    for d in dims:
        axes = [a.strip().strip("'\"") for a in d.split(",") if a.strip() and a.strip() != "?"]
        out.append("+".join(axes) if axes else "-")
    return "P(" + ", ".join(out) + ")"


def frames(text):
    """Stack-frame tables printed at the top of newer HLO dumps -> {frame id: (file base name, line)}."""
    files, locs, fr, sect = {}, {}, {}, None
    for line in text.splitlines():
        t = line.strip()
        if t in ("FileNames", "FunctionNames", "FileLocations", "StackFrames"):
            sect = t
            continue
        if not t or t.startswith("HloModule") or t.startswith("%") or t.startswith("ENTRY") or t.startswith("ROOT"):
            if t.startswith("%") or t.startswith("ENTRY"):
                sect = None
            continue
        m = re.match(r"(\d+)\s+(.*)", t)
        if not m or sect is None:
            continue
        i, body = int(m.group(1)), m.group(2)
        if sect == "FileNames":
            files[i] = body.strip('"').rsplit("/", 1)[-1]
        elif sect == "FileLocations":
            f = re.search(r"file_name_id=(\d+)", body)
            ln = re.search(r"\bline=(\d+)", body)
            locs[i] = (files.get(int(f.group(1))), int(ln.group(1)))
        elif sect == "StackFrames":
            loc = re.search(r"file_location_id=(\d+)", body)
            fr[i] = locs.get(int(loc.group(1)))
    return fr


def instructions(text):
    """Every instruction: name, opcode, shape, sharding text, op_name, file and line of the innermost user frame."""
    fr = frames(text)
    out = []
    for line in text.splitlines():
        m = INSTR.match(COMMENT.sub("", line))
        if not m:
            continue
        name, typ, opcode, rest = m.groups()
        sh = _field(rest, "sharding")
        md = _field(rest, "metadata") or ""
        opn = re.search(r'op_name="([^"]*)"', md)
        sl = re.search(r"source_line=(\d+)", md)
        sf = re.search(r'source_file="([^"]*)"', md)
        sfid = re.search(r"stack_frame_id=(\d+)", md)
        file, ln = (sf.group(1).rsplit("/", 1)[-1] if sf else None), (int(sl.group(1)) if sl else None)
        if sfid and fr.get(int(sfid.group(1))):
            file, ln = fr[int(sfid.group(1))]
        out.append({"name": name, "op": opcode, "type": typ, "sharding": sh,
                    "op_name": opn.group(1) if opn else "", "line": ln, "file": file})
    return out


def dims_of(typ):
    m = SHAPE.match(typ)
    if not m:
        return None
    return [int(x) for x in m.group(2).split(",") if x]
