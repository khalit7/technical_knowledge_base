"""Toy distillation: one teacher, one small student, six ways to train it (plus one temperature variant).

  uv run --no-project --with torch --with numpy python train.py teacher
  uv run --no-project --with torch --with numpy python train.py student <method> <seed> [steps]
  uv run --no-project --with torch --with numpy python train.py all [seed ...] # every method, seeds 1 2 3 (one process per seed in parallel)
  uv run --no-project --with torch --with numpy python train.py summary      # ../inputs/toy.json for the page

Task: world.py (routes in a fixed 32-node graph, many correct answers per prompt).
Teacher: a 4-layer transformer (d = 128) trained on routes sampled uniformly among the correct ones.
Student: the same architecture, 2 layers, d = 32. Every method starts from the same initial student weights
(per seed), sees the same number of prompts per step (128) and runs the same number of steps.

Methods (per-token losses averaged over answer positions; teacher frozen):
  sft       sequence-level distillation: the teacher writes a route (temperature 1), the student is trained
            with cross-entropy on that route's tokens (hard labels). Off-policy.
  fkl       token-level ("logit") distillation, Hinton style: on the teacher's route, the student matches the
            teacher's whole next-token distribution, forward KL(teacher || student). Off-policy.
  fkl_t2    as fkl with both distributions softened at temperature 2 and the loss multiplied by 2^2.
  rkl_off   reverse KL(student || teacher), exact over the vocabulary, on the teacher's route. Off-policy.
  fkl_on    the student writes the route (temperature 1); forward KL on every position of the student's route.
  rkl_on    on-policy distillation (GKD with reverse KL; Thinking Machines' recipe with the exact per-token
            reverse KL instead of its one-sample estimate): the student writes, the teacher grades every token.
  sft_on    the Qwen3 / Thinking Machines schedule: sft for the first half of the steps, rkl_on for the second.
"""
import json, math, os, random, sys, time
import torch
import torch.nn as nn
import torch.nn.functional as F
import world as W

torch.set_num_threads(2)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'runs'); os.makedirs(OUT, exist_ok=True)
TCFG = dict(d=128, L=4, h=4, ff=512)
SCFG = dict(d=32, L=2, h=2, ff=64)
BATCH, STEPS, LR = 128, 2400, 2e-3
EVAL_EVERY, EVAL_K = 150, 8
METHODS = ['sft', 'fkl', 'fkl_t2', 'rkl_off', 'fkl_on', 'rkl_on', 'sft_on']


class Block(nn.Module):
    def __init__(s, d, h, ff):
        super().__init__()
        s.n1, s.n2 = nn.LayerNorm(d), nn.LayerNorm(d)
        s.att = nn.MultiheadAttention(d, h, batch_first=True)
        s.mlp = nn.Sequential(nn.Linear(d, ff), nn.GELU(), nn.Linear(ff, d))

    def forward(s, x, mask):
        y = s.n1(x)
        x = x + s.att(y, y, y, attn_mask=mask, need_weights=False)[0]
        return x + s.mlp(s.n2(x))


class LM(nn.Module):
    def __init__(s, d, L, h, ff):
        super().__init__()
        s.emb = nn.Embedding(W.V, d); s.pos = nn.Embedding(W.SEQ, d)
        s.blocks = nn.ModuleList([Block(d, h, ff) for _ in range(L)])
        s.nf = nn.LayerNorm(d); s.head = nn.Linear(d, W.V)

    def forward(s, x):
        T = x.shape[1]
        mask = torch.triu(torch.full((T, T), float('-inf')), 1)
        hdn = s.emb(x) + s.pos(torch.arange(T))
        for b in s.blocks:
            hdn = b(hdn, mask)
        return s.head(s.nf(hdn))


def nparams(m):
    return sum(p.numel() for p in m.parameters())


def encode(pairs, routes):
    """Token matrix [B, SEQ] and the answer mask over positions whose NEXT token is an answer token."""
    B = len(pairs)
    x = torch.full((B, W.SEQ), W.PAD, dtype=torch.long)
    m = torch.zeros(B, W.SEQ - 1)
    for i, ((s, t), r) in enumerate(zip(pairs, routes)):
        seq = [s, t, W.SEP] + list(r) + [W.EOS]
        seq = seq[:W.SEQ]
        x[i, :len(seq)] = torch.tensor(seq)
        m[i, 2:len(seq) - 1] = 1
    return x, m


