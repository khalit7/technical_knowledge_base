# Coverage and corrections

This is a new page: it has no old Notion text of its own. Its subject was covered in two short sections of the old
child "Filtering, dedup, and the curation pipeline" (saved verbatim in the root's `src/read/old/02_filtering_dedup_pipeline.md`,
sections 4 and 5). Every claim there, checked:

| Old claim | Verdict | Where on this page |
|---|---|---|
| "standard is n-gram overlap (GPT-3 used 13-grams; most groups use 10-13-gram exact or near-exact match)" | **Corrected**: GPT-3 13, Cosmopedia 10, datatrove 12, Llama 2 spans over 10 tokens, but PaLM, Llama 3 and Tulu 3 use 8-grams, and Singh et al. find n above 8 causes misses | section 2 table |
| "plus longest-common-substring ratios" | Verified in spirit: Cosmopedia's difflib ratio, ConTAM's longest match | section 2 |
| "embedding similarity for paraphrased leakage" | Verified, with Tulu 3's caveat that it could not separate similarity from paraphrase | section 4 |
| "DCLM checked whether their gains came from contamination and found they did not (notably for MMLU)" | Verified: Table 7, MMLU 51.8 to 52.7 and HellaSwag 77.9 to 78.4 at 7B-2x | section 1 |
| "always decontaminate against your own eval suite" | Kept; refined: also per subject, and re-run when the suite changes | mistakes |
| "over-aggressive decontamination (short n-grams, common phrases) silently removes good data. Log what you drop" | Verified and measured: 5-grams touch 64 to 84% of web documents; datatrove's default removes 288 of 19,241 pages, 261 on one n-gram of twelve zeros | sections 2, 3 |
| "FineWeb: regex-anonymize email addresses and public IPs" | Verified (card) | section 7 |
| "Phone numbers and physical addresses are noisier to detect; most web corpora stop at email/IP" | **Corrected**: FineWeb stops there (no phones "due to the high false positive rate"), but Dolma masks phones too, ROOTS handles and ids, Apertus IBANs | section 7 table |
| "Presidio-style NER scrubbers and NeMo Curator's PII module go further" | **Corrected**: NeMo Curator 1.4.0 has no PII module in the library, only a GLiNER-PII tutorial (GPU) | section 7 |
| "Opt-out honoring (robots.txt after the fact, takedown lists) is now standard for redistribution" | **Corrected**: not standard. FineWeb, DCLM and Nemotron-CC do not apply later robots.txt retroactively; Apertus did (about 8% of English tokens); FineWeb and Dolma offer PII removal forms; The Stack runs repository opt-outs | sections 8, 9 |

Sources and quotes for everything else are in `notes/` (research notes copied from the scratch folder:
`research_contam.md`, `research_gov.md`), each fact with its URL and the date read.

Corrections to other pages suggested in the report (not edited here): the root's section 6 says "Llama 3 and Tulu 3 use
8-grams" (true, but Llama 3 used them for analysis only and cleaned post-training data by exact prompt match); the
synthetic_data sibling says copyright and court cases are covered on this page (they are on Pretraining corpora; this
page links there).
