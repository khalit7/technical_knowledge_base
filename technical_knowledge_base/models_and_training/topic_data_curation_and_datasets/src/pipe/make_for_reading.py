"""Write out/for_reading.json: the values the Reading tab's TODOs 2, 4 and 5 need (from out/page_data.json)."""
import json, os
H = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(H, "out", "page_data.json")))
p = D["pages"][0]
assert p["host"] == "www.protectnmwater.org"
tok = list(D["derived"]["gpt2_tokens"].values())
V = D["derived"]["variants_vs_fineweb"]["char_dup_0.1"]
out = {
 "todo2_real_page": {
  "source": "Common Crawl CC-MAIN-2024-30, WARC file 00000, URL http://www.protectnmwater.org/ (advocacy campaign page); WET lines in page order, kept flag = line reproduced by trafilatura 1.11.0 (favour_precision) in run0",
  "LINES": [[l, k] for l, k in zip(p["wet_lines"], p["keep"]["traf"])],
  "LINES_resiliparse_flags": p["keep"]["res"],
  "HTML_excerpt": p["html_excerpt"], "html_chars": p["html_chars"], "html_tags": p["html_tags"],
  "lid176_english": {"trafilatura_text": p["traf"]["en"], "wet_text": p["wet"]["en"], "resiliparse_text": p["res"]["en"]},
  "verdicts": {"trafilatura": p["traf"]["out"], "resiliparse": p["res"]["out"], "wet": p["wet"]["out"]},
  "chars": {"trafilatura": p["traf"]["chars"], "resiliparse": p["res"]["chars"], "wet": p["wet"]["chars"]}},
 "todo4_measured_funnel": {
  "docs": {"html_pages": 20463, "after_url": 20280, "after_extraction": 19241, "after_lid": 6971, "after_gopher": 3576,
           "after_c4_and_fineweb_rules": 2692, "after_minhash_in_file": 2617},
  "gpt2_tokens": {"after_gopher_base_filtered": tok[0], "after_c4_and_fineweb_rules": tok[1], "after_minhash_in_file": tok[2]},
  "share_of_base_filtered_tokens": {"base_filtered": 1.0, "after_c4_and_fineweb_rules": round(tok[1] / tok[0], 3), "after_minhash_in_file": round(tok[2] / tok[0], 3)},
  "note": "FineWeb's order is base filter -> MinHash -> C4/custom; ours is base filter -> C4/custom -> MinHash (inside one file). Shares kept: C4+FineWeb rules 79.5% (FineWeb 75%), MinHash 98.6% in one file (FineWeb 55.6% per crawl)."},
 "todo5_char_dup": {"extra_docs_kept_at_0.1": V["extra_kept"], "of_which_in_fineweb": V["extra_in_fineweb"],
                    "kept_at_0.01": 2692, "kept_at_0.1": 2692 + V["extra_kept"],
                    "labelled_drops_wrong_of_8": D["label_summary"]["char_dup_ratio"]["W"],
                    "conclusion": "FineWeb's released data matches the code default 0.01, not the paper's 0.1 (0 of the 154 extra documents are in FineWeb, which holds 89% of our default output)"}}
json.dump(out, open(os.path.join(H, "out", "for_reading.json"), "w"), ensure_ascii=False, indent=1)
print(out["todo2_real_page"]["lid176_english"], out["todo2_real_page"]["verdicts"], out["todo4_measured_funnel"]["share_of_base_filtered_tokens"])
