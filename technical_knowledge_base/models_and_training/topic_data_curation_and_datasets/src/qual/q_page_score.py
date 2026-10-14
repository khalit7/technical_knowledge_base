"""Both published quality scores for any page of the running example, by WARC-Record-ID or URL
(for the Reading tab's page animation, step 6). Scores the run0 *extracted* text, so it works for pages
that a later filter removed too. usage: q_page_score.py <WARC-Record-ID or URL> [...]"""
import sys
import q_common as Q

docs = Q.L.run0("extracted")
for key in sys.argv[1:]:
    hit = [d for d in docs if d["id"] == key or d["metadata"].get("url") == key]
    if not hit:
        print(key, "not in run0 extracted"); continue
    t = hit[0]["text"]
    e = Q.edu_scores([t])[0]; d = Q.dclm_scores([t])[0]
    print({"id": hit[0]["id"], "edu_score": round(e, 3), "edu_int_score": Q.int_score(e), "edu_keeps": e >= 2.5,
           "dclm_p_hq": round(d, 5), "dclm_keeps": d >= 0.01811426877975464})
