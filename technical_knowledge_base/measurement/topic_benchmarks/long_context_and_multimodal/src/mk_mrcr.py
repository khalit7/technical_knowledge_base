"""Extract one real OpenAI MRCR row (MIT licence) into inputs/mrcr_row.json.
Source: huggingface.co/datasets/openai/mrcr, file 2needle/2needle_0.parquet (190 MB, kept outside the repo).
Usage: uv run --with pyarrow --with tiktoken python3 mk_mrcr.py /path/to/2needle_0.parquet
Row 170 is the shortest 2-needle row in that file (76,143 characters)."""
import sys, json, re
import pyarrow.parquet as pq, tiktoken
ROW = 170
t = pq.read_table(sys.argv[1]).slice(ROW, 1).to_pylist()[0]
m = json.loads(t['prompt'])
pre = t['random_string_to_prepend']
assert t['answer'].startswith(pre)
fmt = lambda s: re.match(r'write an? (.*?) about (.*)$', s)
msgs = []
for i, x in enumerate(m):
    c = x['content']
    d = {'i': i, 'r': x['role'][0], 'n': len(c)}
    if x['role'] == 'user' and i > 0:
        d['ask'] = c
    msgs.append(d)
final = m[-1]['content']
target_ask = m[-1]['content']
# needles: user turns identical to the requested ask
ask = 'write a short scene in a play about blueberries'
needles = [i for i, x in enumerate(m) if x['role'] == 'user' and x['content'] == ask]
answers = [i + 1 for i in needles]
body = t['answer'][len(pre):]
match = [a for a in answers if m[a]['content'] == body]
enc = tiktoken.get_encoding('o200k_base')
tokens = sum(len(enc.encode(x['content'])) for x in m) + len(enc.encode(t['answer']))  # the card's binning: prompt + answer
out = {
    'tokens_o200k': tokens,
    'source': 'openai/mrcr 2needle/2needle_0.parquet row %d' % ROW,
    'n_chars': t['n_chars'], 'n_needles': t['n_needles'], 'desired_msg_index': t['desired_msg_index'],
    'total_messages': t['total_messages'], 'date_added': t['date_added'], 'prefix': pre,
    'final': final, 'needle_user_turns': needles, 'answer_is_message': match,
    'msgs': msgs,
    'texts': {'target': m[answers[0]]['content'], 'other': m[answers[1]]['content'], 'glass': m[14]['content']},
    'first_user_block_head': m[0]['content'][:400],
}
json.dump(out, open('inputs/mrcr_row.json', 'w'), ensure_ascii=False, indent=0)
print(needles, match, len(json.dumps(out)))
