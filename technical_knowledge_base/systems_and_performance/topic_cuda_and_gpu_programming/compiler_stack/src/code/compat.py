"""Which image of a fat binary does the CUDA driver load on a given GPU? The documented rules, as code.
Sources: CUDA Programming Guide 13.4 section 1.3 (cubin: same major, minor >= target; PTX: JIT for any compute
capability >= the PTX's); NVIDIA blog, May 1 2025 ('a': only that exact compute capability; 'f': the same major,
minor >= target); CUDA compatibility guide (PTX from a newer toolkit does not work on older drivers, CUDA 13.x
needs driver >= 580); CUDA 13.4 environment variables (CUDA_FORCE_PTX_JIT, CUDA_DISABLE_PTX_JIT); runtime error
codes from driver_types.h (CUDA 13.4.2). A model of documented behaviour; not run on a GPU here.
The page's JavaScript (parts/31_js_run.js) is a port; check/check_js.mjs compares it with expected.json written here."""
import json, os, itertools


def parse(t):                       # "sm_90a" -> ("sm", 90, "a")
    kind, rest = t.split("_"); num = int("".join(c for c in rest if c.isdigit())); suf = rest[len(str(num)):]
    return kind, num, suf


def ok_sass(num, suf, cc):
    if suf == "a": return num == cc, "an 'a' cubin runs only on exactly CC %d.%d" % divmod(num, 10)
    same = num // 10 == cc // 10 and num % 10 <= cc % 10
    if suf == "f": return same, "an 'f' cubin runs on CC %d.x with minor >= %d" % divmod(num, 10)
    return same, "a cubin runs on the same major (%d) with minor >= %d" % divmod(num, 10)


def ok_ptx(num, suf, cc):
    if suf == "a": return num == cc, "'a' PTX can be compiled only for exactly CC %d.%d" % divmod(num, 10)
    if suf == "f": return num // 10 == cc // 10 and num % 10 <= cc % 10, "'f' PTX: same major, minor >= %d" % (num % 10)
    return num <= cc, "PTX can be JIT-compiled for any CC >= %d.%d" % divmod(num, 10)


def decide(images, cc, driver=134, toolkit=134, force_ptx=False, disable_ptx=False):
    """images: list of target strings, 'sm_..' (SASS) or 'compute_..' (PTX). driver/toolkit: CUDA version x10."""
    steps = []
    if driver < 130:
        return {"outcome": "error", "code": "cudaErrorInsufficientDriver", "steps": ["a CUDA 13 application needs driver r580 (CUDA 13.0) or newer"]}
    sass = [parse(t) for t in images if t.startswith("sm_")]; ptx = [parse(t) for t in images if t.startswith("compute_")]
    best = None
    if not force_ptx:
        for _, n, s in sass:
            good, why = ok_sass(n, s, cc); steps.append(["sass", "sm_%d%s" % (n, s), good, why])
            if good and (best is None or n > best[0] or (n == best[0] and s == "a")): best = (n, s)
        if best: return {"outcome": "sass", "image": "sm_%d%s" % best, "steps": steps}
    else:
        steps.append(["note", "CUDA_FORCE_PTX_JIT=1: every cubin ignored", None, ""])
    if disable_ptx:
        steps.append(["note", "CUDA_DISABLE_PTX_JIT=1: PTX not considered", None, ""])
        return {"outcome": "error", "code": "cudaErrorNoKernelImageForDevice", "steps": steps}
    bp = None
    for _, n, s in ptx:
        good, why = ok_ptx(n, s, cc); steps.append(["ptx", "compute_%d%s" % (n, s), good, why])
        if good and (bp is None or n > bp[0]): bp = (n, s)
    if bp is None: return {"outcome": "error", "code": "cudaErrorNoKernelImageForDevice", "steps": steps}
    if toolkit > driver:
        steps.append(["jit", "compute_%d%s" % bp, False, "PTX made by CUDA %.1f; this driver's JIT knows CUDA %.1f" % (toolkit / 10, driver / 10)])
        return {"outcome": "error", "code": "cudaErrorUnsupportedPtxVersion", "steps": steps}
    steps.append(["jit", "compute_%d%s" % bp, True, "the driver compiles it for CC %d.%d and caches the result" % divmod(cc, 10)])
    return {"outcome": "jit", "image": "compute_%d%s" % bp, "steps": steps}


GPUS = [["A100", 80], ["A10, RTX 3090", 86], ["Jetson AGX Orin", 87], ["L4, L40S, RTX 4090", 89], ["H100, H200, GH200", 90],
        ["B200, GB200", 100], ["B300, GB300", 103], ["Jetson T5000 (Thor)", 110], ["RTX 5090, RTX PRO 6000", 120], ["GB10 (DGX Spark)", 121]]

if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    fat = {"sm90a": ["compute_90", "sm_90a", "compute_90a"], "sm90": ["sm_90", "compute_90"], "c90": ["compute_90"], "sm90only": ["sm_90"],
           "two": ["sm_80", "sm_90", "compute_90"], "f100": ["compute_100", "sm_100f", "compute_100f"],
           "allmajor": ["sm_75", "sm_80", "sm_90", "sm_100", "sm_110", "compute_120", "sm_120"],
           "torch": ["sm_80", "sm_86", "sm_90", "sm_100", "sm_120", "compute_120"],
           "wheel": ["sm_75", "sm_80", "sm_86", "sm_90", "sm_100", "sm_120"], "nightly": ["sm_75", "sm_80", "sm_86", "sm_90", "sm_100", "sm_120", "compute_120"]}
    cases = []
    for (k, imgs), (_, cc), drv, fp, dp in itertools.product(fat.items(), GPUS + [["future 13.0", 130]], (130, 134), (False, True), (False, True)):
        if fp and dp: continue
        r = decide(imgs, cc, drv, 134, fp, dp)
        cases.append({"fat": k, "cc": cc, "driver": drv, "force": fp, "disable": dp, "outcome": r["outcome"], "image": r.get("image"), "code": r.get("code")})
    json.dump({"fat": fat, "gpus": GPUS, "cases": cases}, open(os.path.join(here, "..", "out", "compat_expected.json"), "w"), indent=0)
    from collections import Counter
    print(len(cases), "cases", Counter(c["outcome"] for c in cases))
    for k in fat:
        print(k, [(g[0], decide(fat[k], g[1])["outcome"]) for g in GPUS + [["future", 130]]])
