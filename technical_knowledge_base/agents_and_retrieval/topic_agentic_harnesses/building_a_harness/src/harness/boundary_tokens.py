#!/usr/bin/env python3
"""Decode every token id generated in boundary.py's part B one by one (with the model's tokenizer), so the
page can show each token as the model produced it. Usage: boundary_tokens.py BOUNDARY.jsonl OUT.json"""
import json, sys
from transformers import AutoTokenizer
tok = AutoTokenizer.from_pretrained("mlx-community/Qwen3-4B-Instruct-2507-4bit", revision="50d427756c6b1b2fe0c0a10f67fbda1fc8e82c1b")
ids = sorted({i for l in open(sys.argv[1]) for i in (json.loads(l).get("ids") or [])})
json.dump({str(i): tok.decode([i], skip_special_tokens=False) for i in ids}, open(sys.argv[2], "w"), ensure_ascii=False)
print(len(ids), "distinct ids")
