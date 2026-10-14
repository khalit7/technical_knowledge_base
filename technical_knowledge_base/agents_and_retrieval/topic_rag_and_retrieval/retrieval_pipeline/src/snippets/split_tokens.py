# Count chunk sizes in the embedder's own tokens, not characters (langchain-text-splitters 1.1.3, transformers 5.19.0)
import json, os
from transformers import AutoTokenizer
from langchain_text_splitters import RecursiveCharacterTextSplitter

RS = os.environ["RAG_SCRATCH"]
paper = next(json.loads(l) for l in open(RS + "/data/longdoc/docs.jsonl") if '"2002.01320"' in l)  # CoVoST (QASPER)
tok = AutoTokenizer.from_pretrained(RS + "/models/all-MiniLM-L6-v2")              # MiniLM reads at most 256 tokens
n = lambda s: len(tok(s)["input_ids"])                                            # counts [CLS] and [SEP] too

for name, sp in [("library default, 4,000 characters", RecursiveCharacterTextSplitter()),
                 ("tutorial setting, 1,000 characters", RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)),
                 ("256 MiniLM tokens", RecursiveCharacterTextSplitter.from_huggingface_tokenizer(tok, chunk_size=254, chunk_overlap=32))]:
    sizes = [n(c) for c in sp.split_text(paper["text"])]
    seen = sum(min(s, 256) for s in sizes) / sum(sizes)
    print(f"{name:36s} {len(sizes):3d} chunks, largest {max(sizes):4d} tokens, MiniLM reads {seen:.0%} of the text")
