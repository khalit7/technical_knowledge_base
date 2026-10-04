"""Fetch the handful of public benchmark items shown on the "Grade it yourself" tab into inputs/items.json.
Only sets whose licence allows it and that carry no do-not-publish request (BIG-bench/BBH, GPQA and HLE ask that
items not be reproduced in plain text, so none are shown). MMLU-Redux items come from inputs/redux_all.json
(fetch_redux.py). Run: python3 fetch_items.py"""
import json, time, urllib.request, urllib.parse
API = 'https://datasets-server.huggingface.co/rows?dataset=%s&config=%s&split=%s&offset=%d&length=%d'


def rows(ds, cfg, split, off, n):
    u = API % (urllib.parse.quote(ds, safe=''), cfg, split, off, n)
    for k in range(5):
        try:
            return [r['row'] for r in json.load(urllib.request.urlopen(u, timeout=60))['rows']]
        except Exception:
            time.sleep(5 * (k + 1))
    raise RuntimeError(u)


out = {'read': time.strftime('%Y-%m-%d')}
h = rows('Rowan/hellaswag', 'default', 'validation', 0, 1)[0]
out['hellaswag'] = {'src': 'https://huggingface.co/datasets/Rowan/hellaswag', 'lic': 'MIT', 'split': 'validation', 'ind': h['ind'],
                    'activity': h['activity_label'], 'ctx': h['ctx'], 'endings': h['endings'], 'label': int(h['label'])}
w = rows('allenai/winogrande', 'winogrande_debiased', 'validation', 0, 2)
out['winogrande'] = {'src': 'https://huggingface.co/datasets/allenai/winogrande', 'lic': 'CC BY', 'split': 'validation (debiased config)',
                     'pair': [{'s': r['sentence'], 'o': [r['option1'], r['option2']], 'a': int(r['answer']) - 1} for r in w]}
a = rows('allenai/ai2_arc', 'ARC-Challenge', 'test', 0, 1)[0]
out['arc_c'] = {'src': 'https://huggingface.co/datasets/allenai/ai2_arc', 'lic': 'CC BY-SA 4.0', 'split': 'ARC-Challenge test', 'id': a['id'],
                'q': a['question'], 'o': a['choices']['text'], 'a': a['choices']['label'].index(a['answerKey'])}
p = rows('TIGER-Lab/MMLU-Pro', 'default', 'test', 3, 1)[0]
out['mmlu_pro'] = {'src': 'https://huggingface.co/datasets/TIGER-Lab/MMLU-Pro', 'lic': 'MIT', 'split': 'test', 'id': p['question_id'],
                   'cat': p['category'], 'from': p['src'], 'q': p['question'].strip(), 'o': p['options'], 'a': p['answer_index']}
json.dump(out, open('inputs/items.json', 'w'), indent=1, ensure_ascii=False)
print(json.dumps(out, ensure_ascii=False)[:600])
