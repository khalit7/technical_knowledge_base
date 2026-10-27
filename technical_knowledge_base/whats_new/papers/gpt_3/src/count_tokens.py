"""Token counts of the Figure 2.1 prompt under GPT-3's tokenizer (GPT-2's byte-level BPE, tiktoken r50k_base).
usage: uv run --with tiktoken python count_tokens.py   (writes inputs/fig21_tokens.json)"""
import tiktoken, json
e = tiktoken.get_encoding('r50k_base')
S = ['Translate English to French:\n', 'sea otter => loutre de mer\n', 'peppermint => menthe poivrée\n', 'plush girafe => girafe peluche\n', 'cheese =>', ' fromage']
out = [{'s': s, 'n': len(e.encode(s)), 'pieces': [e.decode([x]) for x in e.encode(s)]} for s in S]
json.dump(out, open('inputs/fig21_tokens.json', 'w'), ensure_ascii=False, indent=0)
print([o['n'] for o in out])
