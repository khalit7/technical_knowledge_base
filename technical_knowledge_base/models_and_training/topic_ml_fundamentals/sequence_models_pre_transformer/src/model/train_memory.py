# Remember-the-first-symbol task: a plain tanh RNN, a GRU and an LSTM of the same width,
# trained the same way, then measured (accuracy against sequence length; gradient reaching
# step k at initialisation and after training) and exported for the page.
# Run: uv run --with torch python train_memory.py   (threads capped at 2)
#
# Sequence: key (a, b, c or d), then T-2 distractors drawn from w x y z, then "?".
# The answer at "?" is the key. Inputs are one-hot (9 symbols), so the input weights read directly.
import json, math, os, sys, time
import torch, torch.nn as nn
torch.set_num_threads(2)
HERE = os.path.dirname(os.path.abspath(__file__))
SYM = list("abcdwxyz?")
NK, ND, Q, V = 4, 4, 8, 9
H = 8
STEPS = 3000
BATCH = 64
LR = 1e-2
CLIP = 1.0


def batch(T, B, g):
    key = torch.randint(0, NK, (B,), generator=g)
    dis = torch.randint(NK, NK + ND, (B, T - 2), generator=g)
    q = torch.full((B, 1), Q)
    x = torch.cat([key[:, None], dis, q], 1)
    return nn.functional.one_hot(x, V).float(), key


class Net(nn.Module):
    def __init__(s, kind):
        super().__init__()
        s.kind = kind
        cls = {'rnn': nn.RNN, 'gru': nn.GRU, 'lstm': nn.LSTM}[kind]
        s.rnn = cls(V, H, batch_first=True)
        s.out = nn.Linear(H, NK)
        if kind == 'lstm':  # common practice (Jozefowicz et al. 2015): forget bias 1
            with torch.no_grad():
                s.rnn.bias_ih_l0[H:2 * H].fill_(1.0)
                s.rnn.bias_hh_l0[H:2 * H].fill_(0.0)

    def forward(s, x):
        y, _ = s.rnn(x)
        return y


def run(kind, tmax, seed, lr):
    torch.manual_seed(seed)
    g = torch.Generator().manual_seed(1000 + seed)
    net = Net(kind)
    opt = torch.optim.Adam(net.parameters(), lr=lr)
    init_state = {k: v.clone() for k, v in net.state_dict().items()}
    hist = []
    for step in range(STEPS):
        T = int(torch.randint(5, tmax + 1, (1,), generator=g))
        x, key = batch(T, BATCH, g)
        y = net(x)
        loss = nn.functional.cross_entropy(net.out(y[:, -1]), key)
        opt.zero_grad(); loss.backward()
        nn.utils.clip_grad_norm_(net.parameters(), CLIP)
        opt.step()
        if step % 100 == 0 or step == STEPS - 1:
            hist.append([step, round(loss.item(), 4)])
    return net, init_state, hist


@torch.no_grad()
def accuracy(net, T, n=2000, seed=7):
    g = torch.Generator().manual_seed(seed + T)
    x, key = batch(T, n, g)
    y = net(x)
    return (net.out(y[:, -1]).argmax(1) == key).float().mean().item()


def grad_through_time(net, T=100, n=256):
    # norm of d loss / d h_k for every step k, averaged over a batch (loss at the last step)
    g = torch.Generator().manual_seed(99)
    x, key = batch(T, n, g)
    hs = []
    kind = net.kind
    cell = {'rnn': nn.RNNCell, 'gru': nn.GRUCell, 'lstm': nn.LSTMCell}[kind](V, H)
    with torch.no_grad():
        cell.weight_ih.copy_(net.rnn.weight_ih_l0); cell.weight_hh.copy_(net.rnn.weight_hh_l0)
        cell.bias_ih.copy_(net.rnn.bias_ih_l0); cell.bias_hh.copy_(net.rnn.bias_hh_l0)
    h = torch.zeros(n, H); c = torch.zeros(n, H)
    for t in range(T):
        if kind == 'lstm':
            h, c = cell(x[:, t], (h, c))
        else:
            h = cell(x[:, t], h)
        h.retain_grad(); hs.append(h)
    loss = nn.functional.cross_entropy(net.out(h), key)
    loss.backward()
    norms = [hs[t].grad.norm(dim=1).mean().item() for t in range(T)]
    last = norms[-1]
    return [round(math.log10(max(v / last, 1e-30)), 3) for v in norms]  # log10 relative to the last step


def main():
    os.makedirs(os.path.join(HERE, 'runs'), exist_ok=True)
    LENS = [5, 10, 20, 30, 50, 75, 100, 150, 200]
    res = {'task': 'remember the first symbol', 'H': H, 'steps': STEPS, 'batch': BATCH, 'lr': LR, 'clip': CLIP,
           'symbols': SYM, 'eval_lengths': LENS, 'runs': []}
    t0 = time.time()
    export = {}
    LRS = [3e-3, 1e-2, 3e-2]
    res['lrs'] = LRS
    for tmax in [10, 20, 50, 100]:
        for kind in ['rnn', 'gru', 'lstm']:
            for lr in LRS:
                for seed in [0, 1, 2]:
                    net, init_state, hist = run(kind, tmax, seed, lr)
                    acc = [round(accuracy(net, T), 4) for T in LENS]
                    r = {'kind': kind, 'tmax': tmax, 'lr': lr, 'seed': seed, 'acc': acc, 'loss': hist}
                    if seed == 0:
                        r['grad_trained'] = grad_through_time(net)
                        fresh = Net(kind); fresh.load_state_dict(init_state)
                        r['grad_init'] = grad_through_time(fresh)
                        export['%s_%d_%g' % (kind, tmax, lr)] = {k: [round(float(v), 6) for v in t.flatten()] for k, t in net.state_dict().items()}
                    res['runs'].append(r)
                    print(kind, tmax, lr, seed, acc, '%.0fs' % (time.time() - t0), flush=True)
    json.dump(res, open(os.path.join(HERE, 'runs', 'memory_results.json'), 'w'))
    json.dump(export, open(os.path.join(HERE, 'runs', 'memory_weights.json'), 'w'))


if __name__ == '__main__':
    main()