@torch.no_grad()
def sample(model, pairs, temp=1.0, greedy=False, gen=None):
    """Autoregressive answers (lists of tokens, EOS stripped; a route stops at EOS or at MAXANS tokens)."""
    B = len(pairs)
    x = torch.full((B, W.SEQ), W.PAD, dtype=torch.long)
    for i, (s, t) in enumerate(pairs):
        x[i, 0], x[i, 1], x[i, 2] = s, t, W.SEP
    done = torch.zeros(B, dtype=torch.bool)
    outs = [[] for _ in range(B)]
    for k in range(W.MAXANS):
        pos = 2 + k
        lg = model(x[:, :pos + 1])[:, pos, :W.N + 2]  # nodes, SEP (never right), EOS
        if greedy:
            nxt = lg.argmax(-1)
        else:
            nxt = torch.multinomial(F.softmax(lg / temp, -1), 1, generator=gen).squeeze(1)
        for i in range(B):
            if not done[i]:
                v = int(nxt[i])
                if v == W.EOS or v == W.SEP:
                    done[i] = True
                else:
                    outs[i].append(v)
        x[:, pos + 1] = torch.where(done, torch.full_like(nxt, W.PAD), nxt)
        if done.all():
            break
    return outs


def train_teacher(steps=6000, seed=0):
    torch.manual_seed(seed); rng = random.Random(seed)
    m = LM(**TCFG); opt = torch.optim.AdamW(m.parameters(), lr=1e-3, weight_decay=0.0)
    log = []
    for step in range(steps + 1):
        pairs = [rng.choice(W.PAIRS) for _ in range(256)]
        routes = [W.sample_route(s, t, rng) for s, t in pairs]
        x, msk = encode(pairs, routes)
        lr = 1e-3 * min(1, step / 200) * (0.5 * (1 + math.cos(math.pi * step / steps)))
        for g in opt.param_groups: g['lr'] = lr
        lg = m(x[:, :-1])
        loss = (F.cross_entropy(lg.reshape(-1, W.V), x[:, 1:].reshape(-1), reduction='none') * msk.reshape(-1)).sum() / msk.sum()
        opt.zero_grad(); loss.backward(); opt.step()
        if step % 500 == 0:
            ev = evaluate(m, k=4, seed=99)
            ev.update(step=step, loss=round(loss.item(), 4)); log.append(ev); print('teacher', ev, flush=True)
    torch.save(m.state_dict(), os.path.join(OUT, 'teacher.pt'))
    json.dump(dict(cfg=TCFG, params=nparams(m), log=log), open(os.path.join(OUT, 'teacher.json'), 'w'))


def load_teacher():
    m = LM(**TCFG); m.load_state_dict(torch.load(os.path.join(OUT, 'teacher.pt'))); m.eval()
    for p in m.parameters(): p.requires_grad_(False)
    return m


@torch.no_grad()
def kl_to_exact(model, pairs, routes):
    """Mean per-token KL(exact data policy || model) along the given routes, on positions where the exact
    policy is defined (the route is still completable)."""
    x, msk = encode(pairs, routes)
    lp = F.log_softmax(model(x[:, :-1]), -1)
    tot, n = 0.0, 0
    for i, ((s, t), r) in enumerate(zip(pairs, routes)):
        for k in range(len(r) + 1):
            p = W.exact_policy(s, t, list(r[:k]))
            if p is None:
                break
            tot += sum(q * (math.log(q) - lp[i, 2 + k, tok].item()) for tok, q in p.items())
            n += 1
    return tot / max(1, n)


@torch.no_grad()
def evaluate(model, k=EVAL_K, seed=0, teacher=None):
    gen = torch.Generator().manual_seed(seed)
    pairs = W.PAIRS
    ok, distinct, reasons = 0, 0, {}
    for rep in range(k):
        outs = sample(model, pairs, gen=gen)
        for (s, t), r in zip(pairs, outs):
            c, why = W.check(s, t, r)
            ok += c; reasons[why] = reasons.get(why, 0) + 1
            if rep == 0:
                pass
    # distinct correct routes among k samples per prompt
    gen = torch.Generator().manual_seed(seed + 1)
    seen = [set() for _ in pairs]
    for rep in range(k):
        outs = sample(model, pairs, gen=gen)
        for i, ((s, t), r) in enumerate(zip(pairs, outs)):
            if W.check(s, t, r)[0]:
                seen[i].add(tuple(r))
    g = sample(model, pairs, greedy=True)
    gok = sum(W.check(s, t, r)[0] for (s, t), r in zip(pairs, g))
    res = dict(succ=round(ok / (k * len(pairs)), 4), greedy=round(gok / len(pairs), 4),
               distinct=round(sum(len(z) for z in seen) / len(pairs), 3),
               reasons={a: round(b / (k * len(pairs)), 4) for a, b in sorted(reasons.items())})
    if teacher is not None:
        # reverse KL to the teacher on the student's own routes; forward KL on the teacher's routes
        gen = torch.Generator().manual_seed(seed + 2)
        so = sample(model, pairs, gen=gen); to = sample(teacher, pairs, gen=gen)
        res['rkl_own'] = round(seq_kl(model, teacher, pairs, so, 'r'), 4)
        res['fkl_teach'] = round(seq_kl(model, teacher, pairs, to, 'f'), 4)
    return res


