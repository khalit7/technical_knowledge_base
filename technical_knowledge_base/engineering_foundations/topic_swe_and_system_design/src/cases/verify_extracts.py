"""Check that every quote in inputs/extracts_*.json appears verbatim in the text of its source.

The sources were downloaded on 2026-10-04 and turned into plain text (tags stripped) in a scratch
folder that is not committed (pass it as the first argument). Whitespace and typographic quotes are
normalised before matching; nothing else is. Writes inputs/verify_log.txt.
Usage: python3 verify_extracts.py <folder with <case>.txt files>
"""
import json, glob, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
# case id -> downloaded text file name (without .txt)
TEXT = {
    "aws-2025-dns": "aws", "aws-2025-dwfm": "aws", "cf-2025-11": "cf2025", "cf-2025-09": "cfsep",
    "gcp-2025-06": "gcp2025", "cf-2026-02": "cffeb", "cf-2026-05": "cforange",
    "gh-2026-04-dns": "gh_april-2026", "gh-2026-04-lb": "gh_april-2026", "anth-2025-09": "anth",
    "oai-2024-12": "oai", "crowd-2024-07": "crowd", "roblox-2021-10": "roblox", "fb-2021-10": "fb2021",
    "slack-2021-01": "slack2021", "gh-2018-10": "gh2018", "gitlab-2017-01": "gitlab",
    "knight-2012-08": "knight", "stripe-2017": "stripe", "aws-jitter-2015": "jitter",
    "abl-timeouts": "abl_retry", "discord-2023": "discord", "insta-2012": "insta",
    "notion-2021": "notion", "figma-2024": "figma", "shopify-2018": "shopify",
    "memcache-2013": "memcache", "netflix-2011": "netflix", "sre-2016": "sre",
    "twitter-2013": "tw2013", "cai-2024": "cai", "vllm-2023": "vllm", "anyscale-2023": "anyscale",
}
# extra texts a case may also quote from (a second page of the same source set)
EXTRA = {"crowd-2024-07": ["crowdpir", "mscrowd"], "stripe-2017": ["stripedoc"]}


def norm(s):
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    s = s.replace(" ", " ").replace("ﬁ", "fi").replace("ﬂ", "fl")
    return re.sub(r"\s+", " ", s).strip()


def main(folder):
    ex = {}
    for f in sorted(glob.glob(os.path.join(HERE, "inputs", "extracts_*.json"))):
        ex.update(json.load(open(f)))
    log, bad = [], 0
    for cid, e in ex.items():
        names = [TEXT[cid]] + EXTRA.get(cid, [])
        txt = " ".join(norm(open(os.path.join(folder, n + ".txt"), errors="ignore").read()) for n in names)
        for i, q in enumerate(e["quotes"]):
            ok = norm(q) in txt
            bad += not ok
            log.append(f"{'ok ' if ok else 'MISSING'} {cid} q{i}: {q[:70]}")
    log.append(f"cases {len(ex)}, quotes {sum(len(e['quotes']) for e in ex.values())}, missing {bad}")
    open(os.path.join(HERE, "inputs", "verify_log.txt"), "w").write("\n".join(log) + "\n")
    print("\n".join(l for l in log if not l.startswith("ok")))
    return bad


if __name__ == "__main__":
    sys.exit(1 if main(sys.argv[1]) else 0)
