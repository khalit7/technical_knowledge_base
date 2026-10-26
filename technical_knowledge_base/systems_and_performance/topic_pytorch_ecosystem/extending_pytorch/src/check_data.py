"""Checks: (1) the page embeds exactly the data build_data.py makes from inputs/; (2) every number written
literally in the Reading and tab prose is in the recorded data or in the short list of sourced/derived numbers below.
Run: python3 src/check_data.py (after sh src/build.sh)."""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
subprocess.run([sys.executable, os.path.join(HERE, "build_data.py")], check=True, capture_output=True)
js = open(os.path.join(HERE, "parts", "22_ext_data.js")).read()
page = open(os.path.join(HERE, "..", "index.html")).read()
assert js.split("window.EXT=")[1].strip() in page, "index.html does not embed the current data"
data = json.loads(js.split("window.EXT=")[1].rstrip().rstrip(";"))
blob = json.dumps(data)
def norm(s): return s.replace(",", "")
nums = set(norm(m) for m in re.findall(r"-?\d[\d,]*\.?\d*", blob))
# sourced elsewhere on the page (root, sibling, FACTS.md, PyPI, derived from shapes), each with its origin
OTHER = {"3186944": "running example, root", "3156736": "derived: 3145728 + 11008", "3145728": "derived: 4 x 786432",
         "11008": "43 x 256", "512": "8 x 64 tokens", "52": "parameters, root FACTS", "16": "4 blocks x 4", "1048576": "1024 x 256 x 4",
         "131072": "NF4 data (recorded)", "1024": "shape", "256": "shape", "64": "shape", "4.818": "sibling page tensors_dispatcher_and_autograd, Reading 2.6", "0.622": "sibling page tensors_dispatcher_and_autograd, Reading 2.6",
         "2.14.1": "version", "0.18.0": "torchao", "1.4.0": "helion", "3.8.0": "triton PyPI", "0.17.2": "kernels", "2026-10-13": "date",
         "2026-04-03": "helion 1.0, FACTS map", "355": "stable/library.h line", "50": "gelu_ext.cpp lines", "11": "derived 2.351/0.2065",
         "70": "illustrative 70B", "2.15": "version", "2.14": "version", "2019": "date", "2026": "date: TorchTPU and TorchNeuron public, 20 October 2026", "2.4": "sibling section", "2.7": "sibling section",
         "2.8": "sibling section", "3.6": "sibling section", "36": "data", "2": "", "3": "", "4": "", "5": "", "6": "", "7": "", "8": "", "9": "",
         "0": "", "1": "", "10": "", "12": "", "20": "", "60": "", "45": "", "40": "", "30": "", "25": "", "15": "", "55": "", "127": "int8 max",
         "0.7978845608028654": "tanh GELU constant", "0.044715": "tanh GELU constant", "0.7071067811865476": "1/sqrt2", "0.70710678": "1/sqrt2",
         "0.5": "constant", "1.0": "constant", "3.0": "clamp", "-3": "clamp", "-3.0": "clamp", "100": "", "13": "", "35": "",
         "135300": "recorded NF4 bytes", "12.58": "data MB", "3.18": "data MB", "2.0": "", "0.79788456": "constant", "8.0": "", "-1": "clamp range", "1.6": "section ref", "4.2": "section ref", "2.3": "section ref", "5.3": "section ref", "5.5": "section ref", "5.4": "section ref", "0.17": "kernels version"}
bad = []
for f in sorted(os.listdir(os.path.join(HERE, "parts"))):
    if not (f.startswith(("20_read", "3")) and f.endswith(".html")):
        continue
    h = open(os.path.join(HERE, "parts", f)).read()
    h = re.sub(r"<style>[\s\S]*?</style>", " ", h)
    h = re.sub(r"<h[23][^>]*>[\s\S]*?</h[23]>", " ", h)                 # headings carry section numbers
    h = re.sub(r"\b\d{4}-\d{2}-\d{2}\b|\b\d+\.\d+\.\d+\b", " ", h)       # dates and versions
    h = re.sub(r"(sections?|Reading|page|sibling page|Reading tab's section|Reading section|Reading) (\d\.\d)", " ", h)
    h = re.sub(r'<div class="code"[\s\S]*?</div>', " ", h)          # code listings are not claims
    h = re.sub(r"<[^>]+>", " ", h)
    h = re.sub(r"\{\{[^}]*\}\}", " ", h)
    for m in re.findall(r"(?<![\w.])-?\d[\d,]*\.?\d*(?![\w])", h):
        n = norm(m).rstrip(".")
        if n in nums or n in OTHER or n.rstrip("0").rstrip(".") in nums:
            continue
        bad.append((f, m))
print("numbers in prose not found in data or the sourced list:", len(bad))
for b in bad: print("  ", b)
