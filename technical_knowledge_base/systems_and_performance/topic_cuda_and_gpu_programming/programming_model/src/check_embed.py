"""Run from src/: the page embeds exactly out/data.json (window.PM), every <span data-pmv="path"> number
in the Reading parts equals the data at that path (to the shown precision), and nothing private leaks."""
import json, re, glob, sys
D = json.load(open("out/data.json"))
html = open("../index.html").read()
bad = 0
m = re.search(r"window\.PM=(\{.*?\});\n", html)
if not m or json.loads(m.group(1)) != D:
    print("embedded data differs from out/data.json"); bad += 1

def get(path):
    v = D
    for k in path.split("."):
        v = v[int(k)] if isinstance(v, list) else v[k]
    return v

n = 0
for f in sorted(glob.glob("parts/20_read_*.html")):
    for path, txt in re.findall(r'<span data-pmv="([^"]+)">([^<]*)</span>', open(f).read()):
        n += 1
        v = get(path)
        if isinstance(v, str):
            ok = txt in v
        else:
            t = txt.replace(",", "")
            dec = len(t.split(".")[1]) if "." in t else 0
            ok = abs(round(float(v), dec) - float(t)) < 1e-9
        if not ok:
            print("MISMATCH", f, path, "page", txt, "data", v); bad += 1
for pat in ("/Users/", "Users-", "glpat", "sk-ant", "-Users-"):
    for f in ["../index.html", "../README.md"] + [g for g in glob.glob("**/*", recursive=True) if not g.endswith("check_embed.py")]:
        try:
            if pat in open(f, errors="ignore").read():
                print("PRIVATE", pat, f); bad += 1
        except (IsADirectoryError, UnicodeDecodeError):
            pass
print(f"{n} prose numbers checked; data embedded; {'FAIL ' + str(bad) if bad else 'ok'}")
sys.exit(1 if bad else 0)
