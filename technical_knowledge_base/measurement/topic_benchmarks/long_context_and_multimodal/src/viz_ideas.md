# Visualisation ideas: Long-context and multimodal benchmarks (child of Topic: benchmarks)

Central question: does the model use the context (or the image) it accepts, and how would a benchmark know? Each generation of benchmark in both families closed a shortcut (literal match; blind answerability), so the strongest visuals run the same item with and without the shortcut.

Checked first: the parent's Benchmark atlas (rows for all 11 benchmarks with dated readings), Saturation timeline (no long-context or multimodal series), Same model, many numbers (no case here); siblings (no long-context or multimodal visuals); Positional Encodings (context extension, needle tests in recipes: linked, not rebuilt); Llama 3 Herd, Qwen3 and Latent Context LM paper pages (RULER and needle tables: linked).

Scores: quantity the reader moves (0-2), reproduces a published figure (x2), computable from public data (x2), shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere; minus build cost.

| # | Idea | What it shows, what the reader does | Score | Data and sources | Placement | Status |
|---|---|---|---|---|---|---|
| LM1 | **One needle, three questions (before/after animation)** | NoLiMa's Semper Opera needle in a haystack strip; Direct, one-hop (Dresden), two-hop (Saxony) questions; content words shared (computed live), the latent hop, then Llama 3.3 70B accuracy at 8K, 16K, 32K with the Direct bars as ghosts; "answer options" toggle restores a literal match (Table 6 MC rows) | 2+2+2+2+2+2+2 = 14 | NoLiMa v3 Section 3 and Table 6; overlap recomputed in recompute.py | Reading, NoLiMa | built |
| LM2 | **The image, on and off (before/after animation)** | MMMU validation: random, base LLM blind, same vision model blind, with image (GPT-4V, Gemini Pro Vision); then MMMU-Pro step by step (filter, 10 options, screenshot, mean) for 11 models with human medium/high markers and random choice per step | 2+2+2+2+2+2+2 = 14 | MMStar v2 Table 3; MMMU-Pro v3 Table 1 (all printed deltas reproduce) | Reading, MMMU | built |
| LM3 | **Effective length tab** | 17 RULER and 22 NoLiMa rows: claimed window against effective length, absolute or relative rule, threshold slider, score curves for up to four models | 2+2+2+2+2+2+1 = 13 | RULER v3 Table 3 (17/17 reproduce); NoLiMa v3 Tables 3 and 10 (14/22 reproduce; 8 print "1K" where the rule gives "<1K", as the README prints) | Own tab | built |
| LM4 | **Grade a real MRCR item** | Row 170 of openai/mrcr (2 needles, 16,317 tokens) mapped by message; SequenceMatcher ported to JS; six presets with Python values; editable reply | 2+2+2+2+2+1+2 = 13 | HF dataset (MIT), dataset card grader; exact against difflib | Own tab | built |
| LM5 | Lost in the middle U-curve | Six models' accuracy by gold position with closed-book and oracle lines | 1+2+2+1+1+1+2 = 10 | Liu et al. v3 Tables 1 and 6 | Reading, Position | built |
| LM6 | Kamradt needle with shared words marked | The original needle and question, content-word overlap computed | 0+1+2+1+1+1+1 = 7 | Anthropic's quotation of the test | Reading, NIAH | built |
| LM7 | Half-widths at the top score | 95% binomial half-width per benchmark from item counts | 0+1+2+1+1+1+1 = 7 | item counts from the papers | Reading, Use now | built (text) |
| LM8 | Saturation chart of these benchmarks | Would duplicate the parent's Saturation timeline pattern with sparse, mostly author-reported points; the table "in one screen" carries the dated readings | rejected | | | rejected |
| LM9 | Run a small open model on MMMU text-only | A 0.5B model would score near chance and teach less than MMStar's published blind scores for GPT-4V | rejected | | | rejected |
| LM10 | Redistribute NoLiMa needles as a browsable set | Adobe Research licence (non-commercial, licence must travel with copies) | rejected | | | rejected |
| LM11 | ANLS calculator for DocVQA | Small gain; the formula in text suffices and no released per-item model outputs to grade | rejected | | | rejected |
| LM12 | Depth-by-length NIAH heatmap | Saturated test; a heatmap of all green would only restate it | rejected | | | rejected |

What the methodology lacked here: a rule for real items whose text contains forbidden characters (em-dashes in MRCR replies); kept exact via JS escapes and stated in src/README.md.
