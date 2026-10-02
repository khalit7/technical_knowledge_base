"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (the Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised). Numbers filled in by script are checked
through the data they come from (recompute.json is embedded in the page).
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R, S, T, N = 'The paper tab', 'Ask a trained toy RAG tab', "The paper's tables tab", 'Then and now tab'
C = [
 # header
 ('Reading time line "9 min read, +~3h 10m resources"', 'dropped: replaced by the build-computed reading time and resources total (more resources now)', ['min to read', 'of resources']),
 ('Authors: Lewis, Perez, Piktus, Petroni, Karpukhin, Goyal, Kuttler, Lewis, Yih, Rocktaschel, Riedel, Kiela', R + ', headline card', ['Patrick Lewis', 'Ethan Perez', 'Aleksandra Piktus', 'Fabio Petroni', 'Vladimir Karpukhin', 'Naman Goyal', 'Heinrich Küttler', 'Mike Lewis', 'Wen-tau Yih', 'Tim Rocktäschel', 'Sebastian Riedel', 'Douwe Kiela']),
 ('Affiliations: Facebook AI Research; UCL; NYU', R + ', headline card', ['Facebook AI Research; University College London; New York University']),
 ('Date: May 2020 (arXiv v1; NeurIPS 2020)', R + ', headline card', ['May 2020 (arXiv v1, 22 May 2020)', 'NeurIPS 2020']),
 ('Link arXiv:2005.11401 (~45 min)', 'card and Further reading', ['https://arxiv.org/abs/2005.11401', '(45 min)']),
 ('Link code: HF Transformers examples/research_projects/rag (~20 min for README and entry path)', 'card and Further reading, corrected: the folder moved to huggingface/transformers-research-projects (old link 404)', ['https://github.com/huggingface/transformers-research-projects/tree/main/rag', 'About 20 minutes for the README and entry path', 'returns 404']),
 ('Link demo huggingface.co/rag (~5 min)', 'Further reading, corrected: the demo address now redirects to the facebook/rag-token-nq model card', ['https://huggingface.co/facebook/rag-token-nq', 'now redirects here', '(5 min)']),
 # resources
 ('Meta AI blog (~10 min): authors\' framing; hot-swap the index instead of retraining', 'Further reading', ['https://ai.meta.com/blog/retrieval-augmented-generation-streamlining-the-creation-of-intelligent-natural-language-processing-models/', 'hot-swapping the index instead of retraining', '(10 min)']),
 ('HF Transformers RAG docs (~20 min): RagSequenceForGeneration, RagTokenForGeneration, RagRetriever over wiki_dpr; how the pieces compose', 'Further reading; also What it takes to use this', ['https://huggingface.co/docs/transformers/model_doc/rag', 'RagRetriever over the wiki_dpr index', 'how the pieces compose', '(20 min)']),
 ('Gao et al. 2023 survey (~1h 30m): bridge to the modern stack; Naive / Advanced / Modular RAG taxonomy', 'Further reading; Why it matters', ['https://arxiv.org/abs/2312.10997', 'Naive, Advanced and Modular RAG', '(1h 30m)']),
 # problem
 ('LMs (GPT-2, T5) store knowledge in parameters and answer closed-book', R + ', Problem', ['stored facts in their parameters (GPT-2, T5)', '"closed-book"']),
 ('Three flaws: no provenance, cannot be updated without retraining, runs out on knowledge-intensive tasks where retrieve-and-extract pipelines beat seq2seq', R + ', Problem list', ['no provenance', 'It cannot be updated without retraining', 'It runs out on knowledge-intensive tasks', 'retrieve-and-extract pipelines still beat general seq2seq models']),
 ('Hybrids REALM, ORQA only for extractive QA: point at spans, do not generate', R + ', Problem', ['REALM', 'ORQA', 'have only explored open-domain extractive question answering', 'they do not generate']),
 ('Gap: general-purpose fine-tuning recipe giving any seq2seq a differentiable non-parametric memory, for generation and classification', R + ', Problem "The gap"', ['a general-purpose fine-tuning recipe that gives any pretrained seq2seq generator a differentiable, non-parametric memory', 'generation and classification tasks']),
 # method
 ('Retrieved document as latent variable; retriever and generator trained jointly end to end; no supervision on what to retrieve', R + ', Idea', ['latent variable', 'jointly, end to end, with no supervision on which document to retrieve']),
 ('Retriever DPR: BERT-base bi-encoder, p proportional to exp(d(z)^T q(x)), document encoder and query encoder', R + ', Retriever (equation)', ['bi-encoder of two BERT-base networks', 'BERT d', 'BERT q']),
 ('Top-k by MIPS over a FAISS HNSW index', R + ', Retriever', ['Maximum Inner Product Search (MIPS)', 'FAISS index with a Hierarchical Navigable Small World (HNSW) approximation']),
 ('Memory: December 2018 Wikipedia, disjoint 100-word chunks, 21M documents', R + ', Retriever', ['December 2018 Wikipedia dump split into disjoint 100-word chunks', '21M documents']),
 ('Generator BART-large (400M params); x and z concatenated', R + ', Generator (400M and 406M both given)', ['BART-large', '"400M parameters"', '406M', '"simply" concatenated']),
 ('BART parameters = parametric memory; index = non-parametric memory', R + ', Idea', ['parametric memory', 'non-parametric memory']),
 ('RAG-Sequence: one document for the whole output; formula sum over top-k of p_eta(z|x) prod_i p_theta(...)', R + ', Two marginalisations; animation', ['RAG-Sequence', 'one document is responsible for the whole output', 'The same document conditions every token']),
 ('RAG-Token: each token can draw on a different document; formula prod_i sum over z', R + ', Two marginalisations; animation', ['RAG-Token', 'each token can draw on a different document', 'stitch an answer from several passages']),
 ('Figure 2: document posterior hops between passages as a Jeopardy question mentions different books', R + ', Results (Jeopardy) and the predict reveal; toy posterior map in the toy tab', ['The Sun Also Rises', 'A Farewell to Arms', 'Hemingway']),
 ('For sequence classification (length one, FEVER) the two are equivalent', R + ', Two marginalisations', ['For classification (a target of length one, such as a FEVER label) the two are the same model']),
 ('Training: minimise negative marginal log-likelihood with Adam', R + ', Training', ['negative marginal log-likelihood', 'with Adam']),
 ('Only BERT_q and BART fine-tuned; document encoder and index frozen; REALM-style re-indexing of 21M passages expensive and unnecessary', R + ', Training', ['Only the query encoder BERT q and the BART generator are fine-tuned', 're-embedding and re-indexing 21M passages during training, as REALM does, is costly', 'do not find this step necessary for strong performance']),
 ('Retrieval learned purely from generation loss: gradients into query encoder through p_eta weighting', R + ', Training', ['Retrieval is learned purely from the generation loss', 'only through the p η ( z | x ) weights']),
 ('Decoding: RAG-Token plugs into standard beam decoder', R + ', Decoding', ['plugs into a standard beam decoder']),
 ('RAG-Sequence: one beam search per document, rescore the union (Thorough Decoding), or Fast Decoding treating unseen hypotheses as ~0', R + ', Decoding; animation', ['one beam search per document', 'Thorough Decoding', 'Fast Decoding', 'probability about zero']),
 # results
 ('Open-domain QA: new SOTA on all four benchmarks', R + ', Results and How much to believe (corrected: the abstract says three; two are clear, WQ and CT within noise, standard TQA below DPR)', ['claims a new state of the art on all four', 'the abstract says three', 'two clear wins']),
 ('EM: NQ 44.5 vs 41.5 DPR vs 36.6 T5-11B+SSM; TriviaQA 56.8 (68.0 Wiki split); WebQuestions 45.5; CuratedTrec 52.2', R + ', Results; Tables tab', ['44.5 exact match on Natural Questions', 'against 41.5 for DPR', '36.6 for closed-book T5-11B+SSM', 'TriviaQA 56.8', '68.0 on the Wikipedia test split', 'WebQuestions 45.5 (RAG-Token)', 'CuratedTrec 52.2 (RAG-Sequence)']),
 ('Generator beats extractive readers without REALM salient span masking, no reranker or cross-encoder', R + ', Results', ['salient span masking', 'neither a re-ranker nor extractive reader is necessary']),
 ('Correct when the answer is in no retrieved doc: 11.8% of such NQ cases, extraction 0', R + ', predict question', ['11.8%', 'an extractive model scores exactly 0%']),
 ('MS-MARCO NLG: +2.6 BLEU, +2.6 Rouge-L over BART, approaching gold-passage systems', R + ', Results (with the remaining gap 5.7 and 9.0); Tables', ['2.6 BLEU-1 and 2.6 Rouge-L', '"approaches" the gold-passage state of the art']),
 ('Jeopardy: RAG-Token beats RAG-Sequence and BART on Q-BLEU-1', R + ', Results (and RAG-Sequence below BART on BLEU-1)', ['RAG-Token 22.2 beats RAG-Sequence 21.4 and BART 19.7']),
 ('Human eval: RAG more factual 42.7% vs 7.1% BART; clearly more specific', R + ', Results (37.4 against 16.8); Tables tab Table 4 check', ['RAG was more factual in 42.7%', 'BART in 7.1%', 'more specific in 37.4% against 16.8%']),
 ('Both RAG variants more diverse n-grams than BART without diversity-promoting decoding', R + ', Results; Tables tab Table 5', ['no diversity-promoting decoding', '53.8%', '32.4%']),
 ('FEVER within 4.3% (3-way) and 2.7% (2-way) of pipeline SOTA that use gold-evidence retrieval supervision', R + ', Results (corrected: the 3-way system uses retrieval supervision, the 2-way comparator reads the gold evidence sentence)', ['within 4.3 points', 'within 2.7', 'trained with retrieval supervision', 'given the gold evidence sentence']),
 ('Top retrieved doc from a gold evidence article 71% of the time', R + ', Results (plus 90% in top 10)', ['71% of the time', '90%']),
 ('Ablations: learned retrieval beats frozen and BM25 everywhere except entity-heavy FEVER', R + ', Ablations (with the one tie); Tables tab Table 6 deltas; toy tab', ['frozen retriever', 'best on FEVER', 'entity-centric']),
 ('Hot-swap: 2016 index answers 2016 leaders at 70% vs 12% mismatched; knowledge updated by replacing the index, zero retraining', R + ', Hot-swapping predict and reveal; toy demo', ['70%', '12% (2018 index, 2016 leaders)', 'zero retraining', '82 world leaders who changed']),
 # why it matters
 ('Coined "RAG"; what it proposed differs from what the term now means', R + ', Why it matters', ['This paper coined "RAG"', 'differs substantially from what the term now means']),
 ('Original RAG is a trained model, not a prompting pattern; documents latent, marginalised, query encoder trained end to end; marginalisations exist because evidence is combined probabilistically', R + ', Why it matters', ['The original is a trained model, not a prompting pattern', 'combine evidence probabilistically rather than just read it']),
 ('Modern usage: off-the-shelf embedding, ANN in vector DB, concatenate top-k chunks into prompt of frozen instruction-tuned LLM; no marginalisation (closer to FiD), no gradient into retriever, no joint objective', R + ', Why it matters; Then and now', ['kept the name and the architecture diagram, and dropped the training', 'off-the-shelf embedding model', 'vector database', 'frozen instruction-tuned LLM', 'closer to', 'Fusion-in-Decoder', 'no gradient into the retriever, no joint objective']),
 ('Why the shift: ICL strong enough; frontier LLMs API-frozen; re-chunking pipelines simpler than co-training', R + ', Why it matters', ['in-context learning got strong enough', 'frozen behind APIs', 're-chunking a document base']),
 ('End-to-end idea survives in REALM, FiD, RETRO, Atlas; deployed world frozen', R + ', Why it matters; Then and now morph', ['REALM before it', 'RETRO', 'Atlas', 'the deployed world runs the frozen version']),
 ('What survived: dense bi-encoder (DPR ancestor of embedding models), ~100-word chunking, MIPS/ANN (FAISS then, vector DBs now), grounding and provenance, update the index not the weights', R + ', Why it matters', ['ancestor of every modern embedding model', 'roughly 100-word chunking', 'FAISS then, dedicated vector databases now', 'grounding to reduce hallucination and give provenance', 'update knowledge by updating the index, not the weights']),
 ('Modern stack (embeddings, vector DB, chunking, rerankers, agentic RAG, GraphRAG) = architecture with learning removed and engineering scaled up', R + ', Why it matters', ['rerankers', 'agentic RAG', 'GraphRAG', 'with the learning removed and the engineering scaled up']),
 ('Settled the QA argument: beat closed-book giants (T5-11B) and extractive pipelines across four benchmarks with one architecture', R + ', Why it matters (qualified: clearly on two)', ['settled an argument of its moment', 'closed-book giants', 'clearly on two']),
 # connections
 ('Connection BERT: DPR is a pair of BERT-base encoders; embeddings BERT\'s living habitat', R + ' Connections; Further reading', ['retrieval embeddings remain BERT\'s main living habitat', 'https://app.notion.com/p/3c65c17b0d0d81e5ad9bd09cbf18ad7c']),
 ('Connection GPT-3: same-month parametric-only counterpoint; ICL let modern RAG drop end-to-end training', R + ' Connections; Further reading', ['parametric-only counterpoint', 'https://app.notion.com/p/3c65c17b0d0d8193ac92c7648cfaca12']),
 ('Connection ReAct: retrieval as a tool an agent calls; road to agentic RAG', R + ' Connections; Further reading', ['the road to agentic RAG', 'https://app.notion.com/p/3c65c17b0d0d816b9a24c28de8f08ea8']),
 ('Topic rag-and-retrieval: founding paper of the topic', R + ' Connections; Further reading', ['founding paper of the topic', 'https://app.notion.com/p/3c65c17b0d0d81b89145c37dfe8a3b0b']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
