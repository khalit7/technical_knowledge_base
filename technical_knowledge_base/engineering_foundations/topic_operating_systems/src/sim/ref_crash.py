"""Crash consistency reference (OSTEP chapter 42, FSCK and Journaling).

The chapter's example: append one block to a file. Three blocks change on disk: the inode I (v1 -> v2, which
points at data block 5), the data bitmap B (v1 -> v2, which marks block 5 used) and block 5 itself
(old contents -> the new data Db). A mode is a list of groups: the blocks in a group are issued together
and the disk may persist any subset of them, in any order; the next group starts only after the whole group
has completed (a barrier, or a FLUSH/FUA on a real disk). A crash leaves every earlier group complete and
any subset of the current group on disk.

Recovery: with no journal, fsck (trust the inode: mark its block used; free blocks no inode points to; it
cannot tell garbage data from real data). With a journal, replay a transaction only if its commit block TxE
is on disk (redo logging), copying the journal's copies of the blocks to their final places.
"""
from itertools import combinations

MODES = {
    "none": [["I", "B", "D"]],
    "data": [["TxB", "jI", "jB", "jD"], ["TxE"], ["I", "B", "D"]],
    "data_onebatch": [["TxB", "jI", "jB", "jD", "TxE"], ["I", "B", "D"]],
    "ordered": [["D", "TxB", "jI", "jB"], ["TxE"], ["I", "B"]],
    "meta_data_late": [["TxB", "jI", "jB"], ["TxE"], ["I", "B", "D"]],
}


def crash_states(mode):
    """Every (group index, persisted subset) a crash can leave, plus the state after everything completed."""
    groups = MODES[mode]
    out = []
    for g, blocks in enumerate(groups):
        for k in range(len(blocks)):          # strictly partial subsets of this group
            for sub in combinations(blocks, k):
                if g > 0 and k == 0:
                    continue                  # same as the previous group complete with nothing more
                out.append((g, sub))
    out.append((len(groups), ()))
    return out


def disk_after(mode, g, sub):
    done = set(b for gr in MODES[mode][:g] for b in gr) | set(sub)
    disk = {"I": "v2" if "I" in done else "v1", "B": "v2" if "B" in done else "v1",
            "D": "Db" if "D" in done else "garbage"}
    jr = {k: (k in done) for k in ("TxB", "jI", "jB", "jD", "TxE")}
    return disk, jr


def recover(mode, disk, jr):
    d = dict(disk)
    action = ""
    if mode == "none":
        if d["I"] == "v2" and d["B"] == "v1":
            d["B"] = "v2"
            action = "fsck: the inode points at block 5 but the bitmap says free; fsck trusts the inode and marks it used"
        elif d["I"] == "v1" and d["B"] == "v2":
            d["B"] = "v1"
            action = "fsck: block 5 is marked used but no inode points at it; fsck frees it (no leak)"
        else:
            action = "fsck: inode and bitmap agree; nothing to fix (fsck cannot check what is inside a data block)"
    else:
        if jr["TxE"]:
            d["I"], d["B"] = "v2", "v2"
            if "jD" in [b for gr in MODES[mode] for b in gr]:
                d["D"] = "Db" if jr["jD"] else "garbage"
                action = "replay: TxE is on disk, so the transaction is committed; copy I, B and the journal's copy of block 5 into place"
            else:
                action = "replay: TxE is on disk, so the transaction is committed; copy I and B into place (data is not in the journal)"
        else:
            action = "no TxE on disk: the transaction never committed; recovery skips it"
    return d, action


def classify(d):
    if d["I"] == "v1" and d["B"] == "v1":
        return "old"        # consistent; the append is lost (the user's write did not happen)
    if d["I"] == "v2" and d["B"] == "v2":
        return "new" if d["D"] == "Db" else "garbage"
    return "inconsistent"


def table(mode):
    rows = []
    for g, sub in crash_states(mode):
        disk, jr = disk_after(mode, g, sub)
        before = classify(disk)
        after, action = recover(mode, disk, jr)
        rows.append({"group": g, "persisted": list(sub), "disk": disk, "before": before,
                     "after": classify(after), "final": after, "action": action})
    return rows


def summary(mode):
    s = {}
    for r in table(mode):
        s[r["after"]] = s.get(r["after"], 0) + 1
    return s
