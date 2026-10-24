# LOFT and OCRBench: facts used on the page (read 2026-10-24)

## LOFT (Lee et al., "Can Long-Context Language Models Subsume Retrieval, RAG, SQL, and More?", arXiv 2406.13121, CC BY 4.0)
- 6 task types, 35 datasets, 4 modalities (text, visual, audio, video): text retrieval, RAG, visual retrieval, audio retrieval, SQL-like reasoning, many-shot in-context learning.
- Context lengths 32k, 128k and 1M tokens.
- Corpus-in-Context (CiC) prompting: the whole corpus in the prompt, each item with a unique ID, instructions, few-shot examples grounded in the same corpus, the query last (so the corpus can be a cached prefix).
- Table 2, 128k, Gemini 1.5 Pro against specialised systems: text retrieval 0.77 vs Gecko 0.76; RAG 0.53 vs Gecko retrieve-and-read 0.52; SQL 0.38 vs DAIL-SQL 0.65; visual retrieval 0.83 vs CLIP 0.71; audio retrieval 1.00 vs PaLM 2 DE 0.94.

## OCRBench (Liu et al., "OCRBench: On the Hidden Mystery of OCR in Large Multimodal Models", arXiv 2305.07895 v7, CC BY-SA 4.0)
- Abstract: text recognition, scene-text VQA, document VQA, key information extraction, handwritten mathematical expression recognition; built from 29 datasets.
- Repository README (github.com/Yuliang-Liu/MultimodalOCR): "The benchmark includes 1000 question-answer pairs." OCRBench v2: 10,000 human-verified question-answer pairs across 31 scenarios, released 2024-12-31.
