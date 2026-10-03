# Compare the page's recurrent cells (22_js_cells.js, dumped by check_page.mjs into model/runs/page_dump.json)
# with PyTorch's nn.LSTM / nn.GRU / nn.RNN loaded with the same exported weights.
# Run from src/: uv run --no-project --with torch python check_cells.py
import json, os
import torch, torch.nn as nn
torch.set_num_threads(2)
HERE = os.path.dirname(os.path.abspath(__file__))
data = open(os.path.join(HERE, 'parts', '21_js_data.js')).read()
SQ = json.loads(data[data.index('mem:') + 4:data.index(',\ns2s:')])
dump = json.load(open(os.path.join(HERE, 'model', 'runs', 'page_dump.json')))['cells']
H, V = SQ['H'], len(SQ['sym'])


def build(kind, w):
    cls = {'rnn': nn.RNN, 'gru': nn.GRU, 'lstm': nn.LSTM}[kind]
    m = cls(V, H, batch_first=True); out = nn.Linear(H, 4)
    sd = {k[4:]: torch.tensor(v).reshape(getattr(m, k[4:]).shape) for k, v in w.items() if k.startswith('rnn.')}
    m.load_state_dict(sd)
    out.load_state_dict({'weight': torch.tensor(w['out.weight']).reshape(4, H), 'bias': torch.tensor(w['out.bias'])})
    return m.double(), out.double()


worst = 0; same = 0
for d in dump:
    kind = 'rnn' if d['m'].startswith('rnn') else d['m']
    w = SQ['short_rnn']['w'] if d['m'] == 'rnn_short' else SQ['models'][d['m']]['w']
    m, out = build(kind, w)
    x = nn.functional.one_hot(torch.tensor(d['seq']), V).double()[None]
    with torch.no_grad():
        y, _ = m(x)
        p = torch.softmax(out(y[0, -1]), -1)
    diff = max(abs(a - b) for a, b in zip(p.tolist(), d['p'][-1]))
    hdiff = max(abs(a - b) for a, b in zip(y[0, -1].tolist(), d['h']))
    worst = max(worst, diff, hdiff); same += int(p.argmax().item() == max(range(4), key=lambda i: d['p'][-1][i]))
print('cases', len(dump), 'same answer', same, 'max abs difference', worst)
assert worst < 1e-6, worst  # weights pass through float32 when loaded