@torch.no_grad()
def seq_kl(student, teacher, pairs, routes, kind):
    x, msk = encode(pairs, routes)
    ls = F.log_softmax(student(x[:, :-1]), -1); lt = F.log_softmax(teacher(x[:, :-1]), -1)
    if kind == 'r':
        kl = (ls.exp() * (ls - lt)).sum(-1)
    else:
        kl = (lt.exp() * (lt - ls)).sum(-1)
    return float((kl * msk).sum() / msk.sum())


def train_student(method, seed, steps=STEPS):
    teacher = load_teacher()
    torch.manual_seed(1000 + seed)
    st = LM(**SCFG)  # identical init for every method with this seed
    opt = torch.optim.Adam(st.parameters(), lr=LR)
    rng = random.Random(seed); gen = torch.Generator().manual_seed(seed)
    log, comp = [], dict(student_tokens=0, teacher_tokens=0, sampled_tokens=0)
    ckpts = {}
    t0 = time.time()
    for step in range(steps + 1):
        if step % EVAL_EVERY == 0:
            ev = evaluate(st, seed=7, teacher=teacher); ev.update(step=step, **comp, sec=round(time.time() - t0, 1))
            log.append(ev); print(method, seed, ev, flush=True)
        if step in (0, 150, 300, 600, 1200, steps):
            ckpts[step] = {k: v.clone() for k, v in st.state_dict().items()}
        if step == steps:
            break
        m = method if method != 'sft_on' else ('sft' if step < steps // 2 else 'rkl_on')
        pairs = [rng.choice(W.PAIRS) for _ in range(BATCH)]
        on = m in ('fkl_on', 'rkl_on')
        st.eval()
        routes = sample(st if on else teacher, pairs, gen=gen)
        st.train()
        x, msk = encode(pairs, routes)
        ntok = int(msk.sum())
        comp['sampled_tokens'] += ntok + BATCH * 0  # tokens generated (by the student if on-policy, else teacher)
        comp['student_tokens'] += ntok
        lg = st(x[:, :-1])
        if m == 'sft':
            loss = (F.cross_entropy(lg.reshape(-1, W.V), x[:, 1:].reshape(-1), reduction='none') * msk.reshape(-1)).sum() / msk.sum()
        else:
            with torch.no_grad():
                tl = teacher(x[:, :-1])
            comp['teacher_tokens'] += ntok
            T = 2.0 if m == 'fkl_t2' else 1.0
            ls = F.log_softmax(lg / T, -1); lt = F.log_softmax(tl / T, -1)
            if m in ('fkl', 'fkl_t2', 'fkl_on'):
                kl = (lt.exp() * (lt - ls)).sum(-1)
            else:
                kl = (ls.exp() * (ls - lt)).sum(-1)
            loss = (kl * msk).sum() / msk.sum() * T * T
        opt.zero_grad(); loss.backward(); opt.step()
    torch.save(ckpts, os.path.join(OUT, f'{method}_{seed}.pt'))
    json.dump(dict(method=method, seed=seed, cfg=SCFG, params=nparams(st), log=log),
              open(os.path.join(OUT, f'{method}_{seed}.json'), 'w'))


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'teacher':
        train_teacher()
    elif cmd == 'student':
        train_student(sys.argv[2], int(sys.argv[3]), int(sys.argv[4]) if len(sys.argv) > 4 else STEPS)
    elif cmd == 'all':
        seeds = [int(a) for a in sys.argv[2:]] or [1, 2, 3]
        for seed in seeds:
            for m in METHODS:
                if not os.path.exists(os.path.join(OUT, f'{m}_{seed}.json')):
                    train_student(m, seed)
