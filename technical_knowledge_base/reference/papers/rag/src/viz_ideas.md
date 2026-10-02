# RAG: visualisation ideas

The question the paper keeps returning to: **what does a retrieved document change about what the generator says, and can you change the knowledge without changing the weights?** Every visual below makes part of that measurable on a real (toy) model or on the paper's own tables.

Scored on the Methodology's questions (`html_utils/interactive-html-ideas.md` section 2): a parameter the reader moves; reproduces a published figure (counts double); computable from public data (counts double); shows what a sentence cannot; corrects a misconception; measures the central question; absent elsewhere; step-by-step animation against the method it replaced; minus build cost.

## Built (ids P-rag.k, for the orchestrator to merge into the ideas log)

| # | Idea | What it shows, and what the reader does | Why it helps | Data and sources | Placement | Score |
|---|---|---|---|---|---|---|
| P-rag.1 | **Ask a trained toy RAG** (live ingredient) | A real RAG model trained offline as §2 describes (separate query and document encoders, MIPS over the whole index, a pretrained encoder-decoder reading document // question, both marginalisations, Thorough Decoding), run in the browser: pick a question kind, a held-out or training entity, the model (RAG-Token, RAG-Sequence), the index edition (2016, 2018) and k; see the retrieved documents with p(z\|x), the answer, the per-token document posterior map (Figure 2's quantity) or the RAG-Sequence hypothesis table | The paper's whole mechanism on a model whose every number is inspectable; held-out exact match 100% on single-document questions, JS identical to PyTorch on 488 of 488 | `src/world.py`, `src/train.py`, `src/check_forward.py`; inspired by Polo Club's Transformer Explainer | Own tab | 13 |
| P-rag.2 | **Edit the non-parametric memory** | Rewrite a country's president in the index; the document encoder re-embeds it and the same weights answer with the new fact | The paper's "human-writable" memory (§5) and the hot-swap claim, made something the reader does | toy model | Run tab | 11 |
| P-rag.3 | **Two marginalisations, animated** | One question through RAG-Token (token by token: each document's proposal, the mixture, the document posterior) and RAG-Sequence (one answer per document, the Thorough Decoding matrix of p(y\|x,z), the marginal), to scale, captions and counters (generator passes, rescoring passes) | Before/after of the paper's central modelling choice on the same input; shows plainly why RAG-Sequence cannot combine documents, and why the toy RAG-Token ties: its per-document generators are not calibrated about what their document does not say | toy model, §2.1, §2.5 | Reading, Two marginalisations | 12 |
| P-rag.4 | Predict, then reveal (three) | Which formulation names two titles from two documents (neither, in the toy, and why); how often RAG is right when no document has the answer (11.8%); hot-swap accuracy (70%), with the toy's own 2016/2018 grid and a live held-out country | Belief elicitation at the three points where intuition fails | §4.1, §4.5, toy | Reading | 10 |
| P-rag.5 | Figure 1 redrawn with the toy's real retrieval | The pipeline with the five documents the toy actually retrieves and their p(z\|x) | The diagram everyone draws, with real numbers in it | toy, Figure 1 | Reading, Idea | 7 |
| P-rag.6 | Table 1 noise test | Margin of the best RAG over a chosen baseline per column, with its standard error from the test-set size (Table 7) and a clear/within-noise verdict | Shows "state of the art on all four" is two clear wins (NQ z = 2.6, TQA-Wiki) and two ties (WQ 0.5, CT 0.6) | Tables 1, 7; recompute.py | Tables tab, and How much to believe | 11 |
| P-rag.7 | Table 4 sum check | Rows as pair counts, column sums | Finds specificity summing to 93.0% and the text's "17% both factual" being the table's "Both poor" | Table 4, §4.3 | Tables tab | 8 |
| P-rag.8 | Table 6 deltas | Learned minus frozen and learned minus BM25, cell by cell, sub-point margins greyed | The ablation claim with its one tie and five sub-point margins visible | Table 6 | Tables tab | 8 |
| P-rag.9 | Every number checked | 17 claims recomputed with verdicts (626M trainable is 516M; 728-d is 768-d; hot-swap percentages as integer counts of 82) | Reproduces most numbers independently, names the slips | recompute.py | Tables tab | 8 |
| P-rag.10 | Then and now: one pipeline, eight systems | Four boxes (query encoder, index, combine, generator) morphing through RAG, FiD, RETRO, Atlas, REPLUG, In-Context RALM, Self-RAG, GraphRAG; trained parts blue, frozen parts dashed; each step quoted from its own abstract | What survived (the frozen index, retrieve-then-generate) and what did not (marginalisation, joint training) at a glance | `src/inputs/later_extracts.txt` | Own tab | 9 |
| P-rag.11 | Measured toy ablations | Held-out exact match and recall for RAG-Token, RAG-Sequence, closed book, frozen query encoder, BM25 retriever, no retriever pretraining, three seeds for the main two | The paper's Table 6 pattern at toy scale, with what does not reproduce said plainly | `model/*.json` | Run tab | 9 |

## Rejected

| # | Idea | Why not |
|---|---|---|
| P-rag.12 | Figure 3 (more documents at test time) redrawn | The figure prints no values; the method forbids reading curves. Described in words. |
| P-rag.13 | A learned dense (BERT-like) retriever in the toy | Tried: a dense layer over token embeddings memorised the training entities (held-out recall at 5 about 40% against 95 to 100% for per-token weights). The toy world has no paraphrases, which is where dense retrieval earns its keep, so the toy uses per-token weights plus syllable-pair features and says so. |
| P-rag.14 | Tuning the toy task until RAG-Token stitches two documents | Tried two answer formats ("B1 and B2", "first B1 second B2"); both tie because RAG-Token's loss gives a document no gradient for tokens it cannot explain. Reported as the finding instead of hidden by a task designed around it. |
| P-rag.15 | Shipping the closed-book generator to the browser | 50 KB for a model that scores 0.4% on held-out questions; its numbers are in the results table. |
| P-rag.16 | A real RAG checkpoint in the browser | 626M parameters and a 36 to 100 GB index; impossible in a sandboxed page. |
| P-rag.17 | Index memory calculator | The paper gives 100 GB and 36 GB but not the FAISS settings; only the raw vector size (64.5 GB at fp32) is derivable, which one sentence says. |

## What the methodology lacked for this page

A rule for **negative results of a live ingredient that bear on the paper's mechanism**, not just on its scale: the toy's RAG-Token failure is a property of the objective (no gradient to an unresponsible document), so it is reported in the Reading tab as an explanation, with the paper's Figure 2 as the counter-evidence, rather than only as a "does not reproduce" box. And a rule that a toy should be designed so that its held-out set tests the paper's claim (here: entities whose facts were never a training answer, so the model must read).
